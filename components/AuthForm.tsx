"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import type { AuthFormState } from "@/lib/contracts/auth";
import { initialAuthFormState } from "@/lib/contracts/auth";

import styles from "./AuthForm.module.css";

interface AuthFormProps {
  /** Server action that validates the form and returns the next state. */
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Optional callback URL forwarded to next-auth after successful login. */
  callbackUrl?: string;
  /** Small uppercase label above the title (e.g. "Sign in"). */
  eyebrow: string;
  /** Heading text for the card. */
  title: string;
  /** Label for the submit button (e.g. "Continue"). */
  submitLabel: string;
  /** Whether to render the name field (true for register, false for login). */
  includeName?: boolean;
  /** Footer block (e.g. cross-link to the other auth page). */
  footer: ReactNode;
}

/** Pull the first error for a given field out of the action state, or null. */
function fieldError(state: AuthFormState, field: "name" | "email" | "password") {
  return state.errors?.[field]?.[0] ?? null;
}

/**
 * AuthForm — shared login + registration card.
 *
 * Single component used by both `/login` and `/register`. The form is wired
 * through React's `useActionState` so server validation errors surface
 * underneath each field without a full page reload.
 */
export function AuthForm({
  action,
  callbackUrl,
  eyebrow,
  title,
  submitLabel,
  includeName = false,
  footer,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, initialAuthFormState);

  return (
    <main className={styles.shell}>
      <section className={`card card-pad fade-up ${styles.card}`}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className={`h1 ${styles.title}`}>{title}</h1>

        <form action={formAction} className={styles.form}>
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          {includeName && (
            <label>
              <span className="field-label">Name</span>
              <input className="input" name="name" autoComplete="name" required minLength={2} />
              {fieldError(state, "name") && (
                <span className={`muted ${styles.fieldError}`}>{fieldError(state, "name")}</span>
              )}
            </label>
          )}

          <label>
            <span className="field-label">Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required />
            {fieldError(state, "email") && (
              <span className={`muted ${styles.fieldError}`}>{fieldError(state, "email")}</span>
            )}
          </label>

          <label>
            <span className="field-label">Password</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete={includeName ? "new-password" : "current-password"}
              required
              minLength={8}
            />
            {fieldError(state, "password") && (
              <span className={`muted ${styles.fieldError}`}>{fieldError(state, "password")}</span>
            )}
          </label>

          {state.message && (
            <div role="status" className={`muted ${styles.formMessage}`}>
              {state.message}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Working..." : submitLabel}
          </button>
        </form>

        <p className={`muted ${styles.footer}`}>{footer}</p>
      </section>
    </main>
  );
}
