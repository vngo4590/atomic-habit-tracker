"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ContractSheet } from "@/components/ContractSheet";
import { EditableLaw } from "@/components/EditableLaw";
import { EditableLine } from "@/components/EditableLine";
import { HabitJournalStream } from "@/components/HabitJournalStream";
import { HistoryWall } from "@/components/HistoryWall";
import { StackDiagram } from "@/components/StackDiagram";
import {
  IconBack,
  IconCheck,
  IconTrash,
} from "@/components/Icons";
import { LoopDiagram } from "@/components/LoopDiagram";
import { MoodChart } from "@/components/MoodChart";
import { MoodCheckSheet } from "@/components/MoodCheckSheet";
import { NotesManager } from "@/components/NotesManager";
import { useStoreContext } from "@/components/StoreProvider";
import { todayKey } from "@/lib/helpers";
import { formatScheduleLabel } from "@/lib/schedule";

type Tab = "overview" | "journal" | "history" | "notes" | "stack";

const TABS: Tab[] = ["overview", "journal", "history", "notes", "stack"];

type BubbleItem = {
  label: string;
  tone: "warm" | "green" | "blue" | "ink";
};

type RevealState = Record<string, { laws?: boolean; loop?: boolean }>;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="muted mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontFamily: "var(--serif)", fontSize: 30, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function PrincipleIntro({
  title,
  eyebrow,
  body,
  action,
  bubbles,
  onStart,
}: {
  title: string;
  eyebrow: string;
  body: string;
  action: string;
  bubbles: BubbleItem[];
  onStart: () => void;
}) {
  return (
    <section className="principle-intro">
      <div className="principle-copy">
        <div className="eyebrow">{eyebrow}</div>
        <h3 className="h3">{title}</h3>
        <p>{body}</p>
        <motion.button className="btn btn-primary btn-sm" onClick={onStart} whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>{action}</motion.button>
      </div>
      <div className="principle-bubbles" aria-hidden="true">
        {bubbles.map((bubble, index) => (
          <span key={bubble.label} className={`principle-bubble ${bubble.tone}`} style={{ "--bubble-index": index } as CSSProperties}>
            {bubble.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export default function HabitDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStoreContext();
  const [tab, setTab] = useState<Tab>("overview");
  const [revealed, setRevealed] = useState<RevealState>({});
  const [showContract, setShowContract] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
        <motion.button className="btn btn-ghost btn-sm btn-back" onClick={() => router.back()} whileTap={{ scale: 0.97 }}>
          <IconBack /> Back
        </motion.button>
        <div className="card card-pad" style={{ marginTop: 24 }}>Habit not found.</div>
      </motion.div>
    );
  }

  const doneToday = Boolean(habit.history[today]);
  const lawsHaveValues = [habit.cue, habit.craving, habit.twoMin, habit.reward].some((value) => value.trim());
  const loopHasValues = [habit.loopCue, habit.loopCraving, habit.loopResponse, habit.loopReward].some((value) => value.trim());
  const showLaws = lawsHaveValues || Boolean(revealed[habit.id]?.laws);
  const showLoop = loopHasValues || Boolean(revealed[habit.id]?.loop);
  const revealPanel = (panel: "laws" | "loop") => {
    setRevealed((current) => ({
      ...current,
      [habit.id]: {
        ...current[habit.id],
        [panel]: true,
      },
    }));
  };
  const hidePanel = (panel: "laws" | "loop") => {
    setRevealed((current) => ({
      ...current,
      [habit.id]: {
        ...current[habit.id],
        [panel]: false,
      },
    }));
  };
  const deleteHabit = () => {
    store.deleteHabit(habit.id);
    router.push("/habits");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}>
      <motion.button className="btn btn-ghost btn-sm btn-back" onClick={() => router.back()} style={{ marginBottom: 18 }} whileTap={{ scale: 0.97 }}>
        <IconBack /> Back
      </motion.button>

      <div className="page-header" style={{ alignItems: "flex-start", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <div className="eyebrow">{formatScheduleLabel(habit.schedule)} · {habit.time}</div>
            <h1 className="h1" style={{ fontSize: 52 }}>{habit.name}</h1>
            <p className="lede" style={{ marginTop: 14, fontStyle: "italic" }}>
              I am <em style={{ color: "var(--accent)", fontStyle: "normal" }}>{habit.identity}</em>. Each check-in is a vote for that.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <motion.button
              className={`btn btn-lg ${doneToday ? "btn-accent" : "btn-primary"}`}
              onClick={() => {
                if (doneToday) {
                  store.toggleHabit(habit.id);
                } else {
                  store.toggleHabit(habit.id);
                  setShowMood(true);
                }
              }}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
            >
              {doneToday ? <><IconCheck style={{ width: 14, height: 14 }} /> Done today · undo</> : "Mark done"}
            </motion.button>
            {doneToday && (
              <motion.button
                className="btn btn-lg btn-ghost"
                onClick={() => setShowMood(true)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
              >
                Edit entry
              </motion.button>
            )}
            {confirmDelete ? (
              <>
                <motion.button className="btn btn-lg btn-danger" onClick={deleteHabit} whileTap={{ scale: 0.97 }}>
                  <IconTrash style={{ width: 14, height: 14 }} /> Confirm delete
                </motion.button>
                <motion.button className="btn btn-lg btn-ghost" onClick={() => setConfirmDelete(false)} whileTap={{ scale: 0.97 }}>Cancel</motion.button>
              </>
            ) : (
              <motion.button className="btn btn-lg btn-ghost btn-danger-ghost" onClick={() => setConfirmDelete(true)} whileTap={{ scale: 0.97 }}>
                <IconTrash style={{ width: 14, height: 14 }} /> Delete habit
              </motion.button>
            )}
          </div>
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
          <motion.button key={item} className={`tab ${tab === item ? "active" : ""}`} onClick={() => setTab(item)} whileTap={{ scale: 0.97 }}>
            {item[0].toUpperCase() + item.slice(1)}
          </motion.button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="habit-overview-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {showLaws ? (
              <div className="card card-pad">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                  <h3 className="h3">The 4 laws</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="muted mono" style={{ fontSize: 10, letterSpacing: "0.08em" }}>EDIT INLINE</span>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        store.updateHabit(habit.id, { cue: "", craving: "", twoMin: "", reward: "" });
                        hidePanel("laws");
                      }}
                    >
                      Clear laws
                    </button>
                  </div>
                </div>
                <EditableLaw label="1. Make it obvious" hint="Cue" value={habit.cue} placeholder="When 7am, after I pour coffee..." onSave={(value) => store.updateHabit(habit.id, { cue: value })} />
                <EditableLaw label="2. Make it attractive" hint="Craving" value={habit.craving} placeholder="To feel curious, calm, strong..." onSave={(value) => store.updateHabit(habit.id, { craving: value })} />
                <EditableLaw label="3. Make it easy" hint="2-minute version" value={habit.twoMin} placeholder="Just open the book. Just put on the shoes." onSave={(value) => store.updateHabit(habit.id, { twoMin: value })} />
                <EditableLaw label="4. Make it satisfying" hint="Reward" value={habit.reward} placeholder="One visible win." onSave={(value) => store.updateHabit(habit.id, { reward: value })} last />
              </div>
            ) : (
              <PrincipleIntro
                title="Shape the habit before willpower is needed"
                eyebrow="The 4 laws"
                body="The laws turn a vague intention into a designed behavior: make the cue visible, make the craving attractive, make the response small, and make the reward immediate."
                action="Define the 4 laws"
                bubbles={[
                  { label: "Obvious", tone: "warm" },
                  { label: "Attractive", tone: "green" },
                  { label: "Easy", tone: "blue" },
                  { label: "Satisfying", tone: "ink" },
                ]}
                onStart={() => revealPanel("laws")}
              />
            )}

            {showLoop ? (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      store.updateHabit(habit.id, { loopCue: "", loopCraving: "", loopResponse: "", loopReward: "" });
                      hidePanel("loop");
                    }}
                  >
                    Clear loop
                  </button>
                </div>
                <LoopDiagram habit={habit} onUpdate={(patch) => store.updateHabit(habit.id, patch)} />
              </div>
            ) : (
              <PrincipleIntro
                title="See the behavior as a complete loop"
                eyebrow="Habit loop"
                body="The loop connects what starts the habit, why it feels worth doing, the action itself, and the reward that teaches your brain to repeat it."
                action="Define the loop"
                bubbles={[
                  { label: "Cue", tone: "warm" },
                  { label: "Craving", tone: "green" },
                  { label: "Response", tone: "blue" },
                  { label: "Reward", tone: "ink" },
                ]}
                onStart={() => revealPanel("loop")}
              />
            )}
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
                  <button
                    onClick={() => setShowContract(true)}
                    style={{
                      display: "block",
                      width: "100%",
                      margin: "0 0 10px",
                      padding: 0,
                      border: 0,
                      background: "transparent",
                      textAlign: "left",
                      fontSize: 13.5,
                      color: "var(--ink-2)",
                      lineHeight: 1.5,
                      cursor: "pointer",
                    }}
                  >
                    {habit.contract}
                  </button>
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

      {tab === "journal" && (
        <HabitJournalStream
          habit={habit}
          onSaveEntry={(dateKey, payload) => store.logCheckIn(habit.id, payload, dateKey)}
          onClearEntry={(dateKey) => store.logCheckIn(habit.id, { mood: undefined, journal: undefined }, dateKey)}
        />
      )}
      {tab === "history" && <HistoryWall habit={habit} />}
      {tab === "notes" && <NotesManager habit={habit} onUpdateNotes={(notes) => store.updateHabit(habit.id, { notes })} />}
      {tab === "stack" && (
        <StackDiagram habit={habit} habits={store.habits} onUpdate={(id, patch) => store.updateHabit(id, patch)} />
      )}

      {showContract && (
        <ContractSheet habit={habit} onClose={() => setShowContract(false)} onSave={(patch) => store.updateHabit(habit.id, patch)} />
      )}
      {showMood && (
        <MoodCheckSheet habit={habit} dateKey={today} onClose={() => setShowMood(false)} onSave={(payload) => store.logCheckIn(habit.id, payload)} />
      )}
    </motion.div>
  );
}
