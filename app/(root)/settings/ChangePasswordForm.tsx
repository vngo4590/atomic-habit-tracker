"use client";

import { motion } from "framer-motion";
import { useActionState, useEffect } from "react";

import { PasswordInput } from "@/components/PasswordInput";
import { changePasswordAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";
import { clientLogger } from "@/lib/logger-client";

import styles from "./page.module.css";

interface ChangePasswordFormProps {
  /**
   * Called when the user finishes a successful change and clicks "Done".
   * The Settings page uses this to close the panel and show its toast.
   */
  onDone: () => void;
  /**
   * Fired once the change has SUCCEEDED (before the user clicks "Done"). The
   * Settings page uses this to hide its redundant row-level "Cancel" button —
   * after the password is already changed there is nothing left to cancel, so
   * the success view should offer only "Done".
   */
  onSuccess?: () => void;
}

/**
 * ChangePasswordForm — the Settings "change password" panel.
 *
 * Extracted into its own component so it owns its OWN `useActionState`. The
 * Settings page renders this only while the panel is open and unmounts it on
 * close, which means every reopen starts from a fresh `{ ok: false }` state.
 * That structurally fixes the old bug where, after one successful change, the
 * page-level success state stuck around and the form refused to reopen.
 *
 * Both fields use the shared `PasswordInput` so each has its own independent
 * show/hide toggle.
 */
export function ChangePasswordForm({ onDone, onSuccess }: ChangePasswordFormProps) {
  const [passwordState, passwordAction, passwordPending] = useActionState<ProfileFormState, FormData>(
    changePasswordAction,
    { ok: false, message: "" },
  );

  const passwordSuccess = passwordState.ok;

  // When the change succeeds, tell the Settings page so it can drop its
  // redundant "Cancel" toggle — the success view already shows "Done", and
  // "Cancel" makes no sense once the password has actually changed.
  useEffect(() => {
    if (passwordSuccess) {
      onSuccess?.();
    }
  }, [passwordSuccess, onSuccess]);

  return (
    <div className={styles.editFormShell}>
      {!passwordSuccess ? (
        <form
          action={passwordAction}
          className={styles.passwordForm}
          onSubmit={() => clientLogger.info("Password change submitted", { page: "settings" })}
        >
          <label>
            <span className="field-label">Current password</span>
            <PasswordInput
              className={`input ${styles.smallInput}`}
              name="currentPassword"
              required
              minLength={8}
            />
          </label>
          <label>
            <span className="field-label">New password</span>
            <PasswordInput
              className={`input ${styles.smallInput}`}
              name="newPassword"
              required
              minLength={8}
            />
          </label>
          <div className={styles.formActions}>
            <motion.button
              className="btn btn-sm btn-primary"
              type="submit"
              disabled={passwordPending}
              whileTap={{ scale: 0.97 }}
            >
              {passwordPending ? "Changing..." : "Change password"}
            </motion.button>
          </div>
        </form>
      ) : (
        <div className={styles.successRow}>
          <span className={styles.successText}>Password changed.</span>
          <motion.button
            className="btn btn-sm btn-primary"
            onClick={onDone}
            whileTap={{ scale: 0.97 }}
          >
            Done
          </motion.button>
        </div>
      )}
      {!passwordSuccess && passwordState.message && (
        <div className={`muted ${styles.formError}`}>{passwordState.message}</div>
      )}
    </div>
  );
}
