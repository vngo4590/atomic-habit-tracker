## Context

Atomicly uses NextAuth v5 (beta) with a Credentials provider, JWT session strategy, and PrismaAdapter against PostgreSQL. The User model already has `emailVerified DateTime?` and the schema includes a `VerificationToken` model — both are standard NextAuth constructs that have never been activated. Registration currently creates accounts and immediately signs users in without any verification step. The settings page renders hardcoded placeholder data and notification toggles that only update `localStorage` preferences with no actual email delivery.

The email layer is entirely absent from the codebase today. There are no SMTP helpers, no template renderer, and no transactional email calls anywhere.

## Goals / Non-Goals

**Goals:**
- Display real session user data (name, email, verified status) in the Account section.
- Allow authenticated users to edit their display name inline.
- Allow authenticated users to initiate an email change — send a confirmation link, apply only after click.
- On registration, send an email verification link; flag unverified accounts in the UI without blocking login.
- Remove the legacy "Storage" row from the Account section.
- Send formatted transactional notification emails (reminders, weekly review, accountability) when those preferences are enabled.
- Introduce a thin, swappable email service layer in `lib/email/`.

**Non-Goals:**
- OAuth / social login providers.
- Password change flow (separate concern).
- Full email template design system (simple, functional HTML emails are sufficient for now).
- Email scheduling infrastructure (cron/queue jobs) — notification email sending will be triggered by API routes called from the client for now (phase 1); background scheduling is a future phase.
- Rate limiting or unsubscribe management for notification emails.

## Decisions

### D1 — Email service: Resend over Nodemailer

**Decision:** Use [Resend](https://resend.com) as the email transport.

**Rationale:** Resend has a clean HTTP API, a first-party Node SDK, generous free tier (3 000 emails/month), and requires zero SMTP server management. Nodemailer requires an SMTP host and more configuration, which is a higher barrier for local development and deployment.

**Abstraction:** `lib/email/send.ts` exports a single `sendEmail({ to, subject, html })` function that wraps the provider. Swapping providers means editing one file.

**Alternative considered:** Nodemailer — ruled out for local-dev friction and SMTP dependency. Could be added as a fallback if `RESEND_API_KEY` is absent.

### D2 — Verification token storage: reuse `VerificationToken` table

**Decision:** Use the existing `VerificationToken(identifier, token, expires)` table for both email verification and email-change confirmation tokens.

**Rationale:** NextAuth already owns this table; it is already migrated. Using it avoids a new table for a structurally identical concern. `identifier` is a composite key — we namespace it:
- Email verification: `identifier = "verify:<email>"`
- Email change: `identifier = "change:<newEmail>:<userId>"`

The `token` column stores a cryptographically random hex string (32 bytes). `expires` is set to 24 hours from creation.

**Alternative considered:** A separate `EmailChangeToken` model — more explicit but unnecessary given the existing table is already general-purpose.

### D3 — Email change: pending-email stored in token identifier, not User table

**Decision:** Do not add a `pendingEmail` column to `User`. Instead encode the new email into the `VerificationToken.identifier` as `"change:<newEmail>:<userId>"`. On confirmation click, parse it out and update `User.email`.

**Rationale:** Avoids a schema migration for ephemeral state. The token row is deleted on use or expiry. If the user requests a new change before confirming, delete the old token first.

**Alternative considered:** `pendingEmail` column on `User` — simpler read, but requires a migration and leaves stale state if the user never confirms.

### D4 — Notification email delivery: triggered on-demand via server action (phase 1)

**Decision:** Notification emails are sent from a server action called by the client when a relevant event occurs (e.g., completing daily habits, viewing the weekly review screen). No background job scheduler for now.

**Rationale:** Adds genuine email delivery without requiring a cron/queue infrastructure. "Daily reminders" in phase 1 means: when the user opens the app and their reminder preference is on, a server action checks if a reminder email has already been sent today (tracked by a simple date key) and sends one if not.

**Alternative considered:** A cron job via Vercel Cron or a queue (BullMQ) — correct long-term solution, but out of scope for this phase. The architecture (a reusable `sendEmail` helper) makes this upgrade straightforward later.

### D5 — Session does not block on `emailVerified`

**Decision:** Users with unverified email can still log in and use the app. The UI shows a dismissible banner or indicator in settings ("Your email is not yet verified. Resend link").

**Rationale:** Blocking login on verification creates support burden and degrades UX. Soft verification is sufficient for a habit-tracking app that doesn't expose sensitive data to third parties. The `emailVerified` timestamp can be used later for premium gating or trust signals.

**Alternative considered:** Hard block unverified users — too aggressive for a v1 personal productivity app.

## Risks / Trade-offs

- **Resend API key required in `.env`** → Without `RESEND_API_KEY` the email functions fail at runtime. Mitigation: `lib/email/send.ts` checks for the key and logs a warning + skips send in development if absent, rather than throwing. A `DEV_EMAIL_OVERRIDE` env var redirects all emails to a single address for local testing.
- **Token table reuse namespace collisions** → If NextAuth itself writes a `VerificationToken` with an identifier that starts with `verify:` or `change:`, there's a potential conflict. Mitigation: NextAuth uses raw email addresses as identifiers (not namespaced), so the prefixes are safe.
- **No retry on email send failure** → If Resend is down, the verification email is lost silently. Mitigation: surface the error in the UI ("Verification email could not be sent — try again") rather than failing silently.
- **Email change with no re-authentication** → A logged-in user can change email without re-entering their password. This is a minor security trade-off; the confirmation link to the new address partially mitigates hijack risk. Full mitigation (require password re-entry) is deferred.

## Migration Plan

1. Deploy `lib/email/` module + env vars (`RESEND_API_KEY`, optional `DEV_EMAIL_OVERRIDE`).
2. Deploy new API routes (`/api/auth/verify-email`, `/api/auth/confirm-email-change`).
3. Deploy updated `registerAction` (adds async email send — no behavioural change if send fails).
4. Deploy updated settings page — reads real session data, removes storage row.
5. Deploy `updateProfileAction` server action.
6. No data migration needed — existing users get `emailVerified = null`, which the UI handles gracefully ("unverified" state with a resend option).

**Rollback:** All changes are additive. Reverting the settings page to hardcoded data and removing the email routes restores the prior state without touching the database.

## Open Questions

- **Email sender address**: what `from` address should be used? Requires a verified domain in Resend. Placeholder: `noreply@atomicly.app` — confirm before go-live.
- **Notification email scheduling**: phase 1 uses client-triggered sends with a "sent today" guard. When should we graduate to a proper cron? Track as a follow-on phase.
- **Email template branding**: plain functional HTML for now. A designed template is a future task.
