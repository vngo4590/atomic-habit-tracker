"use client";

import { useCallback, useState } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Skeleton } from "@/components/ui";

import { ChangePasswordForm } from "./ChangePasswordForm";
import { NameForm } from "./NameForm";
import { SettingRow, SettingsSection } from "./SettingsSection";
import type { SessionUser, SessionUserStatus } from "./useSessionUser";

/**
 * ProfileSection — display name (inline edit), email (read-only) and the
 * change-password panel. Editors are revealed on demand and unmounted on
 * close so each reopen starts fresh; saves confirm with a toast.
 */
export function ProfileSection({
  user,
  status,
  onRetry,
  onNameSaved,
}: {
  user: SessionUser | null;
  status: SessionUserStatus;
  onRetry: () => void;
  onNameSaved: (name: string) => void;
}) {
  const { showToast } = useStoreContext();
  const [editingName, setEditingName] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  // True once a password change has succeeded but before "Done" closes the
  // panel — hides the row-level "Cancel", since nothing is left to cancel.
  const [passwordChanged, setPasswordChanged] = useState(false);
  const markPasswordChanged = useCallback(() => setPasswordChanged(true), []);

  const loading = status === "loading";
  const valueOrSkeleton = (value: string | null | undefined) =>
    loading ? <Skeleton shape="text" width="12rem" /> : (value ?? "—");

  return (
    <SettingsSection id="profile" title="Profile & account" description="How you appear in Atomicly and how you sign in.">
      {status === "error" ? (
        <SettingRow
          label="Profile"
          hint="We couldn't load your profile details."
          action={
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : null}

      <SettingRow
        label="Name"
        value={valueOrSkeleton(user?.name)}
        action={
          <Button
            variant="secondary"
            size="sm"
            disabled={loading}
            aria-expanded={editingName}
            onClick={() => setEditingName((open) => !open)}
          >
            {editingName ? "Cancel" : "Edit"}
          </Button>
        }
      >
        {editingName ? (
          <NameForm
            initialName={user?.name ?? ""}
            onSaved={(name) => {
              onNameSaved(name);
              setEditingName(false);
              showToast("Profile updated");
            }}
          />
        ) : null}
      </SettingRow>

      <SettingRow label="Email" value={valueOrSkeleton(user?.email)} />

      <SettingRow
        label="Password"
        hint="Changing it keeps this device signed in and signs out older sessions."
        action={
          !changingPassword ? (
            <Button variant="secondary" size="sm" aria-expanded={false} onClick={() => setChangingPassword(true)}>
              Change
            </Button>
          ) : passwordChanged ? null : (
            <Button variant="secondary" size="sm" aria-expanded onClick={() => setChangingPassword(false)}>
              Cancel
            </Button>
          )
        }
      >
        {changingPassword ? (
          <ChangePasswordForm
            onSuccess={markPasswordChanged}
            onDone={() => {
              setChangingPassword(false);
              setPasswordChanged(false);
              showToast("Password changed");
            }}
          />
        ) : null}
      </SettingRow>
    </SettingsSection>
  );
}
