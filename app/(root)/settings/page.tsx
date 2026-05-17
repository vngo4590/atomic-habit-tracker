"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance } from "@/lib/appearance";

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
        }
      })
      .catch(() => {
        // silently fail — profile will show fallback
      });
  }, []);

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
        <SettingGroup title="Account">
          <SettingRow label="Profile" value={user?.name ?? user?.email ?? "—"} />
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
