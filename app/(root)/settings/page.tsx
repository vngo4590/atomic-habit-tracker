"use client";

import { motion } from "framer-motion";
import { useActionState, useEffect, useRef, useState } from "react";

import { IconMoon, IconSun } from "@/components/Icons";
import { HuePicker } from "@/components/HuePicker";
import { useStoreContext } from "@/components/StoreProvider";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";
import { applyAppearance, readStoredVariant } from "@/lib/appearance";
import { clientLogger } from "@/lib/logger-client";
import { THEMES, getTheme, isThemeVariantId } from "@/lib/themes";

import styles from "./page.module.css";

interface SessionUser {
  name: string | null;
  email: string | null;
}

const ACCENTS = [
  { name: "Ochre", hue: 60 },
  { name: "Sage", hue: 145 },
  { name: "Slate", hue: 240 },
  { name: "Plum", hue: 340 },
];

type Theme = "light" | "dark";

/**
 * SettingsPage — three groups: Account (profile name + email + change
 * password), Appearance (theme + accent), and Data (export JSON).
 */
export default function SettingsPage() {
  const store = useStoreContext();
  const [theme, setTheme] = useState<Theme>(store.preferences.theme);
  const [accent, setAccent] = useState(store.preferences.accentHue);
  // The named theme variant (Glass/Neon/...) is stored only in the browser.
  // Undefined means "use the plain light/dark look for the current base mode".
  const [variant, setVariant] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Profile name editing state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);

  // Trailing-debounce timer for persisting accent-hue changes (see commitAccent).
  const accentSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (accentSaveTimer.current) clearTimeout(accentSaveTimer.current);
  }, []);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "settings" });
  }, []);

  // Hydrate the selected theme variant from the browser mirror on mount so the
  // gallery highlights whatever the user last picked.
  useEffect(() => {
    const stored = readStoredVariant();
    if (isThemeVariantId(stored)) {
      window.queueMicrotask(() => setVariant(stored));
    }
  }, []);

  // Server action states (React 19 useActionState)
  const [profileState, profileAction, profilePending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    { ok: false, message: "" },
  );
  const [passwordState, passwordAction, passwordPending] = useActionState<ProfileFormState, FormData>(
    changePasswordAction,
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
  const passwordSuccess = passwordState.ok;

  // The id of the currently active look: the chosen variant if any, otherwise
  // the plain light/dark theme (whose ids double as variant ids).
  const selectedThemeId = isThemeVariantId(variant) ? variant : theme;

  const setNextVariant = (id: string) => {
    const option = getTheme(id);
    clientLogger.info("Theme changed", { page: "settings", theme: option.id });
    setVariant(option.id);
    setTheme(option.base);
    // Apply the variant's base light/dark mode plus the variant itself, keeping
    // the current accent. applyAppearance persists the variant to localStorage.
    applyAppearance(option.base, accent, option.id);
    // Persist the resolved base mode server-side so reloads restore it.
    store.setPreferences({ theme: option.base });
  };

  const setNextAccent = (hue: number) => {
    applyAccent(hue);
    commitAccent(hue);
  };

  // Apply an accent hue to the document immediately. Cheap (DOM + localStorage
  // only) so it can run on every drag tick for instant visual feedback.
  const applyAccent = (hue: number) => {
    setAccent(hue);
    // Re-apply with the active variant so changing the accent never drops the
    // user's chosen theme.
    applyAppearance(theme, hue, isThemeVariantId(variant) ? variant : undefined);
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

  // Build a JSON blob with the user's data and trigger a download.
  const exportJson = () => {
    clientLogger.info("Data export started", { page: "settings", habitCount: store.habits.length });
    const payload = JSON.stringify(
      {
        habits: store.habits,
        journal: store.journal,
        identity: store.identity,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "atomic-habits-export.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
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
              ) : (
                <motion.button className="btn btn-sm" onClick={() => setChangingPassword(false)} whileTap={{ scale: 0.97 }}>
                  Cancel
                </motion.button>
              )}
            </div>
          </div>

          {/* Password change form — appears when the user clicks Change. */}
          {changingPassword && (
            <div className={styles.editFormShell}>
              {!passwordSuccess ? (
                <form
                  action={passwordAction}
                  className={styles.passwordForm}
                  onSubmit={() => clientLogger.info("Password change submitted", { page: "settings" })}
                >
                  <label>
                    <span className="field-label">Current password</span>
                    <input
                      className={`input ${styles.smallInput}`}
                      name="currentPassword"
                      type="password"
                      required
                      minLength={8}
                    />
                  </label>
                  <label>
                    <span className="field-label">New password</span>
                    <input
                      className={`input ${styles.smallInput}`}
                      name="newPassword"
                      type="password"
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
                    onClick={() => {
                      setChangingPassword(false);
                      store.showToast("Password changed");
                    }}
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
          )}
        </SettingGroup>

        <SettingGroup title="Appearance">
          <div className={styles.appearanceBlock}>
            <span className="field-label">Theme</span>
            {/* Theme gallery — one card per look in the registry. Selecting a
                card applies its base mode + variant + signature click effect. */}
            <div className={styles.themeGallery} role="group" aria-label="Theme">
              {THEMES.map((option) => {
                const selected = selectedThemeId === option.id;
                const BaseIcon = option.base === "dark" ? IconMoon : IconSun;
                return (
                  <motion.button
                    key={option.id}
                    type="button"
                    className={`${styles.themeCard} ${selected ? styles.themeCardSelected : ""}`}
                    aria-pressed={selected}
                    onClick={() => setNextVariant(option.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {/* Static preview gradient — per-theme data, so inline vars. */}
                    <span
                      className={styles.themeSwatch}
                      style={{
                        ["--swatch-from" as string]: option.swatch.from,
                        ["--swatch-to" as string]: option.swatch.to,
                      }}
                    />
                    <span className={styles.themeMeta}>
                      <span className={styles.themeLabel}>
                        <BaseIcon className={styles.iconSm} /> {option.label}
                      </span>
                      <span className={styles.themeDesc}>{option.description}</span>
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

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
