"use client";

import { motion } from "framer-motion";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useStoreContext } from "@/components/StoreProvider";
import { formatScheduleLabel } from "@/lib/schedule";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const PRESETS = {
  daily: { label: "Every day", days: [...DAYS] },
  weekdays: { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  weekends: { label: "Weekends", days: ["Sun", "Sat"] },
  three: { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
  custom: { label: "Custom", days: [] },
} as const;
const TIME_BLOCKS = ["Morning", "Afternoon", "Evening"] as const;
const CUSTOM_TIME_BLOCK = "Custom";

type Preset = keyof typeof PRESETS;

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
    <span style={{ display: "inline-block", position: "relative", verticalAlign: "middle", margin: "0 4px", width: textWidth, maxWidth }}>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxChars}
        style={{
          width: "100%",
          height: 38,
          fontFamily: "var(--serif)",
          fontSize: 22,
          fontStyle: "italic",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          hyphens: "auto",
        }}
      />
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          visibility: "hidden",
          whiteSpace: "pre",
          fontFamily: "var(--serif)",
          fontSize: 22,
          fontStyle: "italic",
          padding: "0 12px",
          pointerEvents: "none",
          maxWidth,
        }}
      >
        {text}
      </span>
    </span>
  );
}

function MLChip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button className="chip" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

export default function NewHabitPage() {
  const router = useRouter();
  const { habits, identity: profile, addHabit } = useStoreContext();
  const [name, setName] = useState("");
  const [time, setTime] = useState("Morning");
  const [location, setLocation] = useState("in the kitchen");
  const [identity, setIdentity] = useState("");
  const [preset, setPreset] = useState<Preset>("daily");
  const [customDays, setCustomDays] = useState<string[]>([]);

  const existingIdentities = useMemo(() => {
    const values = new Set<string>([...profile.values, ...habits.map((habit) => habit.identity)].filter(Boolean));
    return Array.from(values);
  }, [habits, profile.values]);

  const activeDays: readonly string[] = preset === "custom" ? customDays : PRESETS[preset].days;
  const schedule = preset === "custom"
    ? formatScheduleLabel(customDays.join(", ") || "Custom")
    : formatScheduleLabel(PRESETS[preset].label);
  const selectedTimeBlock = TIME_BLOCKS.some((item) => item === time) ? time : CUSTOM_TIME_BLOCK;

  const toggleDay = (day: string) => {
    setPreset("custom");
    setCustomDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const finalize = () => {
    if (!name.trim() || !identity.trim()) {
      return;
    }

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
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Create</div>
          <h1 className="h1">Design a <em>small vote</em></h1>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1.8 }}>
          I will
          <MLInput value={name} onChange={setName} placeholder="read 2 pages" wide />
          ,
          <MLInput value={time} onChange={setTime} placeholder="Morning" />
          <MLInput value={location} onChange={setLocation} placeholder="at my desk" wide />
          , so I can become
          <MLInput value={identity} onChange={setIdentity} placeholder="a reader" wide />
          .
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
          {existingIdentities.map((item) => (
            <MLChip key={item} onClick={() => setIdentity(item)}>
              {item}
            </MLChip>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Schedule</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {(Object.keys(PRESETS) as Preset[]).map((key) => (
              <motion.button key={key} className={`chip ${preset === key ? "active" : ""}`} type="button" onClick={() => setPreset(key)} whileTap={{ scale: 0.95 }}>
                {PRESETS[key].label}
              </motion.button>
            ))}
          </div>
          {/* Day-of-week toggles. Uses a CSS class instead of inline grid styles so
              the mobile layout override does not force each day onto its own row. */}
          <div className="day-grid" style={{ marginTop: 16 }}>
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
          <label className="field-label" style={{ marginTop: 18 }}>
            Time block
          </label>
          <select
            className="input"
            value={selectedTimeBlock}
            onChange={(event) => {
              const next = event.target.value;
              setTime(next === CUSTOM_TIME_BLOCK ? "" : next);
            }}
          >
            {TIME_BLOCKS.map((block) => (
              <option key={block}>{block}</option>
            ))}
            <option>{CUSTOM_TIME_BLOCK}</option>
          </select>
          {selectedTimeBlock === CUSTOM_TIME_BLOCK && (
            <input
              className="input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              placeholder="After school, lunch break, commute..."
              style={{ marginTop: 10 }}
            />
          )}
        </section>

      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
        <motion.button className="btn" type="button" onClick={() => router.push("/habits")} whileTap={{ scale: 0.97 }}>Cancel</motion.button>
        <motion.button className="btn btn-primary" type="button" disabled={!name.trim() || !identity.trim()} onClick={finalize} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
          Create habit
        </motion.button>
      </div>
    </motion.div>
  );
}
