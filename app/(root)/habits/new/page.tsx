"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useStoreContext } from "@/components/StoreProvider";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const PRESETS = {
  daily: { label: "Every day", days: [...DAYS] },
  weekdays: { label: "Weekdays", days: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  weekends: { label: "Weekends", days: ["Sun", "Sat"] },
  three: { label: "3x a week", days: ["Mon", "Wed", "Fri"] },
  custom: { label: "Custom", days: [] },
} as const;

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
  return (
    <input
      className="input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      style={{
        display: "inline-block",
        width: wide ? 220 : 150,
        height: 38,
        margin: "0 6px",
        fontFamily: "var(--serif)",
        fontSize: 22,
        fontStyle: "italic",
      }}
    />
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
  const [showStack, setShowStack] = useState(false);
  const [stack, setStack] = useState("");
  const [twoMin, setTwoMin] = useState("");

  const existingIdentities = useMemo(() => {
    const values = new Set<string>([...profile.values, ...habits.map((habit) => habit.identity)].filter(Boolean));
    return Array.from(values);
  }, [habits, profile.values]);

  const activeDays: readonly string[] = preset === "custom" ? customDays : PRESETS[preset].days;
  const schedule = preset === "custom"
    ? customDays.join(", ") || "Custom"
    : PRESETS[preset].label;

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
      stack,
      cue: stack.trim()
        ? `After I ${stack.trim()}, I will ${cleanName.toLowerCase()}.`
        : `At ${cleanTime.toLowerCase()} ${cleanLocation}, I will ${cleanName.toLowerCase()}.`,
      response: cleanName,
      twoMin: twoMin.trim() || `Do ${cleanName.toLowerCase()} for two minutes.`,
      craving: `Become ${identity.trim()}.`,
      reward: "A visible vote for the person I am becoming.",
      environment: cleanLocation,
    });
    router.push("/habits");
  };

  return (
    <div className="fade-up">
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <section className="card card-pad">
          <div className="eyebrow">Schedule</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {(Object.keys(PRESETS) as Preset[]).map((key) => (
              <button key={key} className={`chip ${preset === key ? "active" : ""}`} type="button" onClick={() => setPreset(key)}>
                {PRESETS[key].label}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 16 }}>
            {DAYS.map((day) => (
              <button
                key={day}
                className={`btn btn-sm ${activeDays.includes(day) ? "btn-primary" : ""}`}
                type="button"
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
          <label className="field-label" style={{ marginTop: 18 }}>
            Time block
          </label>
          <select className="input" value={time} onChange={(event) => setTime(event.target.value)}>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </section>

        <section className="card card-pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="eyebrow">Habit stack</div>
              <h2 className="h3" style={{ marginTop: 4 }}>Attach it to a rail</h2>
            </div>
            {!showStack && (
              <button className="btn btn-sm" type="button" onClick={() => setShowStack(true)}>
                + Add
              </button>
            )}
          </div>
          {showStack && (
            <div style={{ marginTop: 16 }}>
              <label className="field-label">After I...</label>
              <input className="input" value={stack} onChange={(event) => setStack(event.target.value)} placeholder="pour coffee" />
              <label className="field-label" style={{ marginTop: 14 }}>Quick pick</label>
              <select className="input" value="" onChange={(event) => setStack(event.target.value.toLowerCase())}>
                <option value="">Choose an existing habit</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.name}>
                    {habit.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="field-label" style={{ marginTop: 18 }}>Two-minute version</label>
          <input className="input" value={twoMin} onChange={(event) => setTwoMin(event.target.value)} placeholder="Open the book and read one paragraph" />
        </section>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 }}>
        <button className="btn" type="button" onClick={() => router.push("/habits")}>Cancel</button>
        <button className="btn btn-primary" type="button" disabled={!name.trim() || !identity.trim()} onClick={finalize}>
          Create habit
        </button>
      </div>
    </div>
  );
}
