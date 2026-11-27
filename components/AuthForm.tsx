"use client";

import type { ReactNode } from "react";
import { Component, useActionState } from "react";

import { Button, Field, Input } from "@/components/ui";
// Type-only import: the runtime contracts module pulls Zod into the client
// bundle, and the form only needs the state shape.
import type { AuthFormState } from "@/lib/contracts/auth";
import { clientLogger } from "@/lib/logger-client";

import { PasswordInput } from "./PasswordInput";
import { TurnstileWidget } from "./TurnstileWidget";
import styles from "./AuthForm.module.css";

const INITIAL_STATE: AuthFormState = { ok: false, message: "" };

interface AuthFormProps {
  /** Server action that validates the form and returns the next state. */
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Optional callback URL forwarded to next-auth after successful login. */
  callbackUrl?: string;
  /** Small label above the title (e.g. "Welcome back"). */
  eyebrow: string;
  /** Heading text for the card. */
  title: string;
  /** Label for the submit button (e.g. "Sign in"). */
  submitLabel: string;
  /** Whether to render the name field (true for register, false for login). */
  includeName?: boolean;
  /** Footer block (e.g. cross-link to the other auth page). */
  footer: ReactNode;
}

/** Shown when the request never reaches the action (e.g. the proxy rate limiter answers 429). */
const UNREACHABLE_STATE: AuthFormState = {
  ok: false,
  message: "We couldn't reach the server. Please wait a moment and try again.",
};

/** True for the framework's own control-flow errors (redirect / notFound), which must propagate. */
function isNavigationError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/** Pull the first error for a given field out of the action state. */
function fieldError(state: AuthFormState, field: "name" | "email" | "password") {
  return state.errors?.[field]?.[0];
}

/**
 * AuthForm — shared login + registration card.
 *
 * Single component used by both `/login` and `/register`. The form is wired
 * through React's `useActionState` so server validation errors surface inline
 * under each field without a full page reload.
 */
export function AuthForm(props: AuthFormProps) {
  // The boundary remounts the form with a readable alert if the action call
  // itself fails (429, network drop) instead of crashing to the route error page.
  return (
    <TransportErrorBoundary mode={props.includeName ? "register" : "login"}>
      {(failed) => <AuthFormBody {...props} initialState={failed ? UNREACHABLE_STATE : INITIAL_STATE} />}
    </TransportErrorBoundary>
  );
}

interface TransportErrorBoundaryProps {
  mode: "login" | "register";
  children: (failed: boolean) => ReactNode;
}

/**
 * Catches errors thrown by the submitted server action on the client. The real
 * server action is handed to `useActionState` untouched (wrapping it would drop
 * the metadata React needs for native, no-JavaScript form submission), so a
 * hydrated transport failure surfaces here instead.
 */
class TransportErrorBoundary extends Component<TransportErrorBoundaryProps, { error: unknown }> {
  state = { error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  componentDidCatch() {
    clientLogger.warn("Auth request failed", { event: "auth.submit_failed", mode: this.props.mode });
  }

  render() {
    // redirect()/notFound() are framework control flow, not failures — let them through.
    if (isNavigationError(this.state.error)) throw this.state.error;
    // React remounts the failed subtree, so the form starts fresh showing the alert.
    return this.props.children(this.state.error !== null);
  }
}

function AuthFormBody({
  action,
  callbackUrl,
  eyebrow,
  title,
  submitLabel,
  includeName = false,
  footer,
  initialState,
}: AuthFormProps & { initialState: AuthFormState }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const authMode = includeName ? "register" : "login";

  // Record safe auth intent metadata without exposing credentials.
  const handleSubmit = () => {
    clientLogger.info("Auth form submitted", {
      event: "auth.submit",
      mode: authMode,
      hasCallbackUrl: Boolean(callbackUrl),
    });
  };

  return (
    <main className={styles.shell}>
      <div className={styles.column}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandName}>Atomicly</span>
        </div>
        <p className={styles.valueLine}>Small daily habits, tracked calmly, compounding into who you want to be.</p>

        <section className={styles.card} aria-labelledby="auth-title">
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="auth-title" className={styles.title}>
            {title}
          </h1>

          <form action={formAction} className={styles.form} onSubmit={handleSubmit}>
            <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
            {includeName ? (
              <Field label="Name" error={fieldError(state, "name")}>
                <Input name="name" autoComplete="name" required minLength={2} />
              </Field>
            ) : null}

            <Field label="Email" error={fieldError(state, "email")}>
              <Input name="email" type="email" autoComplete="email" inputMode="email" required />
            </Field>

            <Field
              label="Password"
              hint={includeName ? "At least 8 characters with a letter, a number and a symbol." : undefined}
              error={fieldError(state, "password")}
            >
              <PasswordInput
                name="password"
                autoComplete={includeName ? "new-password" : "current-password"}
                required
                minLength={8}
              />
            </Field>

            {state.message ? (
              <p role={state.ok ? "status" : "alert"} className={state.ok ? styles.message : styles.error}>
                {state.message}
              </p>
            ) : null}

            <TurnstileWidget />

            <Button type="submit" fullWidth loading={pending}>
              {submitLabel}
            </Button>
          </form>
        </section>

        <p className={styles.footer}>{footer}</p>
      </div>
    </main>
  );
}
