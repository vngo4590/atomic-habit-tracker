"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { Input } from "@/components/ui";

import styles from "./PasswordInput.module.css";

/**
 * PasswordInput — a password text field with a built-in show/hide toggle.
 *
 * What it is: a drop-in replacement for `<input type="password">`. It renders
 * the design-system `Input` plus an "eye" button on the right edge. Clicking
 * the eye reveals the typed characters (the field becomes `type="text"`);
 * clicking it again hides them.
 *
 * Why it exists: the login, register and settings change-password fields all
 * need the exact same reveal behaviour, so the accessibility and non-submit
 * guarantees are written and tested once.
 *
 * Because it renders `Input`, placing it inside a `<Field>` wires the label,
 * hint and inline error automatically (id, aria-describedby, aria-invalid).
 * Every standard input prop (`name`, `autoComplete`, `required`, ...) is
 * forwarded, so password managers and form submission behave as before. The
 * only prop it owns is `type` — that is controlled by the toggle.
 */
type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export function PasswordInput({ className, ...inputProps }: PasswordInputProps) {
  // Each instance keeps its own flag, so toggling one field never affects
  // another field on the same page.
  const [visible, setVisible] = useState(false);

  // The button describes the action it will perform, not the current state, so
  // assistive tech announces "Show password" while hidden and vice versa.
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className={styles.wrapper}>
      <Input
        {...inputProps}
        type={visible ? "text" : "password"}
        // Reserve room on the right so typed text never slides under the eye.
        className={[styles.input, className ?? ""].filter(Boolean).join(" ")}
      />
      <button
        // type="button" is critical: otherwise the eye would submit the form.
        type="button"
        className={styles.toggle}
        aria-label={label}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </button>
    </div>
  );
}
