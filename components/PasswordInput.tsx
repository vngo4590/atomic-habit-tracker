"use client";

import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

import { IconEye, IconEyeOff } from "./Icons";
import styles from "./PasswordInput.module.css";

/**
 * PasswordInput — a password text field with a built-in show/hide toggle.
 *
 * What it is: a drop-in replacement for `<input type="password">`. It renders a
 * real `<input>` plus a small "eye" button on the right edge. Clicking the eye
 * reveals the typed characters (the field becomes `type="text"`); clicking it
 * again hides them again.
 *
 * Why it exists: three password fields (login, register, and the two settings
 * change-password fields) all need the exact same reveal behaviour. Centralising
 * it here means the accessibility and non-submit guarantees are written and
 * tested once instead of duplicated three times.
 *
 * It forwards every standard input prop (`name`, `autoComplete`, `required`,
 * `minLength`, `className`, `id`, ...) straight through to the underlying
 * `<input>`, so password managers and form submission behave exactly as before.
 * The only prop it owns is `type` — that is controlled internally by the toggle.
 */
type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export function PasswordInput({ className, ...inputProps }: PasswordInputProps) {
  // The single piece of state this component owns: whether the password is
  // currently revealed. Each instance keeps its own flag, so toggling one field
  // never affects another field on the same page.
  const [visible, setVisible] = useState(false);

  // The button describes the action it will perform, not the current state, so
  // assistive tech announces "Show password" while hidden and vice versa.
  const label = visible ? "Hide password" : "Show password";

  return (
    <div className={styles.wrapper}>
      <input
        {...inputProps}
        // Reveal vs. conceal is the whole point of this component.
        type={visible ? "text" : "password"}
        // Keep the caller's field styling and add our right-padding so typed
        // text never slides under the eye icon.
        className={className ? `${className} ${styles.input}` : styles.input}
      />
      <button
        // type="button" is critical: without it, clicking the eye would submit
        // the surrounding <form>.
        type="button"
        className={styles.toggle}
        aria-label={label}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
