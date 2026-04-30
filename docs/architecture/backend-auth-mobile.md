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

- `DATABASE_URL`: pooled PostgreSQL connection string.
- `AUTH_SECRET`: Auth.js session secret. Generate with `openssl rand -base64 32`.
- `AUTH_URL`: canonical deployment URL for Auth.js callbacks.
- `NEXT_PUBLIC_APP_URL`: public app URL used by client-visible links.

## Local Development

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a local or hosted PostgreSQL database.
3. Run `npm run prisma:generate`.
4. Run `npm run prisma:migrate:dev`.
5. Run `npm run dev`.

## Vercel Notes

- Configure all environment variables in Vercel for Preview and Production.
- Run migrations before or during production release with `npm run prisma:migrate:deploy`.
- Keep database URLs pooled for serverless usage.
- Verify login, registration, protected routes, create habit, check-in, journal, settings, and mobile viewport after deployment.
