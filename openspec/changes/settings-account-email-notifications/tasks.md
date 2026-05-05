## 1. Email Service Layer

- [ ] 1.1 Install the Resend SDK: `npm install resend`
- [ ] 1.2 Add `RESEND_API_KEY` and `DEV_EMAIL_OVERRIDE` to `.env.example` with placeholder values
- [ ] 1.3 Create `lib/email/send.ts` — exports `sendEmail({ to, subject, html })` wrapping Resend; skip send and log warning if `RESEND_API_KEY` is absent; redirect to `DEV_EMAIL_OVERRIDE` if set
- [ ] 1.4 Create `lib/email/templates/verification.ts` — exports `verificationEmailHtml({ name, link })` returning branded HTML
- [ ] 1.5 Create `lib/email/templates/email-change.ts` — exports `emailChangeHtml({ name, newEmail, link })` returning branded HTML
- [ ] 1.6 Create `lib/email/templates/reminder.ts` — exports `reminderEmailHtml({ name, habits })` returning branded HTML
- [ ] 1.7 Create `lib/email/templates/weekly-review.ts` — exports `weeklyReviewEmailHtml({ name, completionRate, weekLabel })` returning branded HTML
- [ ] 1.8 Create `lib/email/templates/accountability.ts` — exports `accountabilityAlertHtml({ name, habitName, habitId })` returning branded HTML
- [ ] 1.9 Create `lib/email/tokens.ts` — exports `createVerificationToken(identifier)` (generates 32-byte hex token, upserts `VerificationToken` with 24 h expiry) and `consumeVerificationToken(identifier, token)` (validates and deletes the record)

## 2. Database Schema Updates

- [ ] 2.1 Add `lastReminderSentAt String?` (date key `YYYY-MM-DD`) and `lastWeeklyNudgeSentAt String?` (ISO week key) columns to `UserPreference` in `prisma/schema.prisma`
- [ ] 2.2 Run `prisma migrate dev --name add_notification_sent_at` to generate and apply the migration

## 3. Email Verification — Registration Flow

- [ ] 3.1 Create `lib/email/send-verification.ts` — exports `sendVerificationEmail({ userId, email, name })`: generates token via `createVerificationToken("verify:<email>")`, builds link to `/api/auth/verify-email?token=<token>&identifier=verify:<email>`, sends via `sendEmail` using the verification template
- [ ] 3.2 Update `lib/auth/register.ts` — after `createUser` succeeds, call `sendVerificationEmail` in a non-blocking try/catch (do not fail registration if email send throws)
- [ ] 3.3 Create `app/api/auth/verify-email/route.ts` — GET handler: reads `token` and `identifier` from query params, calls `consumeVerificationToken`, sets `User.emailVerified = new Date()`, redirects to `/?verified=1` on success or renders error page on failure

## 4. Email Change Flow

- [ ] 4.1 Create `lib/email/send-email-change.ts` — exports `sendEmailChangeConfirmation({ userId, currentEmail, newEmail, name })`: checks new email not already taken, deletes any existing `change:<*>:<userId>` token, creates token `change:<newEmail>:<userId>`, builds link to `/api/auth/confirm-email-change`, sends via email change template
- [ ] 4.2 Create `lib/actions/account.ts` — server action `updateProfileAction(formData)`: validates name (non-empty) and/or new email; for name: updates `User.name` in db; for email: calls `sendEmailChangeConfirmation` and returns pending state; returns `{ ok, message, errors? }`
- [ ] 4.3 Create `app/api/auth/confirm-email-change/route.ts` — GET handler: reads `token` and `identifier` (format `change:<newEmail>:<userId>`), calls `consumeVerificationToken`, updates `User.email` and `User.emailVerified`, redirects to `/settings?emailUpdated=1`

## 5. Settings Page — Account Section

- [ ] 5.1 Create `lib/auth/get-profile.ts` — server helper `getProfileForSettings()`: calls `requireUserId`, fetches `{ name, email, emailVerified }` from db, returns the record
- [ ] 5.2 Convert `app/(root)/settings/page.tsx` Account section to read real user data: remove hardcoded "Alex Rivera" and "This browser", remove the Storage row, display name + email from `getProfileForSettings()`
- [ ] 5.3 Add inline name-edit UI to the Profile row: clicking an edit icon shows an input pre-filled with the current name; on submit calls `updateProfileAction`; shows inline error or success toast
- [ ] 5.4 Add email-change UI to the Email row: clicking an edit icon shows a new-email input; on submit calls `updateProfileAction`; shows "Confirmation sent to <email>" pending state
- [ ] 5.5 Show verified/unverified badge next to email; show "Resend verification email" button when `emailVerified` is null; wire button to a server action that calls `sendVerificationEmail`
- [ ] 5.6 Handle `?verified=1` and `?emailUpdated=1` query params on the settings page to show a success banner on arrival

## 6. Notification Email Delivery

- [ ] 6.1 Create `lib/email/send-notifications.ts` — exports three functions: `maybeSendReminderEmail(userId)`, `maybeSendWeeklyNudgeEmail(userId)`, `maybeSendAccountabilityAlerts(userId)`; each checks user preferences, `emailVerified`, sent-date guards, fetches relevant data, and calls `sendEmail`
- [ ] 6.2 Create `app/api/v1/notifications/trigger/route.ts` — POST handler: requires authenticated session, calls all three `maybeSend*` functions for the current user, returns `{ sent: string[] }` listing which emails were dispatched
- [ ] 6.3 Add a `useEffect` in the app's root layout (or a dedicated hook) that calls `POST /api/v1/notifications/trigger` once per session after the user is authenticated (fire-and-forget, no UI impact)

## 7. Session — Expose emailVerified

- [ ] 7.1 Update `auth.ts` JWT callback to include `emailVerified` in the token (read from db via `db.user.findUnique` or from the user object if available)
- [ ] 7.2 Update `auth.ts` session callback to expose `session.user.emailVerified` from the token
- [ ] 7.3 Extend `next-auth.d.ts` (or the existing session type augmentation) to add `emailVerified: Date | null` to the session user type

## 8. Validation and Tests

- [ ] 8.1 Write unit tests for `lib/email/tokens.ts` (create, consume, expire, reuse scenarios) using a mocked Prisma client
- [ ] 8.2 Write unit tests for `lib/auth/register.ts` covering the new email-send path (mock `sendVerificationEmail`, assert it is called exactly once on success and that registration still completes if send throws)
- [ ] 8.3 Write unit tests for `updateProfileAction` covering name update, email-change request, same-email rejection, and duplicate-email rejection
- [ ] 8.4 Write unit tests for `lib/email/send-notifications.ts`: verify sent-date guard prevents duplicate sends; verify unverified users are skipped
- [ ] 8.5 Run `npm exec vitest run` — all tests pass
- [ ] 8.6 Run `npm run build` — build succeeds with no type errors
