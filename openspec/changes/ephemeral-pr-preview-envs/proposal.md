## Why

Today the only branch with a CI/CD pipeline is `master`. The only way to exercise the full deploy chain (Bicep → ACR push → origin → smoke tests) is to merge to master. That makes every infra or deploy change a production-risk gamble: pipeline regressions land directly on the only running environment, broken Bicep parameters take down dev, and Playwright failures are discovered after the fact rather than as a PR gate. We need a way to validate the full deploy on every pull request, in full isolation, without paying for a permanent staging environment.

## What Changes

- **NEW workflow `.github/workflows/pr-preview.yml`** triggered on `pull_request` (`opened`, `reopened`, `synchronize`) that builds the image, deploys an isolated stack to Azure (resource group `rg-atomicly-pr-<pr>-<sha7>`), runs Prisma migrations against a fresh Postgres Flexible Server, and runs the Playwright suite against the live preview URL. The PR check is **red unless Playwright is green against the live preview**.
- **NEW workflow `.github/workflows/pr-preview-teardown.yml`** triggered on `pull_request` (`closed`) that deletes the PR's resource group regardless of merge outcome.
- **NEW workflow `.github/workflows/pr-preview-reaper.yml`** triggered on an **hourly** `schedule` (and `workflow_dispatch`) that lists every resource group matching `rg-atomicly-pr-*` older than 24 h and deletes them. Safety net for any teardown that didn't run. Hourly (not daily) so the 24 h ceiling in the spec is met with ≤ 1 h jitter rather than ≤ 48 h.
- **NEW Bicep entrypoint `infra/preview.bicep`** that composes the existing `containerApp`, `postgres`, `keyvault`, `monitoring`, `acrPull` modules into a self-contained preview stack with cheapest-viable SKUs and no Front Door / WAF / App Service. Pulls images from a **separate shared preview ACR** (`rg-atomicly-preview-shared` / `cratomiclypreview<suffix>`) so previews never touch the dev RG.
- **NEW dedicated `pr-preview` Azure AD app + service principal**, separate from the existing dev/master principal. Federated credential subjects: `repo:vngo4590/atomic-habit-tracker:pull_request` (for deploy + teardown driven by PR events) and `repo:vngo4590/atomic-habit-tracker:ref:refs/heads/master` (for the scheduled reaper, which runs from `master`). Scoped `Contributor` at subscription, constrained by an **Azure Policy `deny`** that blocks resource group creation unless the name matches `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$` AND carries the required `lifetime=ephemeral` + `created-by=github-actions` tags. The existing dev principal is unchanged and is NOT used by preview workflows.
- **NEW shared preview ACR** in a new `rg-atomicly-preview-shared` resource group, provisioned once via a one-time bootstrap workflow (`pr-preview-bootstrap.yml`, `workflow_dispatch` only). Holds preview images and the `pr-preview` principal's `AcrPull` role assignment lives there, not in the dev RG.
- **NEW tag contract**: every resource a preview workflow creates carries `pr=<number>`, `commit=<sha>`, `lifetime=ephemeral`, `created-by=github-actions`. The teardown and reaper queries depend on these.
- **Preview URL is the platform-default `*.azurecontainerapps.io` hostname,** which contains an environment-generated hash suffix and is **NOT** derivable PR-side. The deploy job outputs the actual FQDN, the report job comments it on the PR, and the teardown workflow finds resources by tag, not by name. No custom domain, no Front Door, no Cloudflare — these are private testbeds, not public surface. Origin lockdown allowlists the **current runner's public IP** (resolved at job start with `curl ifconfig.me`) for the deploy/test run only; the IP is removed in a `trap EXIT` cleanup. A reviewer who needs to manually click around runs `pr-preview-open.yml` (a `workflow_dispatch` workflow) with their IP as an input — `pull_request` events cannot accept arbitrary inputs.
- **Master CI/CD (`.github/workflows/ci-cd.yml`) is NOT edited** as part of this change.

## Capabilities

### New Capabilities
- `deployment-architecture`: ephemeral, per-PR preview environments gated by Playwright and torn down within 24 h.

### Modified Capabilities
None — preview envs are additive on top of the existing master deploy.

## Impact

- **Code:** none in app code. All changes land under `.github/workflows/`, `infra/preview.bicep`, and `infra/scripts/preview-*.ps1` helpers.
- **Infra (Bicep):** new `infra/preview.bicep`, no changes to `infra/main.bicep` or any existing module.
- **CI/CD:** three new workflow files. `.github/workflows/ci-cd.yml` is untouched.
- **Docs:** `infra/README.md` gains a "Preview environments" section. New skill `atomic-habit-pr-preview-env` (see plan-mode design).
- **Cost:** typical idle ~$0.72/day per active preview (Postgres B1ms compute $0.62 + storage $0.09, everything else ~$0). Worst case with the Log Analytics 0.1 GB/day cap fully consumed: ~$1.05/day. Forgotten preview, with the hourly reaper working: bounded at ≤ 25 h × $1.05 = **~$1.10**. Reaper fully broken for 30 days: **~$32**. The subscription budget alert (Phase 2) catches that within ~2 weeks. Master dev RG and its costs are unaffected.
- **Security:** preview origins are not public — they are locked to the current GitHub Actions runner's public IP for the deploy/test window only. App-layer auth and CSP are still enforced by the application code. The dev RG, its principal, and its production-grade origin lockdown are untouched. The new `pr-preview` principal cannot create resources outside `rg-atomicly-pr-*` because of the Azure Policy deny.
