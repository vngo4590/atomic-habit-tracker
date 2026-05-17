"use client";

import { motion } from "framer-motion";
import { useActionState, useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance } from "@/lib/appearance";
import { changePasswordAction, updateProfileAction } from "@/lib/actions/auth";
import type { ProfileFormState } from "@/lib/actions/auth";

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

export default function SettingsPage() {
  const store = useStoreContext();
  const [theme, setTheme] = useState<Theme>(store.preferences.theme);
  const [accent, setAccent] = useState(store.preferences.accentHue);
  const [user, setUser] = useState<SessionUser | null>(null);

  // Profile name editing state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Password change state
  const [changingPassword, setChangingPassword] = useState(false);

  // Server action states (React 19 useActionState)
  const [profileState, profileAction, profilePending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    { ok: false, message: "" },
  );
  const [passwordState, passwordAction, passwordPending] = useActionState<ProfileFormState, FormData>(
    changePasswordAction,
    { ok: false, message: "" },
  );

  useEffect(() => {
    window.queueMicrotask(() => {
      setTheme(store.preferences.theme);
      setAccent(store.preferences.accentHue);
    });
  }, [store.preferences.accentHue, store.preferences.theme]);

  useEffect(() => {
    fetch("/api/v1/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setNameValue(data.user.name ?? "");
        }
      })
      .catch(() => {
        // silently fail — profile will show fallback
      });
  }, []);

  // Derive a local success flag for the profile form so we can offer a
  // "Done" button that closes the panel without triggering cascading renders.
  const profileSuccess = profileState.ok;
  const passwordSuccess = passwordState.ok;

  const setNextTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyAppearance(nextTheme, accent);
    store.setPreferences({ theme: nextTheme });
  };

  const setNextAccent = (hue: number) => {
    setAccent(hue);
    applyAppearance(theme, hue);
    store.setPreferences({ accentHue: hue });
  };

  const exportJson = () => {
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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Settings</h1>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {/* ------------------------------------------------------------------
            Account section: Profile (editable name), Email (read-only),
            and Change Password.
            ------------------------------------------------------------------ */}
        <SettingGroup title="Account">
          {/* Name row — toggles between read-only and edit mode. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 18, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--rule)" }}>
            <div className="habit-name">Name</div>
            <div className="muted mono" style={{ fontSize: 11, textTransform: "uppercase" }}>
              {user?.name ?? "—"}
            </div>
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
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", background: "var(--bg-sunk)" }}>
              {!profileSuccess ? (
                <form action={profileAction} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <input
                    className="input"
                    name="name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    placeholder="Your name"
                    minLength={2}
                    maxLength={80}
                    required
                    style={{ flex: 1, height: 34, fontSize: 13 }}
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--accent)", fontSize: 13 }}>Profile updated.</span>
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
                <div className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 12, marginTop: 8 }}>
                  {profileState.message}
                </div>
              )}
            </div>
          )}

          {/* Email row — always read-only. */}
          <SettingRow label="Email" value={user?.email ?? "—"} />

          {/* Change Password row — toggles a form when clicked. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 18, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--rule)" }}>
            <div className="habit-name">Password</div>
            <div className="muted mono" style={{ fontSize: 11, textTransform: "uppercase" }}>
              ••••••••
            </div>
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
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", background: "var(--bg-sunk)" }}>
              {!passwordSuccess ? (
                <form action={passwordAction} style={{ display: "grid", gap: 10, maxWidth: 400 }}>
                  <label>
                    <span className="field-label">Current password</span>
                    <input className="input" name="currentPassword" type="password" required minLength={8} style={{ height: 34, fontSize: 13 }} />
                  </label>
                  <label>
                    <span className="field-label">New password</span>
                    <input className="input" name="newPassword" type="password" required minLength={8} style={{ height: 34, fontSize: 13 }} />
                  </label>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--accent)", fontSize: 13 }}>Password changed.</span>
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
                <div className="muted" style={{ color: "oklch(52% 0.18 25)", fontSize: 12, marginTop: 8 }}>
                  {passwordState.message}
                </div>
              )}
            </div>
          )}
        </SettingGroup>

        <SettingGroup title="Appearance">
          <SettingRow label="Theme" value={theme}>
            <div style={{ display: "flex", gap: 8 }}>
              <motion.button className={`btn btn-sm ${theme === "light" ? "btn-primary" : ""}`} onClick={() => setNextTheme("light")} whileTap={{ scale: 0.97 }}><IconSun style={{ width: 13, height: 13 }} /> Light</motion.button>
              <motion.button className={`btn btn-sm ${theme === "dark" ? "btn-primary" : ""}`} onClick={() => setNextTheme("dark")} whileTap={{ scale: 0.97 }}><IconMoon style={{ width: 13, height: 13 }} /> Dark</motion.button>
            </div>
          </SettingRow>
          <SettingRow label="Accent" value={ACCENTS.find((item) => item.hue === accent)?.name ?? "Custom"}>
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENTS.map((item) => (
                <motion.button key={item.hue} className={`btn btn-sm ${accent === item.hue ? "btn-primary" : ""}`} onClick={() => setNextAccent(item.hue)} whileTap={{ scale: 0.97 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: `oklch(62% 0.13 ${item.hue})`, display: "inline-block" }} />
                  {item.name}
                </motion.button>
              ))}
            </div>
          </SettingRow>
        </SettingGroup>

        <SettingGroup title="Data">
          <SettingRow label="Export" value={`${store.habits.length} habits`}>
            <motion.button className="btn btn-sm" onClick={exportJson} whileTap={{ scale: 0.97 }}>Download JSON</motion.button>
          </SettingRow>
        </SettingGroup>
      </div>
    </motion.div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule)", background: "var(--bg-sunk)" }}>
        <div className="eyebrow">{title}</div>
      </div>
      {children}
    </section>
  );
}

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto", gap: 18, alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--rule)" }}>
      <div className="habit-name">{label}</div>
      <div className="muted mono" style={{ fontSize: 11, textTransform: "uppercase" }}>{value}</div>
      <div>{children}</div>
    </div>
  );
}
