# Scripts

This folder contains local automation helpers for Atomicly development.

## Local Database Helper

Use `local-db.ps1` to manage the local Docker PostgreSQL database, apply Prisma migrations, seed development data, clean data, and generate fake datasets for UI testing.

The script is guarded for local development. Destructive operations only run when `DATABASE_URL` points at the local Docker database on `localhost:55432` or `127.0.0.1:55432`, and the script refuses to run when `NODE_ENV=production`.

## Local Kubernetes Helper

Use `local-kube.ps1` to build the local Docker images, apply the Docker Desktop Kubernetes overlay, rerun migrations, restart the app deployment, stop app pods, or delete the local Kubernetes resources.

## Prerequisites

- Docker Desktop or a compatible Docker engine.
- Node.js dependencies installed with `npm install`.
- A local `.env` file copied from `.env.example`.

```powershell
Copy-Item .env.example .env
npm install
```

## Common Commands

Start Docker Postgres, apply migrations, and seed the default dev user:

```powershell
.\scripts\local-db.ps1 setup
```

Start only the local database:

```powershell
.\scripts\local-db.ps1 up
```

Apply committed Prisma migrations:

```powershell
.\scripts\local-db.ps1 migrate-deploy
```

Create and apply a new local Prisma migration:

```powershell
.\scripts\local-db.ps1 migrate-dev -MigrationName add-example-field
```

Seed the default development user:

```powershell
.\scripts\local-db.ps1 seed
```

Delete all local app data:

```powershell
.\scripts\local-db.ps1 clean
```

Skip the cleanup confirmation prompt:

```powershell
.\scripts\local-db.ps1 clean -Force
```

Recreate the Docker database volume, apply migrations, and seed:

```powershell
.\scripts\local-db.ps1 reset
```

Generate configurable demo data:

```powershell
.\scripts\local-db.ps1 randomize -Users 5 -HabitsPerUser 8 -Days 45
```

Generate a fresh randomized dataset after cleaning local data:

```powershell
.\scripts\local-db.ps1 randomize -CleanFirst -Force -Users 5 -HabitsPerUser 8 -Days 45
```

Generate richer historical data for analytics, journal, habit history, lessons, and review screens:

```powershell
.\scripts\local-db.ps1 fake-history -CleanFirst -Force -Users 3 -HabitsPerUser 8 -Days 120
```

Tail local database logs:

```powershell
.\scripts\local-db.ps1 logs
```

Stop the Docker Compose stack:

```powershell
.\scripts\local-db.ps1 down
```

## npm Shortcuts

These package scripts call `local-db.ps1`:

```powershell
npm run db:local
npm run db:clean
npm run db:random -- -Users 5 -HabitsPerUser 8 -Days 45
npm run db:fake-history -- -Users 3 -HabitsPerUser 8 -Days 120
```

These package scripts call `local-kube.ps1`:

```powershell
npm run deploy:kube
npm run kube:deploy
npm run kube:update
npm run kube:restart
npm run kube:stop
npm run kube:cleanup
```

Use the direct PowerShell command, not `npm run`, when passing switch flags such as `-CleanFirst` or `-Force`.

## Generated Accounts

The default seed creates:

- Email: `dev@atomicly.local`
- Password: `Atomicly1!`

Random and fake-history data create demo accounts with the same password:

- `demo1@atomicly.local`, `demo2@atomicly.local`, ...
- `history1@atomicly.local`, `history2@atomicly.local`, ...

## Troubleshooting

If Docker is not running, commands that start or access Postgres fail with a Docker engine or named pipe error. Start Docker Desktop and rerun the command.

If the script says `DATABASE_URL is not set`, copy `.env.example` to `.env`.

If the script refuses a non-local database URL, check `.env` and make sure local development uses:

```text
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/atomicly?schema=public"
```
