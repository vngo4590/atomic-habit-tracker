"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ContractSheet } from "@/components/ContractSheet";
import { EditableLaw } from "@/components/EditableLaw";
import { EditableLine } from "@/components/EditableLine";
import { HabitJournalStream } from "@/components/HabitJournalStream";
import { HistoryWall } from "@/components/HistoryWall";
import {
  IconBack,
  IconCheck,
} from "@/components/Icons";
import { LoopDiagram } from "@/components/LoopDiagram";
import { MoodChart } from "@/components/MoodChart";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { NotesManager } from "@/components/NotesManager";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";

type Tab = "overview" | "loop" | "journal" | "history" | "notes";

const TABS: Tab[] = ["overview", "loop", "journal", "history", "notes"];

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="muted mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function HabitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStoreContext();
  const [tab, setTab] = useState<Tab>("overview");
  const [showContract, setShowContract] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const today = todayKey();
  const habitId = params.id;
  const habit = store.habits.find((item) => item.id === habitId);

  const stats = useMemo(() => {
    if (!habit) {
      return null;
    }
    return {
      active: store.streak(habit),
      best: store.longestStreak(habit),
      rate: Math.round(store.completionRate(habit) * 100),
      total: Object.keys(habit.history).length,
    };
  }, [habit, store]);

  if (!habit || !stats) {
    return (
      <div className="fade-up">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/habits")}>
          <IconBack /> All habits
        </button>
        <div className="card card-pad" style={{ marginTop: 24 }}>Habit not found.</div>
      </div>
    );
  }

  const doneToday = Boolean(habit.history[today]);

  return (
    <div className="fade-up">
      <button className="btn btn-ghost btn-sm" onClick={() => router.push("/habits")} style={{ marginBottom: 18 }}>
        <IconBack /> All habits
      </button>

      <div className="page-header" style={{ alignItems: "flex-start", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <div className="eyebrow">{habit.schedule} · {habit.time}</div>
            <h1 className="h1" style={{ fontSize: 52 }}>{habit.name}</h1>
            <p className="lede" style={{ marginTop: 14, fontStyle: "italic" }}>
              I am <em style={{ color: "var(--accent)", fontStyle: "normal" }}>{habit.identity}</em>. Each check-in is a vote for that.
            </p>
          </div>
          <button
            className={`btn btn-lg ${doneToday ? "btn-accent" : "btn-primary"}`}
            onClick={() => {
              if (!doneToday) {
                store.toggleHabit(habit.id);
              }
              setShowMood(true);
            }}
          >
            {doneToday ? <><IconCheck style={{ width: 14, height: 14 }} /> Done today · edit</> : "Mark done"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, width: "100%", borderTop: "1px solid var(--rule)", paddingTop: 18 }}>
          <Stat label="Active streak" value={`${stats.active}d`} />
          <Stat label="Best streak" value={`${stats.best}d`} />
          <Stat label="30-day rate" value={`${stats.rate}%`} />
          <Stat label="Total check-ins" value={stats.total} />
        </div>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
          <div className="card card-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
              <h3 className="h3">The 4 laws</h3>
              <span className="muted mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>EDIT INLINE</span>
            </div>
            <EditableLaw label="1. Make it obvious" hint="Cue" value={habit.cue} placeholder="When 7am, after I pour coffee..." onSave={(value) => store.updateHabit(habit.id, { cue: value })} />
            <EditableLaw label="2. Make it attractive" hint="Craving" value={habit.craving} placeholder="To feel curious, calm, strong..." onSave={(value) => store.updateHabit(habit.id, { craving: value })} />
            <EditableLaw label="3. Make it easy" hint="2-minute version" value={habit.twoMin} placeholder="Just open the book. Just put on the shoes." onSave={(value) => store.updateHabit(habit.id, { twoMin: value })} />
            <EditableLaw label="4. Make it satisfying" hint="Reward" value={habit.reward} placeholder="One visible win." onSave={(value) => store.updateHabit(habit.id, { reward: value })} last />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="card card-pad">
              <h3 className="h3" style={{ marginBottom: 8 }}>Environment</h3>
              <EditableLine value={habit.environment} placeholder="Stage your space..." onSave={(value) => store.updateHabit(habit.id, { environment: value })} />
            </div>
            <div className="card card-pad" style={habit.contract ? { borderColor: "var(--accent)", borderStyle: "dashed" } : {}}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h3 className="h3">Accountability contract</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowContract(true)}>{habit.contract ? "Edit" : "+ Add"}</button>
              </div>
              {habit.contract ? (
                <>
                  <p style={{ margin: "0 0 10px", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{habit.contract}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {habit.contractPartners.map((partner) => <span key={partner} className="chip">{partner}</span>)}
                  </div>
                </>
              ) : (
                <p style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 14, fontStyle: "italic", color: "var(--ink-3)", lineHeight: 1.5 }}>
                  Add a real cost to skipping. Invite a witness or write the terms.
                </p>
              )}
            </div>
            <MoodChart habit={habit} days={30} />
          </div>
        </div>
      )}

      {tab === "loop" && <LoopDiagram habit={habit} />}
      {tab === "journal" && <HabitJournalStream habit={habit} onClearEntry={(dateKey) => store.logCheckIn(habit.id, { mood: undefined, journal: undefined }, dateKey)} />}
      {tab === "history" && <HistoryWall habit={habit} onToggle={(dateKey) => store.toggleHabit(habit.id, dateKey)} />}
      {tab === "notes" && <NotesManager habit={habit} onUpdateNotes={(notes) => store.updateHabit(habit.id, { notes })} />}

      {showContract && (
        <ContractSheet habit={habit} onClose={() => setShowContract(false)} onSave={(patch) => store.updateHabit(habit.id, patch)} />
      )}
      {showMood && (
        <MoodCheckSheet habit={habit} dateKey={today} onClose={() => setShowMood(false)} onSave={(payload) => store.logCheckIn(habit.id, payload)} />
      )}
    </div>
  );
}
