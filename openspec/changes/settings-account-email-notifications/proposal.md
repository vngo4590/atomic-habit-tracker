## Why

The Settings page currently shows hardcoded placeholder data ("Alex Rivera", "This browser"), notifications are toggle-only with no actual delivery, and registration creates accounts without verifying the email address. Users have no way to manage their own profile or trust that their account email is valid.

## What Changes

- **Account section** now displays real session user data (name, email, `emailVerified` status) and allows inline editing of name and email.
- **Email change flow**: updating email sends a confirmation link to the *new* address; the email only updates in the database after the user clicks the link.
- **Registration verification**: after sign-up the user receives a verification link; unverified accounts can still log in but are marked as unverified until they confirm.
- **Remove "Storage" row** from the Account section (it was a legacy placeholder for localStorage; the app now uses a database).
- **Notification emails**: when reminders, weekly review nudge, or accountability nudge are enabled, the app sends formatted transactional emails to the user's verified address on the relevant schedule/event.
- A shared **email service layer** (`lib/email/`) is introduced to power both the verification/confirmation flows and notification emails.

## Capabilities

### New Capabilities

- `profile-management`: Display real user data in the Account section and allow editing name and email (with email-change confirmation flow).
- `email-verification`: Send a verification email on registration; show unverified status in the UI; confirm the address when the user clicks the link.
- `email-change`: Allow an authenticated user to request an email change; send a confirmation link to the new address; apply the change only after the link is clicked.
- `email-notifications`: Send formatted transactional emails for daily habit reminders, weekly review nudges, and accountability contract alerts when those preferences are enabled.

### Modified Capabilities

<!-- No existing specs to modify — this is a greenfield addition to existing UI/auth -->

## Impact

- **`app/(root)/settings/page.tsx`** — Account section rewritten to use session data; storage row removed; notification toggles wired to actual persistence.
- **`lib/auth/register.ts`** — After account creation, trigger email verification send (non-blocking; user proceeds but sees unverified state).
- **`auth.ts`** — No provider changes; `emailVerified` field surfaced through JWT/session callbacks.
- **`prisma/schema.prisma`** — `VerificationToken` model already exists. May need a separate `EmailChangeToken` model to handle the pending-email-change state.
- **`lib/email/`** — New module: email transport abstraction (Resend/Nodemailer/SMTP), template rendering, and send helpers.
- **`app/api/auth/verify-email/route.ts`** — New: handles email verification link clicks.
- **`app/api/auth/confirm-email-change/route.ts`** — New: handles email-change confirmation link clicks.
- **`lib/actions/account.ts`** — New server action: `updateProfileAction` (name, email-change request).
- **New dependency**: email sending library (Resend recommended for simplicity; falls back to Nodemailer for self-hosted).
