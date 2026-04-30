"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CompletionRing } from "@/components/CompletionRing";
import { HabitRow } from "@/components/HabitRow";
import { IconPlus, IconSearch } from "@/components/Icons";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { useStoreContext } from "@/components/StoreProvider";
import { dateAdd, fmt, todayKey } from "@/lib/helpers";
import type { Habit } from "@/lib/types";

const TIMES = ["Morning", "Afternoon", "Evening"] as const;

export default function TodayPage() {
  const router = useRouter();
  const store = useStoreContext();
  const { habits, toggleHabit, logCheckIn, streak } = store;
  const today = todayKey();
  const [moodHabit, setMoodHabit] = useState<Habit | null>(null);
  const doneToday = habits.filter((habit) => habit.history[today]).length;
  const pct = habits.length ? Math.round((doneToday / habits.length) * 100) : 0;
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Late night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const groups = useMemo(() => {
    const grouped: Record<(typeof TIMES)[number], Habit[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    habits.forEach((habit) => {
      const time = TIMES.includes(habit.time as (typeof TIMES)[number])
        ? (habit.time as (typeof TIMES)[number])
        : "Morning";
      grouped[time].push(habit);
    });
    return grouped;
  }, [habits]);

  const last14 = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const key = dateAdd(today, -i);
      const done = habits.filter((habit) => habit.history[key]).length;
      days.push({ key, done, total: habits.length });
    }
    return days;
  }, [habits, today]);

  const votes = useMemo(() => {
    const tally = new Map<string, number>();
    habits.forEach((habit) => {
      if (habit.history[today]) {
        tally.set(habit.identity, (tally.get(habit.identity) ?? 0) + 1);
      }
    });
    return Array.from(tally.entries());
  }, [habits, today]);

  const topHabit = [...habits].sort((a, b) => streak(b) - streak(a))[0];

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">{greet} · {fmt.long(today)}</div>
          <h1 className="h1">
            {doneToday === habits.length && habits.length > 0 ? (
              <>A clean sweep. <em>Vote cast.</em></>
            ) : doneToday === 0 ? (
              <>Start with <em>one small thing.</em></>
            ) : (
              <>You&apos;re <em>{pct}%</em> through today.</>
            )}
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-sm">
            <IconSearch style={{ width: 13, height: 13 }} />
            Search
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => router.push("/habits/new")}>
            <IconPlus style={{ width: 13, height: 13 }} />
            New habit
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr 1fr", gap: 18, marginBottom: 32 }}>
        <div className="card card-pad" style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <CompletionRing pct={pct} />
          <div>
            <div className="eyebrow">Today</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1, marginTop: 4 }}>
              {doneToday}<span style={{ color: "var(--ink-3)" }}>/{habits.length}</span>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {doneToday === 0 ? "Nothing checked yet" : doneToday === habits.length ? "All done - well done." : `${habits.length - doneToday} habits remaining`}
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <div className="eyebrow">Longest active streak</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
            <div style={{ fontFamily: "var(--serif)", fontSize: 32, lineHeight: 1 }}>
              {Math.max(0, ...habits.map(streak))}
            </div>
            <div className="muted mono" style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>days</div>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {topHabit ? `${topHabit.name} - keep it warm.` : "-"}
          </div>
        </div>

        <div className="card card-pad">
          <div className="eyebrow">Last 14 days</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48, marginTop: 10 }}>
            {last14.map((day, index) => {
              const height = day.total ? (day.done / day.total) * 100 : 0;
              const isToday = index === last14.length - 1;
              return (
                <div key={day.key} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      height: `${Math.max(4, height)}%`,
                      background: isToday ? "var(--accent)" : height > 50 ? "var(--ink-2)" : "var(--rule-strong)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="muted mono" style={{ fontSize: 10, letterSpacing: "0.06em", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span>2 WEEKS AGO</span><span>TODAY</span>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 32, background: "var(--bg-sunk)", borderStyle: "dashed" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, alignItems: "center" }}>
          <div>
            <div className="eyebrow">Today, you&apos;re voting for</div>
            <div style={{ fontFamily: "var(--serif)", fontSize: 22, fontStyle: "italic", marginTop: 6, color: "var(--ink-2)", lineHeight: 1.4 }}>
              {store.identity.statement}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Today&apos;s votes by identity</div>
            {votes.length === 0 ? (
              <div className="muted" style={{ fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 14 }}>
                No votes cast yet - check off a habit below.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {votes.map(([identity, count]) => (
                  <div key={identity} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13 }}>
                    <span style={{ fontFamily: "var(--serif)", fontStyle: "italic" }}>I am <span style={{ color: "var(--accent)" }}>{identity}</span></span>
                    <span className="mono" style={{ fontSize: 11.5 }}>+{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {TIMES.map((label) => {
        const list = groups[label];
        if (list.length === 0) {
          return null;
        }

        return (
          <section key={label} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 className="h3">{label}</h2>
              <span className="muted mono" style={{ fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {list.filter((habit) => habit.history[today]).length} / {list.length}
              </span>
            </div>
            <div className="card">
              {list.map((habit) => (
                <HabitRow
                  key={habit.id}
                  habit={habit}
                  done={Boolean(habit.history[today])}
                  streak={streak(habit)}
                  onCheck={() => {
                    const wasDone = Boolean(habit.history[today]);
                    toggleHabit(habit.id);
                    if (!wasDone) {
                      setMoodHabit(habit);
                    }
                  }}
                  onOpen={() => router.push(`/habits/${habit.id}`)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {habits.length === 0 && (
        <div className="card card-pad" style={{ textAlign: "center", padding: "42px 20px" }}>
          <div className="eyebrow">No habits yet</div>
          <h2 className="h2" style={{ marginTop: 8 }}>Design your first daily vote.</h2>
          <p className="muted" style={{ margin: "10px auto 18px", maxWidth: 460, lineHeight: 1.5 }}>
            Start with one small behavior tied to a clear identity.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/habits/new")}>
            <IconPlus style={{ width: 13, height: 13 }} />
            Create habit
          </button>
        </div>
      )}

      {moodHabit && (
        <MoodCheckSheet
          habit={moodHabit}
          dateKey={today}
          onClose={() => setMoodHabit(null)}
          onSave={(payload) => logCheckIn(moodHabit.id, payload)}
        />
      )}
    </div>
  );
}
