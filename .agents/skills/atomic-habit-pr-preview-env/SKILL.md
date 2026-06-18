---
name: atomic-habit-pr-preview-env
description: PR preview environment topology, naming/tag contract, workflow lifecycle, teardown guarantees, cost ceiling, and the dedicated `pr-preview-atomicly` Azure AD principal model. Use when touching `.github/workflows/pr-preview*.yml`, `infra/preview.bicep`, `infra/preview-modules/`, `infra/policies/`, or when reasoning about ephemeral Azure stacks, the hourly reaper, the 24 h teardown guarantee, the active-preview hard cap, or why preview workflows must never touch the dev RG.
---

# PR Preview Environments

Every non-draft, non-fork PR opened against `master` gets its own fully
isolated Azure stack, automatically provisioned by GitHub Actions and torn
down on PR close (or by an hourly safety-net reaper). This skill is the
source of truth for that ecosystem.

## Why this skill exists

The master CI/CD pipeline (`.github/workflows/ci-cd.yml`) deploys to a
single shared `rg-atomicly-dev-*` resource group. Preview environments are
deliberately **additive** — they never edit `ci-cd.yml`, never authenticate
as the dev/master principal, and never touch the dev RG. If you find
yourself proposing to wire previews through the master pipeline or to grant
the dev principal extra permissions, stop and re-read this skill.

## Naming + tag contract

| Resource | Template | Notes |
| --- | --- | --- |
| Resource group | `rg-atomicly-pr-<pr>-<sha7>` | Regex `^rg-atomicly-pr-[0-9]+-[a-f0-9]{7}$`. Glob-matchable by the reaper. |
| Container Apps Environment | `cae-atomicly-pr-<pr>` | One per PR, reused across re-deploys. |
| Container App | `ca-atomicly-pr-<pr>` | Image tag carries the SHA. |
| Postgres Flexible Server | `psql-atomicly-pr-<pr>-<sha7>` | Globally DNS-unique. |
| Key Vault | `kv-atompr-<pr>-<sha7>` | 22 chars at PR=9999. Preflight rejects PR ≥ 10⁶. |
| Container image | `cratomiclypreview<suffix>.azurecr.io/atomicly:pr-<pr>-<sha7>` | Plus a moving `pr-<pr>-latest`. Shared preview ACR ONLY. |

Every preview resource MUST carry these five tags. The reaper, the Azure
Policy guardrails, and the cost dashboards all key off them:

```
pr=<pr_number>
commit=<sha7>
lifetime=ephemeral
created-by=github-actions
created-at=<ISO-8601 UTC, set ONCE per deploy, never refreshed>
```

`created-at` is computed once when the RG is created and passed unchanged
to every subsequent `az deployment group create` for that RG. The reaper's
24 h clock would reset if any code path called `utcNow()` in Bicep — so the
template never does.

## Workflow topology

Four workflows, all additive. None of them edits `ci-cd.yml`.

| Workflow | Trigger | OIDC subject | What it does |
| --- | --- | --- | --- |
| `pr-preview.yml` | `pull_request` [opened, reopened, synchronize, ready_for_review] | `pull_request` | Preflight (gate drafts/forks/cap) → validate → build-image → deploy → migrate → wait-healthy → playwright → report. Concurrency-keyed on PR number with cancel-in-progress. |
| `pr-preview-teardown.yml` | `pull_request` [closed] | `pull_request` | Deletes every `rg-atomicly-pr-*` RG tagged with the PR number; purges each derived KV. Idempotent. |
| `pr-preview-reaper.yml` | `schedule` `0 * * * *` + `workflow_dispatch` | `ref:refs/heads/master` | Hourly safety net. Deletes RGs older than 24 h or whose PR is closed. Quarantines + fails on tag drift. Purges stale KVs. ACR-tag housekeeping. |
| `pr-preview-open.yml` | `workflow_dispatch` | `pull_request` | Reviewer adds/removes their public IP from a preview's ingress allowlist for ~4 h. |
| `pr-preview-bootstrap.yml` | `workflow_dispatch` | `pull_request` | One-time: shared RG + ACR. Optional: deploy `infra/policies/main.bicep`. |

The `pr-preview` principal has TWO federated credential subjects (this is
load-bearing — the reaper would have no way to authenticate without the
second):

1. `repo:vngo4590/atomic-habit-tracker:pull_request`
2. `repo:vngo4590/atomic-habit-tracker:ref:refs/heads/master`

## Teardown contract

The 24 h teardown guarantee in the spec is enforced by **three** layers:

1. **`pr-preview-teardown.yml`** on `pull_request: closed` — covers ~95 %
   of cases instantly.
2. **`pr-preview-reaper.yml`** hourly — catches missed webhooks, force-
   merges, fork-PR closes, Actions outages. Worst-case window: ~25 h.
3. **Azure Policy `atomicly-deny-non-preview-rg`** — denies creation of
   any RG that does not match the preview prefix + tags, so a misbehaving
   workflow cannot create RGs the reaper would not find.

Each preview resource carries `lifetime=ephemeral`. The reaper requires
BOTH the name prefix AND the tag — neither alone is enough to trigger
deletion. Untagged RGs that match the name prefix are QUARANTINED and the
reaper run is failed (operator signal).

## Cost ceiling

| State | $/day |
| --- | --- |
| Idle preview | ~$0.72 |
| Worst-case (1 h Playwright burst, log cap hit) | ~$1.06 |
| Forgotten preview, reaper working | ~$1.10 total (one cleanup cycle) |
| Forgotten preview, reaper broken AND close webhook missed for 30 days | ~$32 |

The Phase 2 subscription budget at `$50/mo` with email at 50 % / 80 % /
100 % is the fourth defence layer.

Hard cap: **10 active previews** (half the default 20-server Postgres
quota). The `preflight` job rejects deploys when the cap is reached.

## `pr-preview` principal model

The preview ecosystem authenticates as a SEPARATE Azure AD app —
`pr-preview-atomicly` — provisioned in the Phase 0 bootstrap. Permissions:

- `Contributor` at subscription scope.
- Subject to the two Azure Policy assignments at subscription scope:
  - `atomicly-deny-non-preview-rg` — Deny RG create outside the prefix
    + tag contract. `notScopes` excludes the dev RG and the shared
    preview RG.
  - `atomicly-deny-cross-rg-role-assignments` — Deny role-assignment
    writes by THIS principal outside `rg-atomicly-pr-*` and
    `rg-atomicly-preview-shared`.

Net effect: the dev RG is unreachable from any preview workflow, even via
role-assignment escalation. The existing dev/master principal is unchanged.

`AZURE_PREVIEW_CLIENT_ID` is the GitHub Actions secret pinned to this
principal's `appId`. `AZURE_CLIENT_ID` (the dev/master principal) MUST NOT
be reused by preview workflows.

## Files of record

- `.github/workflows/pr-preview.yml` — deploy + test
- `.github/workflows/pr-preview-teardown.yml` — close-driven cleanup
- `.github/workflows/pr-preview-reaper.yml` — hourly safety net
- `.github/workflows/pr-preview-open.yml` — reviewer-IP toggle
- `.github/workflows/pr-preview-bootstrap.yml` — one-time setup
- `infra/preview.bicep` — RG-scoped template
- `infra/preview-modules/previewAcrPull.bicep` — cross-RG AcrPull grant
- `infra/policies/deny-non-preview-rg.json`
- `infra/policies/deny-cross-rg-role-assignments.json`
- `infra/policies/main.bicep` — subscription-scope policy IaC
- `infra/README.md` "Preview environments" section — operator runbook

## When in doubt

- If a change would let preview workflows touch `rg-atomicly-dev-*`,
  reject it.
- If a change would let preview RGs persist past 24 h without operator
  consent, reject it.
- If a change would couple master CI to preview infra, reject it.
- If a change would re-use `AZURE_CLIENT_ID` instead of
  `AZURE_PREVIEW_CLIENT_ID`, reject it.
- If `utcNow()` shows up anywhere in `infra/preview.bicep`, reject it.
