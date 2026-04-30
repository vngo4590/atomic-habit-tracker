# Atomicly API v1

Mobile-ready route handlers live under `/api/v1`. They use the same validation schemas in `lib/contracts/domain.ts` and the same user-scoped repositories as web Server Actions.

All responses use a stable envelope:

```json
{ "ok": true, "data": {} }
```

Errors use:

```json
{ "ok": false, "error": { "code": "validation_failed", "message": "Request validation failed.", "fields": {} } }
```

Authentication currently uses the web session cookie issued by Auth.js/NextAuth. Requests without a valid session return `401` with `error.code = "unauthenticated"`. User-owned resources that are missing or owned by another user return `404`.

## Session

- `GET /api/v1/session` returns `{ authenticated, user }`.

## Habits

- `GET /api/v1/habits` returns `{ habits }`.
- `POST /api/v1/habits` creates a habit from the shared habit create contract and returns `{ habit }`.
- `GET /api/v1/habits/:id` returns `{ habit }`.
- `PATCH /api/v1/habits/:id` updates a habit from the shared habit update contract and returns `{ habit }`.
- `DELETE /api/v1/habits/:id` archives a habit and returns `{ habit }`.
- `POST /api/v1/habits/:id/check-ins` upserts or clears a user-local date-keyed check-in and returns `{ habit }`.
- `PUT /api/v1/habits/:id/notes` replaces notes using `{ notes }` and returns `{ habit }`.
- `PUT /api/v1/habits/:id/contract` saves `{ terms, partners }` and returns `{ habit }`.

## Reflection

- `GET /api/v1/reflection/journal` returns `{ entries }`.
- `POST /api/v1/reflection/journal` creates a journal entry and returns `{ entry }`.
- `GET /api/v1/reflection/weekly-review?weekStartKey=YYYY-MM-DD` returns `{ review }`.
- `PUT /api/v1/reflection/weekly-review` saves a weekly review and returns `{ review }`.
- `GET /api/v1/reflection/identity` returns `{ identity }`.
- `PUT /api/v1/reflection/identity` saves identity data and returns `{ identity }`.
- `GET /api/v1/reflection/lessons` returns `{ completedLessonIds, mode }`.
- `POST /api/v1/reflection/lessons` marks `{ lessonId }` complete or saves `{ lessonMode }`.
- `GET /api/v1/reflection/preferences` returns `{ preferences }`.
- `PATCH /api/v1/reflection/preferences` saves preference fields and returns `{ preferences }`.
- `GET /api/v1/reflection/formation-verdicts` returns `{ verdicts }`.
- `POST /api/v1/reflection/formation-verdicts` saves a verdict and returns `{ verdict }`.
