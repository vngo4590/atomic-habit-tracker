---
name: atomic-habit-logging
description: Source-of-truth logging skill for Atomicly. Use when adding logging to new code, reviewing log coverage, auditing log safety, or debugging observability gaps. Covers the structured logger API, redaction rules, event taxonomy, log level guidance, client vs server conventions, and Azure Monitor alert configuration.
---

# Atomicly Logging Conventions

> **TL;DR:** Use `lib/logger.ts` server-side, `lib/logger-client.ts` client-side. Never log sensitive data. Redact everything. Use allowlisted fields only.

## Purpose

This skill defines ALL logging rules for the Atomicly codebase. Every new module, action, route, component, or repository MUST follow these conventions.

## When this skill is in scope

- Adding any new server action, API route, repository, or component
- Reviewing or auditing existing logging coverage
- Debugging observability issues
- Adding new alert rules or monitoring configuration
- Any code review that touches logging

---

## 1. Architecture

```
+-----------------------------------------------+
| lib/logger-redact.ts (shared redaction)       |
+-----------------------+-----------------------+
| lib/logger.ts         | lib/logger-client.ts  |
| (server, JSON in prod)| (client, dev-only)    |
+-----------------------+-----------------------+
| Server Actions        | Components            |
| Repositories          | Store mutations       |
| API Routes            | Page interactions     |
| Auth internals        |                       |
| DB layer              |                       |
+-----------------------+-----------------------+
```

## 2. Server Logger (`lib/logger.ts`)

### Import pattern
```ts
import { logger, redactUserId, redactEmail } from "@/lib/logger";
const log = logger.child({ module: "actions.mymodule" });
```

### API
- `log.debug(message, context)` - diagnostic, off in production
- `log.info(message, context)` - business events
- `log.warn(message, context)` - expected failures
- `log.error(message, context)` - unexpected failures only

### Context fields
Every log call MUST include:
- `event` - dotted taxonomy name (e.g., `habit.created`, `repo.habit.list`)
- `userId` - ALWAYS pass through `redactUserId(userId)`

Optional:
- `requestId` - for API route correlation
- Entity IDs (habitId, entryId, etc.) - safe to log as-is
- `error` - for error-level logs (auto-serialized safely)

### Output format
- **Production**: JSON on stdout (Azure App Service captures)
- **Development**: Human-readable with timestamps

### Level filtering
Controlled by `LOG_LEVEL` env var. Default: `info` in prod, `debug` in dev.

## 3. Client Logger (`lib/logger-client.ts`)

### Import pattern
```ts
import { clientLogger } from "@/lib/logger-client";
```

### Behavior
- **Development**: Outputs to browser console with `[Atomicly]` prefix
- **Production**: ALL output suppressed (no browser console pollution)

### Usage
```ts
clientLogger.info("Habit toggled", { habitId, done: true });
clientLogger.warn("Action failed, rolling back", { habitId });
clientLogger.error("Unexpected error", { error: err.message });
```

## 4. Redaction Rules (`lib/logger-redact.ts`)

### Mandatory redaction
| Data type | Helper | Result |
| --- | --- | --- |
| Email | `redactEmail(email)` | `a***@domain.com` |
| User ID | `redactUserId(id)` | `abc12345...` |
| Password/hash/secret/token | NEVER logged | N/A |
| Journal body/notes/review answers | NEVER logged | N/A |
| Identity statements | NEVER logged | N/A |

### `redactObject(obj)` - safety net
Recursively redacts known-sensitive field names. Use as a fallback, NOT as the primary strategy. Always prefer allowlisted fields.

## 5. Event Taxonomy

### Auth events
- `auth.login_attempted` (info)
- `auth.login_failed` (warn)
- `auth.registered` (info)
- `auth.logout` (info)
- `auth.profile_updated` (info)
- `auth.password_changed` (info)
- `auth.credentials.attempt` / `.success` / `.no_user` / `.invalid_password` (debug)
- `auth.session.resolved` / `.not_found` (debug)

### Domain events
- `habit.created` / `.updated` / `.deleted` / `.checked_in` / `.stack_mutated` (info)
- `journal.created` / `.updated` (info)
- `review.saved` (info)
- `identity.saved` (info)
- `preferences.saved` (info)
- `lesson.completed` (info)
- `formation.verdict_saved` (info)

### Repository events (debug)
- `repo.habit.list` / `.get` / `.create` / `.update` / `.archive` / `.check_in` / `.stack_mutate`
- `repo.reflection.snapshot` / `.journal_create` / `.journal_update` / `.review_save` / ...
- `repo.user.find_by_email` / `.find_by_id` / `.create` / `.update_name` / `.update_password`

### API events
- `api.unauthenticated` (warn)
- `api.validation_failed` (warn)
- `api.request_failed` (error)
- `api.internal_error` (error)
- `api.habits.list` / `.get` / `.create` / `.update` / `.delete` (debug)
- `api.reflection.*` (debug)
- `api.session.get` (debug)

### Infrastructure events
- `db.client.init` (debug)
- `db.config.invalid_url` (error)
- `layout.snapshot.loading` / `.loaded` / `.failed` (debug/error)

### Client events (dev-only)
- `page.viewed` (info)
- `store.habit.create` / `.toggle` / `.update` / `.delete` (info)
- `store.journal.create` / `.update` (info)
- Component-specific actions (info)

## 6. Log Level Decision Matrix

| Situation | Level |
| --- | --- |
| DB operation starting | debug |
| Auth session check | debug |
| API route entry | debug |
| User created a habit | info |
| User logged in | info |
| Invalid login credentials | warn |
| Unauthenticated API call | warn |
| Validation rejection | warn |
| Unhandled exception | error |
| DB connection failure | error |
| Snapshot load failure | error |

## 7. What NEVER to log

- Passwords (plain or hashed)
- Full email addresses (use `redactEmail()`)
- Full user IDs in production (use `redactUserId()`)
- JWT tokens, API keys, secrets
- Journal entry body text
- Weekly review answers
- Notes content
- Identity statements
- Form data / request bodies
- Full error stack traces in production
- Health check probe hits

## 8. Anti-patterns

X `console.log(...)` - Use structured logger instead
X `log.info("User action", { payload: rawInput })` - Never log raw inputs
X `log.error("Error", { error })` without try/catch - Only log actual caught errors
X Logging expected Next.js redirect throws as errors
X Logging on every render cycle in components
X Logging in presentational/pure components

## 9. Adding Logging to New Code

### New server action checklist
- [ ] Import `logger` and `redactUserId`
- [ ] Create child logger with `module` scope
- [ ] Add info log with event name + redacted userId
- [ ] Wrap error cases in error-level logs
- [ ] Never log action input payload

### New repository function checklist
- [ ] Import `logger` and redaction helpers
- [ ] Create child logger with `repo.*` module scope
- [ ] Add debug log at function start
- [ ] Never log query results or raw DB records

### New API route checklist
- [ ] Import `logger`
- [ ] Create child logger with `api.*` module scope
- [ ] Add debug log inside `withApiUser` callback
- [ ] Error handling is automatic via `withApiUser`

### New component checklist
- [ ] Import `clientLogger`
- [ ] Log significant user actions in event handlers only
- [ ] Never log on render, only on interaction
- [ ] Never log user-generated content

## 10. Azure Monitor Alerts

Alert rules are defined in `infra/modules/monitoring.bicep`:
- **Error Rate Spike**: >10 exceptions in 5 minutes
- **Auth Failure Spike**: >20 `auth.login_failed` events in 5 minutes
- **Uncaught Exceptions**: Any unhandled exception trace

Application Insights connection string is automatically injected via `APPLICATIONINSIGHTS_CONNECTION_STRING` env var on the App Service.

## 11. Validation

After adding logging, verify:
```powershell
npm run typecheck    # No type errors from logger imports
npm run lint         # No lint issues
npm exec vitest run  # Tests still pass (logger output in tests is expected)
```

Check for raw console usage:
```powershell
# Should return NO results in app code (scripts/tests are exempt)
grep -r "console\.(log|warn|error|info)" app/ components/ lib/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "logger"
```
```