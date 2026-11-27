"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import { importDataAction } from "../actions";
import { SettingRow, SettingsSection } from "./SettingsSection";
import styles from "./forms.module.css";

/** Delay before reloading after a successful import, so the toast is seen. */
const RELOAD_DELAY_MS = 600;

/**
 * DataSection — download a full JSON backup and restore (merge) one.
 *
 * Export hits `/api/v1/export`, which builds the file from the database, so
 * the download is always complete. Import never writes without a second,
 * explicit confirmation; it merges (adds/refreshes) and never deletes. On
 * success the page reloads so the store re-seeds from the server snapshot.
 */
export function DataSection() {
  const store = useStoreContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<{ name: string; text: string } | null>(null);
  const [importing, startImport] = useTransition();

  const exportJson = () => {
    clientLogger.info("Data export started", { page: "settings", habitCount: store.habits.length });
    const link = document.createElement("a");
    link.href = "/api/v1/export";
    link.download = "atomicly-backup.json";
    link.click();
    store.showToast("Backup downloading");
  };

  const onFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => setPending({ name: file.name, text }))
      .catch((error) => {
        clientLogger.error("Backup file read failed", { page: "settings", error });
        store.showToast("Could not read that file");
      });
  };

  const confirmImport = () => {
    if (!pending) return;
    const text = pending.text;
    clientLogger.info("Data import submitted", { page: "settings" });
    startImport(async () => {
      const result = await importDataAction(text);
      setPending(null);
      store.showToast(result.message);
      if (result.ok) {
        window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
      }
    });
  };

  const habitCount = store.habits.length;

  return (
    <SettingsSection id="data" title="Data" description="Your data is yours — take a copy or restore one any time.">
      <SettingRow
        label="Export backup"
        hint={`Everything in your account, including ${habitCount} ${habitCount === 1 ? "habit" : "habits"}, as JSON.`}
        action={
          <Button variant="secondary" size="sm" icon={<Download />} onClick={exportJson}>
            Download JSON
          </Button>
        }
      />

      <SettingRow
        label="Import backup"
        hint="Merges a backup into your account. Nothing is deleted."
        action={
          <>
            {/* Native picker, opened by the visible button. */}
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              onChange={onFileChosen}
              hidden
              aria-label="Backup file"
            />
            <Button
              variant="secondary"
              size="sm"
              icon={<Upload />}
              disabled={importing}
              onClick={() => inputRef.current?.click()}
            >
              Choose file
            </Button>
          </>
        }
      >
        {pending ? (
          <div className={styles.inlineForm}>
            <p className={styles.note}>
              Merge <strong>{pending.name}</strong> into your account? This adds or updates data and never deletes
              anything.
            </p>
            <div className={styles.actions}>
              <Button size="sm" loading={importing} onClick={confirmImport}>
                Import
              </Button>
              <Button variant="ghost" size="sm" disabled={importing} onClick={() => setPending(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </SettingRow>
    </SettingsSection>
  );
}
