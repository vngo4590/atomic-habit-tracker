"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useStoreContext } from "@/components/StoreProvider";
import { formatScheduleLabel } from "@/lib/schedule";

import styles from "./page.module.css";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** Schedule presets. Each maps to a list of weekday tokens. */
const PRESETS = {
  daily: { label: "Every day", days: [...DAYS] },
  weekdays: { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  weekends: { label: "Weekends", days: ["Sun", "Sat"] },
  three: { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
  custom: { label: "Custom", days: [] },
} as const;
type Preset = keyof typeof PRESETS;

/**
 * MLInput — auto-resizing inline input used inside the Mad-Libs sentence.
 *
 * Measures the typed text in a hidden span so the input width matches the
 * content (within min/max bounds). The width is exposed to CSS via the
 * --ml-width and --ml-max-width custom properties so the wrapper stays
 * style-free.
 */
function MLInput({
  value,
  onChange,
  placeholder,
  wide = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  wide?: boolean;
}) {
  const minWidth = wide ? 160 : 110;
  const maxWidth = wide ? 320 : 260;
  const maxChars = 60;
  const text = value || placeholder;
  // Measure the text in a hidden span so the input container grows with content.
  const measureRef = useRef<HTMLSpanElement>(null);
  const [textWidth, setTextWidth] = useState(minWidth);

  useLayoutEffect(() => {
    if (measureRef.current) {
      setTextWidth(Math.min(maxWidth, Math.max(minWidth, measureRef.current.offsetWidth + 24)));
    }
  }, [text, minWidth, maxWidth]);

  return (
    <span
      className={styles.mlWrap}
      style={
        {
          "--ml-width": `${textWidth}px`,
          "--ml-max-width": `${maxWidth}px`,
        } as React.CSSProperties
      }
    >
      <input
        className={`input ${styles.mlInput}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxChars}
      />
      <span ref={measureRef} aria-hidden="true" className={styles.mlMeasure}>
        {text}
      </span>
    </span>
  );
}

/** Small clickable chip that fills in a suggested identity into MLInput. */
function MLChip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button className="chip identity-chip" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * NewHabitPage — the create-habit Mad-Libs builder. Users fill in inline
 * blanks ("I will [name], [time] [location], so I can become [identity]")
 * and pick a schedule. The submit handler synthesises the full habit
 * (cue, response, two-minute, craving, reward) from the four blanks so
 * the user doesn't have to think about the loop on day one.
 */
export default function NewHabitPage() {
  const router = useRouter();
  const { habits, addHabit } = useStoreContext();
  const [name, setName] = useState("");
  const [time, setTime] = useState("Morning");
  const [location, setLocation] = useState("in the kitchen");
  const [identity, setIdentity] = useState("");
  const [preset, setPreset] = useState<Preset>("daily");
  const [customDays, setCustomDays] = useState<string[]>([]);

  // Compute all unique habit identities sorted by frequency (most-used first).
  const allIdentities = useMemo(() => {
    const counts = new Map<string, number>();
    habits.forEach((habit) => {
      if (habit.identity) {
        counts.set(habit.identity, (counts.get(habit.identity) ?? 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => id);
  }, [habits]);

  // Show top 5 by default; when the user types, filter the full list.
  const visibleIdentities = useMemo(() => {
    const query = identity.trim().toLowerCase();
    if (!query) return allIdentities.slice(0, 5);
    return allIdentities.filter((id) => id.toLowerCase().includes(query));
  }, [allIdentities, identity]);

  const activeDays: readonly string[] = preset === "custom" ? customDays : PRESETS[preset].days;
  const schedule =
    preset === "custom"
      ? formatScheduleLabel(customDays.join(", ") || "Custom")
      : formatScheduleLabel(PRESETS[preset].label);

  const toggleDay = (day: string) => {
    setPreset("custom");
    setCustomDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  // Synthesise the full habit record from the four blanks then navigate
  // to the habits list so the user can see their creation.
  const finalize = () => {
    if (!name.trim() || !identity.trim()) return;

    const cleanName = name.trim();
    const cleanLocation = location.trim() || "a consistent place";
    const cleanTime = time.trim() || "Morning";

    addHabit({
      name: cleanName,
      emoji: "•",
      identity: identity.trim(),
      time: cleanTime,
      schedule,
      cue: `At ${cleanTime.toLowerCase()} ${cleanLocation}, I will ${cleanName.toLowerCase()}.`,
      response: cleanName,
      twoMin: `Do ${cleanName.toLowerCase()} for two minutes.`,
      craving: `Become ${identity.trim()}.`,
      reward: "A visible vote for the person I am becoming.",
      environment: cleanLocation,
    });
    router.push("/habits");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="page-header">
        <div>
          <div className="eyebrow">Create</div>
          <h1 className="h1">Design a <em>small vote</em></h1>
        </div>
      </div>

      <div className={`card card-pad ${styles.sentenceCard}`}>
        <div className={styles.sentence}>
          I will
          <MLInput value={name} onChange={setName} placeholder="read 2 pages" wide />
          ,
          <MLInput value={time} onChange={setTime} placeholder="Morning" />
          <MLInput value={location} onChange={setLocation} placeholder="at my desk" wide />
          , so I can become
          <MLInput value={identity} onChange={setIdentity} placeholder="a reader" wide />
          .
        </div>
        <div className={styles.identityChips}>
          {visibleIdentities.map((item) => (
            <MLChip key={item} onClick={() => setIdentity(item)}>
              {item}
            </MLChip>
          ))}
        </div>
      </div>

      <div className={styles.sections}>
        <section className="card card-pad">
          <div className="eyebrow">Schedule</div>
          <div className={styles.presetRow}>
            {(Object.keys(PRESETS) as Preset[]).map((key) => (
              <motion.button
                key={key}
                className={`chip ${preset === key ? "active" : ""}`}
                type="button"
                onClick={() => setPreset(key)}
                whileTap={{ scale: 0.95 }}
              >
                {PRESETS[key].label}
              </motion.button>
            ))}
          </div>
          {/* Day-of-week toggles. Uses the .day-grid global class so the
              mobile layout override does not force each day onto its own row. */}
          <div className={`day-grid ${styles.dayGridSpacer}`}>
            {DAYS.map((day) => (
              <motion.button
                key={day}
                className={`btn btn-sm ${activeDays.includes(day) ? "btn-primary" : ""}`}
                type="button"
                onClick={() => toggleDay(day)}
                whileTap={{ scale: 0.95 }}
              >
                {day}
              </motion.button>
            ))}
          </div>
          {/* Legend so the meaning of the selected vs. unselected day pills
              is explicit. We render miniature pills styled the same way as
              the day buttons so the legend stays correct in both light and
              dark themes (no colour names baked into copy). */}
          <div className={styles.dayLegend} aria-label="Day selector legend">
            <span className={styles.dayLegendItem}>
              <span className={`btn btn-sm btn-primary ${styles.dayLegendSwatch}`} aria-hidden="true" />
              <span className={styles.dayLegendLabel}>Scheduled</span>
            </span>
            <span className={styles.dayLegendItem}>
              <span className={`btn btn-sm ${styles.dayLegendSwatch}`} aria-hidden="true" />
              <span className={styles.dayLegendLabel}>Off</span>
            </span>
          </div>
        </section>
      </div>

      <div className={styles.footer}>
        <motion.button
          className="btn"
          type="button"
          onClick={() => router.push("/habits")}
          whileTap={{ scale: 0.97 }}
        >
          Cancel
        </motion.button>
        <motion.button
          className="btn btn-primary"
          type="button"
          disabled={!name.trim() || !identity.trim()}
          onClick={finalize}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          Create habit
        </motion.button>
      </div>
    </motion.div>
  );
}
