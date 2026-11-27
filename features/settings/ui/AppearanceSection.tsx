"use client";

import { Check, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { HuePicker } from "@/components/HuePicker";
import { useStoreContext } from "@/components/StoreProvider";
import { applyAppearance } from "@/lib/appearance";
import { clientLogger } from "@/lib/logger-client";
import { THEMES, type ThemeId } from "@/lib/themes";

import { SettingRow, SettingsSection } from "./SettingsSection";
import styles from "./AppearanceSection.module.css";

/** Accent presets — each is an OKLCH hue fed to `--accent-hue`. Sage (160)
 *  is the design-system default; the others are calm alternates. */
export const ACCENTS = [
  { name: "Sage", hue: 160 },
  { name: "Ochre", hue: 60 },
  { name: "Slate", hue: 240 },
  { name: "Plum", hue: 340 },
] as const;

/** How long the accent must settle before it's persisted (drag/arrow bursts). */
const ACCENT_SAVE_DELAY_MS = 250;

/**
 * AppearanceSection — Light/Dark theme and the accent hue (presets + a custom
 * spectrum). Changes apply instantly; persistence is debounced for the hue so
 * rapid in-flight saves can never race and bounce the value back.
 *
 * Local `theme`/`accent` are seeded from the store once and stay the source of
 * truth while the page is open — re-syncing from the store let a late save
 * response clobber the hue the user was actively dragging.
 */
export function AppearanceSection() {
  const store = useStoreContext();
  const [theme, setTheme] = useState<ThemeId>(store.preferences.theme);
  const [accent, setAccent] = useState(store.preferences.accentHue);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );

  const chooseTheme = (id: ThemeId) => {
    if (id === theme) return;
    clientLogger.info("Theme changed", { page: "settings", theme: id });
    setTheme(id);
    applyAppearance(id, accent);
    store.setPreferences({ theme: id });
    store.showToast(id === "dark" ? "Dark theme on" : "Light theme on");
  };

  // Cheap (DOM + localStorage only) so it can run on every drag tick.
  const applyAccent = (hue: number) => {
    setAccent(hue);
    applyAppearance(theme, hue);
  };

  // Persist once the interaction settles: one trailing save per drag/burst.
  const commitAccent = (hue: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      clientLogger.info("Accent changed", { page: "settings", accentHue: hue });
      store.setPreferences({ accentHue: hue });
      store.showToast("Accent saved");
    }, ACCENT_SAVE_DELAY_MS);
  };

  const preset = ACCENTS.find((item) => item.hue === accent);

  return (
    <SettingsSection id="appearance" title="Appearance" description="Make Atomicly comfortable to look at, day or night.">
      <SettingRow
        label="Theme"
        value={theme === "dark" ? "Dark" : "Light"}
        action={
          <div className={styles.segmented} role="group" aria-label="Theme">
            {THEMES.map((option) => {
              const selected = theme === option.id;
              const Icon = option.id === "dark" ? Moon : Sun;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={styles.segment}
                  aria-pressed={selected}
                  onClick={() => chooseTheme(option.id)}
                >
                  <Icon aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      />

      <SettingRow label="Accent colour" value={preset?.name ?? `Custom · ${accent}°`}>
        <div className={styles.swatches} role="group" aria-label="Accent colour">
          {ACCENTS.map((item) => {
            const selected = accent === item.hue;
            return (
              <button
                key={item.hue}
                type="button"
                className={styles.swatchButton}
                aria-pressed={selected}
                onClick={() => {
                  applyAccent(item.hue);
                  commitAccent(item.hue);
                }}
              >
                {/* Per-option hue flows in as --hue so .swatch stays generic. */}
                <span className={styles.swatch} style={{ ["--hue" as string]: item.hue }} aria-hidden="true">
                  {selected ? <Check /> : null}
                </span>
                {item.name}
              </button>
            );
          })}
        </div>
        <div className={styles.custom}>
          <p className={styles.customLabel}>Or pick any hue</p>
          <HuePicker hue={accent} onChange={applyAccent} onCommit={commitAccent} ariaLabel="Custom accent hue" />
        </div>
      </SettingRow>
    </SettingsSection>
  );
}
