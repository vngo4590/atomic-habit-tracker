"use client";

import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/Icons";
import { useStoreContext } from "@/components/StoreProvider";

const THEME_KEY = "atomicly:theme";
const ACCENT_KEY = "atomicly:accent";
const ACCENTS = [
  { name: "Ochre", hue: 60 },
  { name: "Sage", hue: 145 },
  { name: "Slate", hue: 240 },
  { name: "Plum", hue: 340 },
];

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_KEY, theme);
}

function applyAccent(hue: number) {
  document.documentElement.style.setProperty("--accent", `oklch(62% 0.13 ${hue})`);
  document.documentElement.style.setProperty("--accent-2", `oklch(72% 0.10 ${hue})`);
  document.documentElement.style.setProperty("--accent-soft", `oklch(92% 0.04 ${hue})`);
  window.localStorage.setItem(ACCENT_KEY, String(hue));
}

export default function SettingsPage() {
  const store = useStoreContext();
  const [theme, setTheme] = useState<Theme>("light");
  const [accent, setAccent] = useState(60);
  const [notifications, setNotifications] = useState({
    reminders: true,
    review: true,
    accountability: false,
  });

  useEffect(() => {
    window.queueMicrotask(() => {
      const savedTheme = window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
      const savedAccent = Number(window.localStorage.getItem(ACCENT_KEY) ?? 60);
      setTheme(savedTheme);
      setAccent(savedAccent);
      applyTheme(savedTheme);
      applyAccent(savedAccent);
    });
  }, []);

  const setNextTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const setNextAccent = (hue: number) => {
    setAccent(hue);
    applyAccent(hue);
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

  const resetData = () => {
    window.localStorage.removeItem("atomicly:store");
    window.localStorage.removeItem("atomicly:lessons");
    window.localStorage.removeItem("atomicly:formed");
    window.location.reload();
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Become</div>
          <h1 className="h1">Settings</h1>
        </div>
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        <SettingGroup title="Account">
          <SettingRow label="Profile" value="Alex Rivera" />
          <SettingRow label="Storage" value="This browser" />
        </SettingGroup>

        <SettingGroup title="Appearance">
          <SettingRow label="Theme" value={theme}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn btn-sm ${theme === "light" ? "btn-primary" : ""}`} onClick={() => setNextTheme("light")}><IconSun style={{ width: 13, height: 13 }} /> Light</button>
              <button className={`btn btn-sm ${theme === "dark" ? "btn-primary" : ""}`} onClick={() => setNextTheme("dark")}><IconMoon style={{ width: 13, height: 13 }} /> Dark</button>
            </div>
          </SettingRow>
          <SettingRow label="Accent" value={ACCENTS.find((item) => item.hue === accent)?.name ?? "Custom"}>
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENTS.map((item) => (
                <button key={item.hue} className={`btn btn-sm ${accent === item.hue ? "btn-primary" : ""}`} onClick={() => setNextAccent(item.hue)}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: `oklch(62% 0.13 ${item.hue})`, display: "inline-block" }} />
                  {item.name}
                </button>
              ))}
            </div>
          </SettingRow>
        </SettingGroup>

        <SettingGroup title="Notifications">
          {Object.entries({
            reminders: "Daily habit reminders",
            review: "Weekly review nudge",
            accountability: "Accountability contract alerts",
          }).map(([key, label]) => (
            <SettingRow key={key} label={label} value={notifications[key as keyof typeof notifications] ? "On" : "Off"}>
              <button
                className={`chip ${notifications[key as keyof typeof notifications] ? "active" : ""}`}
                onClick={() => setNotifications((current) => ({ ...current, [key]: !current[key as keyof typeof notifications] }))}
              >
                {notifications[key as keyof typeof notifications] ? "On" : "Off"}
              </button>
            </SettingRow>
          ))}
        </SettingGroup>

        <SettingGroup title="Data">
          <SettingRow label="Export" value={`${store.habits.length} habits`}>
            <button className="btn btn-sm" onClick={exportJson}>Download JSON</button>
          </SettingRow>
          <SettingRow label="Reset" value="Clear browser data">
            <button className="btn btn-sm" onClick={resetData}>Reset...</button>
          </SettingRow>
        </SettingGroup>
      </div>
    </div>
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
