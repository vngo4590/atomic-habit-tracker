# Backend, Auth, Mobile, and Vercel Architecture

## Provider Choices

- **Database:** PostgreSQL, accessed through Prisma.
- **Production hosting:** Vercel running Next.js with the Node.js runtime for auth and database paths.
- **Database provider:** Any Vercel-compatible managed PostgreSQL provider. Neon or Vercel Postgres are the preferred first choices because they support pooled serverless connections.
- **Authentication:** Auth.js / NextAuth v5 with a credentials provider first. OAuth providers can be added later without changing the app's domain model.
- **Password hashing:** `bcryptjs`.
- **Validation:** `zod`.
- **Mobile bridge:** versioned route handlers under `app/api/v1/*`, backed by the same validation contracts and repositories used by web server actions.

## Runtime Rules

- Keep Prisma and Auth.js routes on the Node.js runtime.
- Use Proxy only for optimistic route redirects. Every Server Action, Route Handler, and repository mutation must verify the server session or receive an already verified `userId`.
- Store timestamps in UTC and user-facing habit days as user-local `YYYY-MM-DD` date keys.
- Treat sample data as development fixtures only. Authenticated production flows must start from empty user-owned records.

## Environment Variables

Required for local, preview, and production:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma and Auth.js adapter-backed data access. | Use the local Docker URL for development. Use a pooled managed PostgreSQL URL for Vercel preview and production. |
| `AUTH_SECRET` | Auth.js session signing secret. | Generate with `openssl rand -base64 32` and keep different values per environment. |
| `AUTH_URL` | Canonical app URL used by Auth.js callbacks. | Local: `http://localhost:3000`. Preview/production: the deployed HTTPS origin. |
| `NEXT_PUBLIC_APP_URL` | Public app URL used by client-visible links. | Match the current deployment origin. |

Optional future OAuth providers can add provider-specific variables such as `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` without changing the domain model.

## Local Development

1. Copy `.env.example` to `.env`. The default local Docker database URL is:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/atomicly?schema=public"
```
2. Start the local Docker database:

```bash
npm run db:up
```

3. Apply migrations and seed the development account:

```bash
npm run prisma:migrate:deploy
npm run db:seed
```

Or run the combined setup:

```bash
npm run db:setup
```

4. Run the app:

```bash
npm run dev
```

Development login after seeding:

- Email: `dev@atomicly.local`
- Password: `Atomicly1!`

Useful database commands:

```bash
npm run db:logs
npm run db:down
npm run db:reset
```

## Vercel Notes

### Project Setup

1. Create or import the Vercel project from this repository.
2. Set the framework preset to Next.js and leave the build command as `npm run build`.
3. Configure the environment variables above for Preview and Production.
4. Provision PostgreSQL with a Vercel-compatible provider. Neon or Vercel Postgres are preferred first choices because both support serverless connection pooling.
5. Store the pooled PostgreSQL connection string in `DATABASE_URL`.
6. Set `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the exact HTTPS origin for the deployment. Auth.js callback URLs must use the same origin.

### Migration and Validation Commands

Run these commands before promoting a release:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run backend:validate
```

`prisma:migrate:status` reports whether committed migrations match the target database. `prisma:migrate:deploy` applies committed migrations without creating new migration files and is the production-safe migration command.

### Production Smoke Checklist

After deployment, verify:

- Register a new account and confirm the app redirects into the authenticated shell.
- Log out and log back in with the same account.
- Visit `/habits` while logged out and confirm it redirects to `/login`.
- Create a habit, refresh the page, and confirm it still loads from the database.
- Check in the habit for the current day and confirm the completion persists after refresh.
- Save a journal entry and confirm it appears in the journal list after refresh.
- Change settings for theme or accent and confirm the preference persists after refresh.
- Open `/api/v1/session` while logged out and confirm it returns an unauthenticated response.
- Check mobile viewport behavior at 390px, tablet behavior around 768px, and desktop behavior with no unintended horizontal overflow.

### Rollback and Migration Safety

- Prefer additive schema changes. Avoid destructive migrations until the replacement data path has already been deployed and verified.
- Back up or snapshot the managed PostgreSQL database before applying production migrations.
- If a release fails before migrations are applied, roll back by redeploying the previous Vercel deployment.
- If a release fails after additive migrations are applied, roll back application code first and leave the additive database schema in place until a follow-up cleanup migration is prepared.
- Never run development reset, seed, random-data, or clean commands against production. Those helpers are local-only and guarded for the Docker database on `localhost:55432`.
