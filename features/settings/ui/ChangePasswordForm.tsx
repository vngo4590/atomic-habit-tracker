"use client";

import { useActionState, useEffect } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { Button, Field } from "@/components/ui";
import { changePasswordAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";
import { clientLogger } from "@/lib/logger-client";

import styles from "./forms.module.css";

interface ChangePasswordFormProps {
  /** Called when the user finishes a successful change and clicks "Done". */
  onDone: () => void;
  /**
   * Fired once the change has SUCCEEDED (before "Done"). The Profile section
   * uses this to hide its row-level "Cancel" — once the password changed there
   * is nothing left to cancel, so the success view offers only "Done".
   */
  onSuccess?: () => void;
}

/**
 * ChangePasswordForm — the Settings "change password" panel.
 *
 * It owns its own `useActionState` and is unmounted when the panel closes, so
 * every reopen starts from a fresh `{ ok: false }` state (the fix for the old
 * "can only change once" bug). Both fields use `PasswordInput` inside a
 * `Field`, giving each its own label wiring and show/hide toggle.
 */
export function ChangePasswordForm({ onDone, onSuccess }: ChangePasswordFormProps) {
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(changePasswordAction, {
    ok: false,
    message: "",
  });

  useEffect(() => {
    if (state.ok) {
      onSuccess?.();
    }
  }, [state.ok, onSuccess]);

  if (state.ok) {
    return (
      <div className={styles.success}>
        <p className={styles.successText} role="status">
          Password changed.
        </p>
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className={styles.form}
      onSubmit={() => clientLogger.info("Password change submitted", { page: "settings" })}
    >
      <Field label="Current password" id="settings-current-password">
        <PasswordInput name="currentPassword" autoComplete="current-password" required minLength={8} />
      </Field>
      <Field
        label="New password"
        id="settings-new-password"
        hint="At least 8 characters, with a letter, a number and a symbol."
      >
        <PasswordInput name="newPassword" autoComplete="new-password" required minLength={8} />
      </Field>
      {state.message ? (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      ) : null}
      <div className={styles.actions}>
        <Button type="submit" size="sm" loading={pending}>
          Change password
        </Button>
      </div>
    </form>
  );
}
