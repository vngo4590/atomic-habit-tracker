"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";

import { IconMoon, IconSun } from "@/components/Icons";
import { HuePicker } from "@/components/HuePicker";
import { useStoreContext } from "@/components/StoreProvider";
import { importDataAction } from "@/features/settings/actions";
import { logoutAction, updateProfileAction, signOutEverywhereAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";
import { applyAppearance } from "@/lib/appearance";
import { clientLogger } from "@/lib/logger-client";
import { THEMES, type ThemeId } from "@/lib/themes";

import { ChangePasswordForm } from "./ChangePasswordForm";
import styles from "./page.module.css";

interface SessionUser {
  name: string | null;
  email: string | null;
}

// Accent presets — each is just an OKLCH hue fed to `--accent-hue`. Sage (160)
// is the MASTER design-system default; the others are calm alternates.
const ACCENTS = [
  { name: "Sage", hue: 160 },
  { name: "Ochre", hue: 60 },
  { name: "Slate", hue: 240 },
  { name: "Plum", hue: 340 },
];

/**
 * SettingsPage — four groups: Account (profile name + email + change
 * password + sign out), Identity (link to /identity), Appearance
 * (Light/Dark + accent), and Data (export/import JSON).
 */
export default function SettingsPage() {
  const store = useStoreContext();
  const [theme, setTheme] = useState<ThemeId>(store.preferences.theme);
  const [accent, setAccent] = useState(store.preferences.accentHue);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Profile name editing state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);
  // True once a password change has succeeded but before the panel is closed.
  // Used to hide the row-level "Cancel" toggle in the success state, where the
  // ChangePasswordForm already shows a "Done" button and there is nothing to cancel.
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Data import state. `pendingImport` holds the chosen file's text + name while
  // we ask the user to confirm the merge; `importPending` blocks the UI while
  // the server restores. The hidden <input> is opened programmatically.
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; text: string } | null>(null);
  const [importPending, startImport] = useTransition();

  // Trailing-debounce timer for persisting accent-hue changes (see commitAccent).
  const accentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (accentSaveTimer.current) clearTimeout(accentSaveTimer.current);
  }, []);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "settings" });
  }, []);

  // Server action states (React 19 useActionState)
  const [profileState, profileAction, profilePending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    { ok: false, message: "" },
  );

  // Note: local `theme`/`accent` are seeded from the store on mount (above) and
  // are the source of truth while the Settings page is open. We deliberately do
  // NOT re-sync them from `store.preferences` on every change — doing so let a
  // late-arriving save response clobber the hue the user is actively dragging.

  useEffect(() => {
    fetch("/api/v1/session")
      .then((res) => res.json())
      .then((data) => {
        const userData = data.data?.user;
        if (userData) {
          setUser(userData);
          setNameValue(userData.name ?? "");
        }
      })
      .catch((error) => {
        clientLogger.error("Settings session load failed", { page: "settings", error });
        // silently fail — profile will show fallback
      });
  }, []);

  // Derive a local success flag for the profile form so we can offer a
  // "Done" button that closes the panel without triggering cascading renders.
  const profileSuccess = profileState.ok;

  // Switch between Light and Dark: apply instantly (keeping the accent), then
  // persist server-side so reloads and other devices restore it.
  const setNextTheme = (id: ThemeId) => {
    clientLogger.info("Theme changed", { page: "settings", theme: id });
    setTheme(id);
    applyAppearance(id, accent);
    store.setPreferences({ theme: id });
  };

  const setNextAccent = (hue: number) => {
    applyAccent(hue);
    commitAccent(hue);
  };

  // Apply an accent hue to the document immediately. Cheap (DOM + localStorage
  // only) so it can run on every drag tick for instant visual feedback.
  const applyAccent = (hue: number) => {
    setAccent(hue);
    applyAppearance(theme, hue);
  };

  // Persist the accent hue to the backend, debounced. A drag or a burst of
  // arrow-key presses produces a single trailing save once the user settles,
  // so rapid in-flight saves can never race and bounce the value back (and the
  // re-renders they trigger can't interrupt page transitions).
  const commitAccent = (hue: number) => {
    if (accentSaveTimer.current) clearTimeout(accentSaveTimer.current);
    accentSaveTimer.current = setTimeout(() => {
      clientLogger.info("Accent changed", { page: "settings", accentHue: hue });
      store.setPreferences({ accentHue: hue });
    }, 250);
  };

  // Trigger a download of the authoritative server-side backup. We hit the
  // export endpoint (which builds the file from the database) rather than
  // serialising the in-memory store, so the saved file is always complete.
  const exportJson = () => {
    clientLogger.info("Data export started", { page: "settings", habitCount: store.habits.length });
    const link = document.createElement("a");
    link.href = "/api/v1/export";
    // The endpoint sets Content-Disposition, but naming the anchor helps too.
    link.download = "atomicly-backup.json";
    link.click();
  };

  // When the user picks a file, read it as text and stage it for confirmation
  // (we never import without an explicit second click, since it writes data).
  const onImportFileChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;
    file
      .text()
      .then((text) => setPendingImport({ name: file.name, text }))
      .catch((error) => {
        clientLogger.error("Backup file read failed", { page: "settings", error });
        store.showToast("Could not read that file");
      });
  };

  // Confirmed: send the file to the server action. On success we reload so the
  // freshly-restored data is loaded into the store from the server snapshot.
  const confirmImport = () => {
    if (!pendingImport) return;
    const text = pendingImport.text;
    clientLogger.info("Data import submitted", { page: "settings" });
    startImport(async () => {
      const result = await importDataAction(text);
      setPendingImport(null);
      store.showToast(result.message);
      if (result.ok) {
        // The store seeds from the server snapshot on mount, so a reload is the
        // simplest reliable way to surface imported data everywhere at once.
        window.setTimeout(() => window.location.reload(), 600);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">You</div>
          <h1 className="h1">Settings</h1>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Account — profile name, email, change password. */}
        <SettingGroup title="Account">
          {/* Name row — toggles between read-only and edit mode. */}
          <div className={styles.row}>
            <div className="habit-name">Name</div>
            <div className={`muted mono ${styles.rowValue}`}>{user?.name ?? "—"}</div>
            <div>
              {!editingName ? (
                <motion.button className="btn btn-sm" onClick={() => setEditingName(true)} whileTap={{ scale: 0.97 }}>
                  Edit
                </motion.button>
              ) : (
                <motion.button className="btn btn-sm" onClick={() => setEditingName(false)} whileTap={{ scale: 0.97 }}>
                  Cancel
                </motion.button>
              )}
            </div>
          </div>

          {/* Name edit form — appears when the user clicks Edit. */}
          {editingName && (
            <div className={styles.editFormShell}>
              {!profileSuccess ? (
                <form
                  action={profileAction}
                  className={styles.nameForm}
                  onSubmit={() => clientLogger.info("Profile update submitted", { page: "settings" })}
                >
                  <input
                    className={`input ${styles.smallInputFlex}`}
                    name="name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    placeholder="Your name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                  <motion.button
                    className="btn btn-sm btn-primary"
                    type="submit"
                    disabled={profilePending || nameValue.trim().length < 2}
                    whileTap={{ scale: 0.97 }}
                  >
                    {profilePending ? "Saving..." : "Save"}
                  </motion.button>
                </form>
              ) : (
                <div className={styles.successRow}>
                  <span className={styles.successText}>Profile updated.</span>
                  <motion.button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setEditingName(false);
                      setUser((prev) => (prev ? { ...prev, name: nameValue } : prev));
                      store.showToast("Profile updated");
                    }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Done
                  </motion.button>
                </div>
              )}
              {!profileSuccess && profileState.message && (
                <div className={`muted ${styles.formError}`}>{profileState.message}</div>
              )}
            </div>
          )}

          {/* Email row — always read-only. */}
          <SettingRow label="Email" value={user?.email ?? "—"} />

          {/* Change Password row — toggles a form when clicked. */}
          <div className={styles.row}>
            <div className="habit-name">Password</div>
            <div className={`muted mono ${styles.rowValue}`}>••••••••</div>
            <div>
              {!changingPassword ? (
                <motion.button className="btn btn-sm" onClick={() => setChangingPassword(true)} whileTap={{ scale: 0.97 }}>
                  Change
                </motion.button>
              ) : passwordChanged ? null : (
                <motion.button className="btn btn-sm" onClick={() => setChangingPassword(false)} whileTap={{ scale: 0.97 }}>
                  Cancel
                </motion.button>
              )}
            </div>
          </div>

          {/* Password change form — appears when the user clicks Change.
              Rendered only while open and unmounted on close, so each reopen
              starts from a fresh, empty form (fixes the old "change once" bug). */}
          {changingPassword && (
            <ChangePasswordForm
              onSuccess={() => setPasswordChanged(true)}
              onDone={() => {
                setChangingPassword(false);
                setPasswordChanged(false);
                store.showToast("Password changed");
              }}
            />
          )}

          {/* Sign out of all devices — advances the session revocation cutoff so
              every existing session (this device and any others) is invalidated. */}
          <div className={styles.row}>
            <div className="habit-name">Active sessions</div>
            <div className={`muted ${styles.rowValue}`}>Sign out everywhere</div>
            <div>
              <form action={signOutEverywhereAction}>
                <motion.button
                  className="btn btn-sm"
                  type="submit"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => clientLogger.info("Sign out everywhere submitted", { page: "settings" })}
                >
                  Sign out all devices
                </motion.button>
              </form>
            </div>
          </div>

          {/* Sign out of this device. Lives here (as well as in the desktop
              sidebar) because the mobile shell has no sidebar footer. */}
          <SettingRow label="Sign out" value="End this session">
            <form
              action={logoutAction}
              onSubmit={() => clientLogger.info("Logout submitted", { event: "nav.logout", source: "settings" })}
            >
              <motion.button className="btn btn-sm" type="submit" whileTap={{ scale: 0.97 }}>
                Sign out
              </motion.button>
            </form>
          </SettingRow>
        </SettingGroup>

        {/* Identity — the "who you're becoming" statements. It's no longer a
            top-level nav item (ADR-0003), so Settings links to it. */}
        <SettingGroup title="Identity">
          <SettingRow label="Your identity" value="Who you're becoming">
            <Link href="/identity" className="btn btn-sm">
              Open identity
            </Link>
          </SettingRow>
        </SettingGroup>

        <SettingGroup title="Appearance">
          {/* Theme — Light or Dark (ADR-0003). Retired decorative themes are
              mapped onto these two by lib/themes.ts. */}
          <SettingRow label="Theme" value={theme === "dark" ? "Dark" : "Light"}>
            <div className={styles.optionRow} role="group" aria-label="Theme">
              {THEMES.map((option) => {
                const selected = theme === option.id;
                const Icon = option.id === "dark" ? IconMoon : IconSun;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    className={`btn btn-sm ${selected ? "btn-primary" : ""}`}
                    aria-pressed={selected}
                    onClick={() => setNextTheme(option.id)}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon className={styles.iconSm} aria-hidden="true" />
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </SettingRow>

          <SettingRow label="Accent" value={ACCENTS.find((item) => item.hue === accent)?.name ?? "Custom"}>
            <div className={styles.optionRow}>
              {ACCENTS.map((item) => (
                <motion.button
                  key={item.hue}
                  className={`btn btn-sm ${accent === item.hue ? "btn-primary" : ""}`}
                  onClick={() => setNextAccent(item.hue)}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Hue flows in as --hue so .swatch can stay generic. */}
                  <span className={styles.swatch} style={{ ["--hue" as string]: item.hue }} />
                  {item.name}
                </motion.button>
              ))}
            </div>
          </SettingRow>

          {/* Custom accent — drag the spectrum to pick any hue. Applied live as
              you drag; persisted once the interaction settles. */}
          <SettingRow label="Custom hue" value={`${accent}°`}>
            <HuePicker
              hue={accent}
              onChange={applyAccent}
              onCommit={commitAccent}
              ariaLabel="Custom accent hue"
            />
          </SettingRow>
        </SettingGroup>

        <SettingGroup title="Data">
          <SettingRow label="Export" value={`${store.habits.length} habits`}>
            <motion.button className="btn btn-sm" onClick={exportJson} whileTap={{ scale: 0.97 }}>
              Download JSON
            </motion.button>
          </SettingRow>

          {/* Import — restore a previously downloaded backup. Merge-only: it
              adds or refreshes data but never deletes what you already have. */}
          <SettingRow label="Import" value="Restore a backup">
            {/* Hidden picker, opened by the visible button below. */}
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={onImportFileChosen}
              className={styles.hiddenFileInput}
            />
            <motion.button
              className="btn btn-sm"
              onClick={() => importInputRef.current?.click()}
              disabled={importPending}
              whileTap={{ scale: 0.97 }}
            >
              Choose file
            </motion.button>
          </SettingRow>

          {/* Confirmation step — shown only after a file is chosen. */}
          {pendingImport && (
            <div className={styles.editFormShell}>
              <div className={`muted ${styles.importHint}`}>
                Merge <strong>{pendingImport.name}</strong> into your account? This adds or updates
                data and never deletes anything.
              </div>
              <div className={styles.formActions}>
                <motion.button
                  className="btn btn-sm btn-primary"
                  onClick={confirmImport}
                  disabled={importPending}
                  whileTap={{ scale: 0.97 }}
                >
                  {importPending ? "Importing..." : "Import"}
                </motion.button>
                <motion.button
                  className="btn btn-sm"
                  onClick={() => setPendingImport(null)}
                  disabled={importPending}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
              </div>
            </div>
          )}
        </SettingGroup>
      </div>
    </motion.div>
  );
}

/** SettingGroup — card wrapper for a section with a small uppercase header. */
function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className={styles.groupHeader}>
        <div className="eyebrow">{title}</div>
      </div>
      {children}
    </section>
  );
}

/** SettingRow — label + value + action row used inside a SettingGroup. */
function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.row}>
      <div className="habit-name">{label}</div>
      <div className={`muted mono ${styles.rowValue}`}>{value}</div>
      <div>{children}</div>
    </div>
  );
}
