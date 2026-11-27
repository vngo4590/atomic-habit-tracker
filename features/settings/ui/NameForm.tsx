"use client";

import { useActionState, useState } from "react";

import { Button, Field, Input } from "@/components/ui";
import { updateProfileAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";
import { clientLogger } from "@/lib/logger-client";

import styles from "./forms.module.css";

/**
 * NameForm — inline editor for the display name. Owns its own action state
 * and is unmounted on close, so every reopen starts clean. On success it hands
 * the saved name back so the row updates immediately (no refetch).
 */
export function NameForm({ initialName, onSaved }: { initialName: string; onSaved: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  const [state, formAction, pending] = useActionState<ProfileFormState, FormData>(
    async (previous, formData) => {
      const result = await updateProfileAction(previous, formData);
      if (result.ok) {
        onSaved(String(formData.get("name") ?? "").trim());
      }
      return result;
    },
    { ok: false, message: "" },
  );

  const tooShort = name.trim().length < 2;

  return (
    <form
      action={formAction}
      className={styles.inlineForm}
      onSubmit={() => clientLogger.info("Profile update submitted", { page: "settings" })}
    >
      <Field label="Display name" id="settings-name" error={!state.ok && state.message ? state.message : undefined}>
        <Input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          minLength={2}
          maxLength={80}
          required
          autoFocus
        />
      </Field>
      <div className={styles.actions}>
        <Button type="submit" size="sm" loading={pending} disabled={tooShort}>
          Save name
        </Button>
      </div>
    </form>
  );
}
