"use client";

import type { ReactNode } from "react";
import { useActionState } from "react";

import type { AuthFormState } from "@/lib/contracts/auth";
import { initialAuthFormState } from "@/lib/contracts/auth";

interface AuthFormProps {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  callbackUrl?: string;
  eyebrow: string;
  title: string;
  submitLabel: string;
  includeName?: boolean;
  footer: ReactNode;
}

function fieldError(state: AuthFormState, field: "name" | "email" | "password") {
  return state.errors?.[field]?.[0] ?? null;
}

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
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
      <section className="card card-pad fade-up" style={{ width: "min(440px, 100%)" }}>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="h1" style={{ marginTop: 8, marginBottom: 22 }}>{title}</h1>

        <form action={formAction} style={{ display: "grid", gap: 14 }}>
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          {includeName && (
            <label>
              <span className="field-label">Name</span>
              <input className="input" name="name" autoComplete="name" required minLength={2} />
              {fieldError(state, "name") && <span className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 12 }}>{fieldError(state, "name")}</span>}
            </label>
          )}

          <label>
            <span className="field-label">Email</span>
            <input className="input" name="email" type="email" autoComplete="email" required />
            {fieldError(state, "email") && <span className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 12 }}>{fieldError(state, "email")}</span>}
          </label>

          <label>
            <span className="field-label">Password</span>
            <input className="input" name="password" type="password" autoComplete={includeName ? "new-password" : "current-password"} required minLength={8} />
            {fieldError(state, "password") && <span className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 12 }}>{fieldError(state, "password")}</span>}
          </label>

          {state.message && (
            <div role="status" className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 13 }}>
              {state.message}
            </div>
          )}

          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Working..." : submitLabel}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 18, fontSize: 13 }}>
          {footer}
        </p>
      </section>
    </main>
  );
}
