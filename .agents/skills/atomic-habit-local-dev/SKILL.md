---
name: atomic-habit-local-dev
description: Local development setup, database lifecycle, seed/demo data, and validation commands for Atomicly. Use whenever spinning up a fresh checkout, running local Postgres, seeding fake history, executing tests/typecheck/build, or running the local Kubernetes overlay. Source of truth for the `scripts/local-db.ps1` and `scripts/local-kube.ps1` helpers and the validation pipeline.
---

# Atomicly Local Dev

> **TL;DR:** `npm install` → `npm run db:setup` → `npm run dev`. Local Postgres binds to **55432**. Validate with `npm exec vitest run && npm run typecheck && npm run lint:app && npm run build`.

## 1. First-run setup

```bash
npm install
npm run db:setup   # starts Docker postgres, runs migrations, seeds dev account
npm run dev
```

Dev credentials: `dev@atomicly.local` / `Atomicly1!`

The local Postgres container binds to **port 55432** (not 5432) to avoid conflicts.

## 2. Local DB helper (`scripts/local-db.ps1`)

The helper is guarded for the local Docker database URL on `localhost:55432`.

```powershell
.\scripts\local-db.ps1 setup
.\scripts\local-db.ps1 migrate-deploy
.\scripts\local-db.ps1 clean
.\scripts\local-db.ps1 reset
.\scripts\local-db.ps1 migrate-dev -MigrationName add-example-field
.\scripts\local-db.ps1 random-data -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 randomize -CleanFirst -Force -Users 5 -HabitsPerUser 8 -Days 45
.\scripts\local-db.ps1 fake-history -CleanFirst -Force -Users 3 -HabitsPerUser 8 -Days 120
```

- `randomize` / `randomize-data` are aliases for `random-data`.
- `fake-history` / `history-data` create richer past habits, notes, check-ins, journals, weekly reviews, lesson progress, and formation verdicts.
- Both seeders also randomly link a disjoint subset of each user's habits into 1–2 stack chains (length 2–4) so the Today wallet stack and the Stack tab have real data to render.
- Pass `-CleanFirst -Force` when a fresh local test dataset is needed.
- Use the direct PowerShell helper (not `npm run`) when passing switch flags such as `-CleanFirst` or `-Force`.
- Fake user credentials: `history1@atomicly.local` / `Atomicly1!`.

## 3. Validation commands

```bash
npm run test:run               # unit/integration tests (Vitest)
npm exec vitest run            # equivalent — preferred for focused runs
npm run test:e2e               # end-to-end tests (Playwright)
npm run typecheck              # TypeScript
npm run lint:app               # scoped lint for app/components/lib/scripts
npm run build                  # production build
npm run prisma:migrate:status  # local migration status check
npm run backend:validate       # Prisma, TypeScript, lint, tests, and build
```

> `npm test -- --run` does not pass flags through reliably. Always use `npm exec vitest run`.

## 3a. End-to-end tests (Playwright)

Playwright is already configured (`playwright.config.ts`, specs in `e2e/`). The
config spins up its own web server (`npm run dev` locally) and reuses an
existing one, so you only need a **migrated, seeded database**.

```powershell
# 1. Ensure local Postgres is up and the dev account exists. Postgres binds to
#    55432; if a server is already listening there you can skip db:setup and
#    just (re)seed the dev user:
npm run db:seed                                   # ensures dev@atomicly.local
#    (or full bring-up if nothing is running:)
npm run db:setup

# 2. Run E2E. Two projects run by default: chromium + Mobile Chrome.
npm run test:e2e                                  # whole suite, both projects
npx playwright test e2e/main-flow.spec.ts         # one file, both projects
npx playwright test e2e/main-flow.spec.ts --project=chromium   # focused, fast
npx playwright test e2e/main-flow.spec.ts --grep "Switching themes"
npx playwright test --list                        # parse/list without running
```

- **Auth is automatic.** `e2e/auth.setup.ts` is a `setup` project that logs in as
  `dev@atomicly.local`, dismisses onboarding, and saves `e2e/.auth/user.json`;
  the browser projects depend on it via `storageState`. Tests start signed in.
- **Specs:** `e2e/main-flow.spec.ts` (core journeys) and `e2e/stack.spec.ts`
  (habit stacking). See the Tier-3 conventions in `atomic-habit-test-tier-policy`.
- A failed `scripts/__tests__/local-db.test.ts` under the full Vitest run is a
  known flake (it spawns `tsx`); it passes when run in isolation.

## 4. Local Kubernetes (Docker Desktop)

Helper at `scripts/local-kube.ps1`:

```bash
npm run kube:deploy          # build images and apply k8s/local manifests
npm run kube:update          # rebuild app image and roll the deployment
npm run kube:restart         # restart the deployment pods
npm run kube:stop            # scale the deployment to zero
npm run kube:cleanup         # delete the local namespace and images
```

Local k8s manifests can be validated without applying them by running `kubectl kustomize k8s/local`; deterministic manifest assertions live in `scripts/__tests__/local-k8s.test.ts`.

## 5. Source of truth

This skill summarises commands maintained in `package.json` and `scripts/README.md`. If they disagree, `package.json` wins — please update this skill.

## See Also

- `atomic-habit-architecture` — where things live in the tree
- `atomic-habit-pre-push-checklist` — what to run before pushing
- `atomic-habit-forward-deploy-engineer` — production deployment context
