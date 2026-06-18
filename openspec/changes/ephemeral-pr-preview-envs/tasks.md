## 1. Phase 0 — One-time bootstrap (documented manual + workflow_dispatch)

- [x] 1.0a Document in `infra/README.md` the exact commands to create the new `pr-preview-atomicly` Azure AD app + service principal, the two federated credential subjects (`pull_request` and `ref:refs/heads/master`), and the subscription-scoped `Contributor` role assignment. **(DEFERRED: actual `az ad app create` / `az role assignment create` execution requires Azure write — user runs the documented commands.)**
- [x] 1.0b Author two Azure Policy JSON definitions under `infra/policies/`: (a) `deny-non-preview-rg.json` — `Deny` resource group create where `name !~ '^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$'` OR `tags.lifetime != 'ephemeral'` OR `tags.created-by != 'github-actions'`; (b) `deny-cross-rg-role-assignments.json` — `Deny` `Microsoft.Authorization/roleAssignments/write` by the `pr-preview` principal outside `rg-atomicly-pr-*` and `rg-atomicly-preview-shared`. Document assignment commands. **(Policy JSONs authored; assignment commands documented. DEFERRED: `az policy definition create` + `az policy assignment create` execution requires Azure write — user runs them.)**
- [x] 1.0c Author `.github/workflows/pr-preview-bootstrap.yml` (`workflow_dispatch` only) that creates `rg-atomicly-preview-shared` and a Basic ACR `cratomiclypreview<suffix>` inside it. Idempotent. **(Workflow authored; not triggered. User runs `gh workflow run pr-preview-bootstrap.yml` after secrets + principal are in place.)**
- [x] 1.0d Store `AZURE_PREVIEW_CLIENT_ID` as a GitHub Actions secret. **(DEFERRED: secret value provisioning requires the AAD app from 1.0a — user stores the secret. Documented in `infra/README.md` Phase 0 Step 4.)**

## 2. Phase 1 — Bicep template for a preview stack

- [ ] 2.1 Branch: `feat/ephemeral-pr-preview-envs-phase-1`.
- [ ] 2.2 Author `infra/preview.bicep` as a **resource-group-scoped** template (`targetScope = 'resourceGroup'`). Required parameters: `prNumber`, `commitSha`, `location`, `postgresAdminPassword` (`@secure`), `imageTag`, `acrLoginServer`, `createdAt`. No `utcNow()` calls anywhere.
- [ ] 2.3 Compose modules: `containerApp` (consumption, `minReplicas: 0`, `maxReplicas: 2`, target port 3000, `ipSecurityRestrictions.defaultAction: 'Deny'`), `postgres` (B1ms, 20 GB, autoGrow off, no HA, 7-day backup, `psql-atomicly-pr-<pr>-<sha7>`), `keyvault` (Standard, soft-delete on, **purge protection off**), `monitoring` (0.1 GB/day cap, 7-day retention), `acrPull` (granting the Container App's managed identity `AcrPull` on the shared preview ACR — scope is `rg-atomicly-preview-shared`, NOT the dev RG).
- [ ] 2.4 Apply the five required tags to every resource via a shared `commonTags` variable. Use the `createdAt` parameter, not `utcNow()`.
- [ ] 2.5 Output the Container App FQDN and the Postgres FQDN.
- [ ] 2.6 `az bicep build --file infra/preview.bicep` exits 0 with no warnings.

## 3. Phase 1 — `pr-preview.yml` workflow

- [ ] 3.1 Trigger: `pull_request` types `[opened, reopened, synchronize, ready_for_review]`, `branches: [master]`. `concurrency` keyed on PR number, `cancel-in-progress: true`.
- [ ] 3.2 Top-level skip: `if: github.event.pull_request.draft == false && github.event.pull_request.head.repo.full_name == github.repository`. Else exit with a comment explaining why.
- [ ] 3.3 Preflight quota check: count active `lifetime=ephemeral` RGs; fail with a clear error if ≥ 10 (Decision 9 hard cap). Reject PR numbers ≥ 10⁶ (KV name length).
- [ ] 3.4 `validate` job — copy the existing master `validate` job verbatim (typecheck, lint, test:run, build).
- [ ] 3.5 `build-image` job — build runner + migrator images, tag `pr-<pr>-<sha7>` and `pr-<pr>-latest`, push to the **shared preview ACR**.
- [ ] 3.6 `deploy` job — pre-deploy cleanup: `az group list --tag pr=<pr>` → delete any RG whose `commit` tag is not the current SHA. Then `CREATED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)`, `az group create` with the five tags applied including `created-at=$CREATED_AT`, then `az deployment group create --template-file infra/preview.bicep --parameters createdAt=$CREATED_AT ...`. Generate `postgresAdminPassword` per-run with `openssl rand -base64 32`. Output the Container App FQDN.
- [ ] 3.7 `migrate` job — resolve runner IP via `ifconfig.me`, add runner IP to Postgres firewall (`trap EXIT` removes), `docker run --rm` the migrator image with `DATABASE_URL` pointing at the preview Postgres.
- [ ] 3.8 `wait-healthy` job — add this job's runner IP to the Container App `ipSecurityRestrictions` (trap-removed), then poll `/api/healthz` with exponential backoff for up to **5 minutes**.
- [ ] 3.9 `playwright` job — add this job's runner IP to the Container App ingress (trap-removed), install Playwright deps, set `BASE_URL` to the Container App FQDN, run `npm run test:e2e`. On failure, upload `playwright-report/` and `test-results/` as workflow artifacts. **This job is the gate.**
- [ ] 3.10 `report` job — **`if: always()`** — `actions/github-script` posts/updates a single bot comment with: preview URL (or "deploy failed" if earlier jobs failed), Playwright pass/fail count, teardown ETA, link to the run, link to artifacts. Idempotent against the comment-by-marker pattern.
- [ ] 3.11 OIDC: use `azure/login@v2` with `client-id: ${{ secrets.AZURE_PREVIEW_CLIENT_ID }}`. No inline credentials. No use of the existing `AZURE_CLIENT_ID`.

## 4. Phase 1 — `pr-preview-teardown.yml` workflow

- [ ] 4.1 Trigger: `pull_request` types `[closed]`, `branches: [master]`.
- [ ] 4.2 Single job: OIDC login as `pr-preview` principal, `az group list --tag pr=${{ github.event.pull_request.number }} --query "[?starts_with(name, 'rg-atomicly-pr-')].name" -o tsv`, then for each name `az group delete --name "$RG" --yes --no-wait`.
- [ ] 4.3 After RG deletion: `az keyvault purge --name kv-atompr-<pr>-<sha7> --no-wait` for each `<sha7>` that appeared on this PR (read from the deleted RG names before deletion). Tolerate `not found`.
- [ ] 4.4 Workflow runs even when the PR is closed without merge. Idempotent.

## 5. Phase 1 — `pr-preview-reaper.yml` hourly cron

- [ ] 5.1 Trigger: `schedule: cron: '0 * * * *'` (hourly) and `workflow_dispatch` with a `dryRun: boolean` input (default `true` on manual, `false` on schedule).
- [ ] 5.2 OIDC login uses subject `repo:...:ref:refs/heads/master` (not `pull_request`); the workflow lives on `master`.
- [ ] 5.3 Job: list every RG with `--tag lifetime=ephemeral`. For each, classify per Decision 5: **delete** / **quarantine+fail** / **skip**.
- [ ] 5.4 For each deleted RG: also `az keyvault purge` any matching soft-deleted KV older than 6 days.
- [ ] 5.5 Summary step: count inspected / deleted / skipped / quarantined. **Fail the run** if any quarantined items were found (signals tag drift).

## 6. Phase 1 — Reviewer-IP workflow (`pr-preview-open.yml`)

- [ ] 6.1 Trigger: `workflow_dispatch` with inputs `pr_number: string`, `reviewer_ip: string`, `revoke: boolean` (default false).
- [ ] 6.2 Locate the Container App via `az containerapp list --tag pr=<pr_number>`. Add or remove the reviewer IP from `ipSecurityRestrictions`. Idempotent.
- [ ] 6.3 If adding, schedule a follow-up cleanup at +4 h (either via a sidecar job that `sleep`s, or by writing a tag and letting the reaper clear it). Document the lifetime in the workflow log.

## 7. Phase 1 — Validation gate (run before push)

- [ ] 7.1 `npm exec vitest run`
- [ ] 7.2 `npm run typecheck`
- [ ] 7.3 `npm run lint:app`
- [ ] 7.4 `npm run build`
- [ ] 7.5 `az bicep build --file infra/preview.bicep`
- [ ] 7.6 Self-test PR: open a PR with the `preview` label, confirm the workflow provisions, deploys, runs Playwright (intentionally fail one test to verify the gate stays red), then close the PR and confirm teardown deletes the RG within 5 minutes.
- [ ] 7.7 Manually run `pr-preview-reaper.yml` with `dryRun: true` and confirm the summary lists zero quarantined items.
- [ ] 7.8 Verify that during a self-test deploy, the Azure Activity Log for `rg-atomicly-dev-*` shows no operations attributable to `AZURE_PREVIEW_CLIENT_ID` (proves the isolation requirement).

## 8. Phase 2 — Hardening (follow-up)

- [ ] 8.1 Add an Azure subscription budget at $50/mo with email notifications at 50 % / 80 % / 100 %.
- [ ] 8.2 Add a Playwright trace + screenshot artifact upload to the `playwright` job on success too (currently only on failure), for review during code review.
- [ ] 8.3 Add an ACR-tag housekeeping step to the reaper that lists `cratomiclypreview*.azurecr.io/atomicly:pr-*` tags older than 24 h with no live preview and deletes them.
- [ ] 8.4 Move the policy assignments into Bicep under `infra/policies/main.bicep` deployed by `pr-preview-bootstrap.yml`.

## 9. Documentation and skills

- [ ] 9.1 Add a "Preview environments" section to `infra/README.md` covering: bootstrap commands, how to read a preview URL, how to extend the IP allowlist via `pr-preview-open.yml`, how to inspect `az group list` for active previews, how to run the reaper manually, fork-PR limitations.
- [ ] 9.2 Create `.agents/skills/atomic-habit-pr-preview-env/SKILL.md` (see plan-mode design) describing the naming scheme, tag contract, workflow topology, teardown contract, cost ceiling, and the `pr-preview` principal model.
- [ ] 9.3 Update `.agents/skills/atomic-habit-forward-deploy-engineer/SKILL.md` to mention the preview-env workflows as additional deployment surfaces and to call out the dedicated `pr-preview` principal.
- [ ] 9.4 Update `AGENTS.md` deployment paragraph to reference the new preview workflows and the `pr-preview-atomicly` AAD app.

## 10. Archive

- [ ] 10.1 After Phase 1 has been used by at least 3 real PRs and the reaper has run cleanly for 7 days, run `openspec archive ephemeral-pr-preview-envs` to fold the new requirements into `openspec/specs/deployment-architecture/spec.md`.
