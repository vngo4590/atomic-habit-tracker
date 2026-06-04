"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { composeHabitSentence } from "@/lib/habit-sentence";
import { clientLogger } from "@/lib/logger-client";
import { formatScheduleLabel } from "@/lib/schedule";
import type { CheckIn, Habit } from "@/lib/types";

import styles from "./page.module.css";

type Tab = "overview" | "journal" | "history" | "notes" | "stack";

const TABS: Tab[] = ["overview", "journal", "history", "notes", "stack"];

type BubbleItem = {
  label: string;
  tone: "warm" | "green" | "blue" | "ink";
};

type RevealState = Record<string, { laws?: boolean; loop?: boolean }>;

/** Compact stat tile used inside the page header stat strip. */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className={`muted mono ${styles.statCaption}`}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

/** Intro panel for laws/loop sections — shown until the user clicks
 *  through to the actual editable surface. */
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
        <motion.button
          className="btn btn-primary btn-sm"
          onClick={onStart}
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
        >
          {action}
        </motion.button>
      </div>
      <div className="principle-bubbles" aria-hidden="true">
        {bubbles.map((bubble, index) => (
          <span
            key={bubble.label}
            className={`principle-bubble ${bubble.tone}`}
            style={{ "--bubble-index": index } as CSSProperties}
          >
            {bubble.label}
          </span>
        ))}
      </div>
    </section>
  );
}

/**
 * HabitDetailPage — five-tab detail view for one habit:
 *  - overview: 4 laws + habit loop + environment + contract + mood chart.
 *  - journal: chronological mood/journal entries.
 *  - history: 26-week dot wall.
 *  - notes: standalone notes list.
 *  - stack: stack chain editor.
 */
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
  const viewedHabitIdRef = useRef(habitId);
  const habit = store.habits.find((item) => item.id === habitId);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "habit-detail", habitId: viewedHabitIdRef.current });
  }, []);

  // Derive the four header stats. Returns null when the habit is missing
  // so the page can render a "Habit not found" card instead.
  const stats = useMemo(() => {
    if (!habit) return null;
    return {
      active: store.streak(habit),
      best: store.longestStreak(habit),
      rate: Math.round(store.completionRate(habit) * 100),
      total: Object.keys(habit.history).length,
    };
  }, [habit, store]);

  if (!habit || !stats) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.button
          className="btn btn-ghost btn-sm btn-back"
          onClick={() => router.back()}
          whileTap={{ scale: 0.97 }}
        >
          <IconBack /> Back
        </motion.button>
        <div className={`card card-pad ${styles.notFoundCard}`}>Habit not found.</div>
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

  const saveHabitPatch = (field: string, patch: Partial<Habit>) => {
    clientLogger.info("Habit detail saved", { page: "habit-detail", habitId: habit.id, field });
    store.updateHabit(habit.id, patch);
  };

  const saveJournalEntry = (dateKey: string, payload: Partial<CheckIn>) => {
    clientLogger.info("Habit detail entry saved", {
      page: "habit-detail",
      habitId: habit.id,
      dateKey,
      hasMood: Boolean(payload.mood),
      hasJournal: Boolean(payload.journal),
    });
    store.logCheckIn(habit.id, payload, dateKey);
  };

  const clearJournalEntry = (dateKey: string) => {
    clientLogger.info("Habit detail entry cleared", {
      page: "habit-detail",
      habitId: habit.id,
      dateKey,
    });
    store.logCheckIn(habit.id, { mood: undefined, journal: undefined }, dateKey);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.button
        className={`btn btn-ghost btn-sm btn-back ${styles.backBtn}`}
        onClick={() => router.back()}
        whileTap={{ scale: 0.97 }}
      >
        <IconBack /> Back
      </motion.button>

      <div className={`page-header ${styles.header}`}>
        <div className={styles.headerTop}>
          <div>
            <div className="eyebrow">{formatScheduleLabel(habit.schedule)} · {habit.time}</div>
            <h1 className={`h1 ${styles.headerName}`}>{habit.name}</h1>
            {/* The habit summarised as one plain sentence, rebuilt from the
                live fields so it stays accurate after inline edits. Shown up
                top so the user sees exactly what they committed to. */}
            <p className={styles.headerSentence}>{composeHabitSentence(habit)}</p>
            <p className={`lede ${styles.headerLede}`}>
              I am <em className={styles.identityEm}>{habit.identity}</em>. Each check-in is a vote for that.
            </p>
          </div>
          <div className={styles.headerActions}>
            <motion.button
              className={`btn btn-lg ${doneToday ? "btn-accent" : "btn-primary"}`}
              onClick={() => {
                // Clicking the primary button always toggles the day. If the
                // user just marked it done, also open the mood sheet so they
                // can capture mood + a quick note.
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
              {doneToday ? (
                <>
                  <IconCheck className={styles.actionIcon} /> Done today · tap to unmark
                </>
              ) : (
                "Mark done"
              )}
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
                  <IconTrash className={styles.actionIcon} /> Confirm delete
                </motion.button>
                <motion.button
                  className="btn btn-lg btn-ghost"
                  onClick={() => setConfirmDelete(false)}
                  whileTap={{ scale: 0.97 }}
                >
                  Cancel
                </motion.button>
              </>
            ) : (
              <motion.button
                className="btn btn-lg btn-ghost btn-danger-ghost"
                onClick={() => setConfirmDelete(true)}
                whileTap={{ scale: 0.97 }}
              >
                <IconTrash className={styles.actionIcon} /> Delete habit
              </motion.button>
            )}
          </div>
        </div>

        <div className={styles.statsRow}>
          <Stat label="Active streak" value={`${stats.active}d`} />
          <Stat label="Best streak" value={`${stats.best}d`} />
          <Stat label="30-day rate" value={`${stats.rate}%`} />
          <Stat label="Total check-ins" value={stats.total} />
        </div>
      </div>

      <div className="tabs">
        {TABS.map((item) => (
          <motion.button
            key={item}
            className={`tab ${tab === item ? "active" : ""}`}
            onClick={() => setTab(item)}
            whileTap={{ scale: 0.97 }}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </motion.button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="habit-overview-grid">
          <div className={styles.overviewColumn}>
            {showLaws ? (
              <div className="card card-pad">
                <div className={styles.lawsHeader}>
                  <h3 className="h3">The 4 laws</h3>
                  <div className={styles.lawsHeaderRight}>
                    <span className={`muted mono ${styles.lawsEditCaption}`}>EDIT INLINE</span>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => {
                        clientLogger.info("Habit detail saved", {
                          page: "habit-detail",
                          habitId: habit.id,
                          field: "laws",
                        });
                        store.updateHabit(habit.id, { cue: "", craving: "", twoMin: "", reward: "" });
                        hidePanel("laws");
                      }}
                    >
                      Clear laws
                    </button>
                  </div>
                </div>
                <EditableLaw
                  label="1. Make it obvious"
                  hint="Cue"
                  value={habit.cue}
                  placeholder="When 7am, after I pour coffee..."
                  onSave={(value) => saveHabitPatch("cue", { cue: value })}
                />
                <EditableLaw
                  label="2. Make it attractive"
                  hint="Craving"
                  value={habit.craving}
                  placeholder="To feel curious, calm, strong..."
                  onSave={(value) => saveHabitPatch("craving", { craving: value })}
                />
                <EditableLaw
                  label="3. Make it easy"
                  hint="2-minute version"
                  value={habit.twoMin}
                  placeholder="Just open the book. Just put on the shoes."
                  onSave={(value) => saveHabitPatch("twoMinute", { twoMin: value })}
                />
                <EditableLaw
                  label="4. Make it satisfying"
                  hint="Reward"
                  value={habit.reward}
                  placeholder="One visible win."
                  onSave={(value) => saveHabitPatch("reward", { reward: value })}
                  last
                />
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
                <div className={styles.clearLoopRow}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => {
                      clientLogger.info("Habit detail saved", {
                        page: "habit-detail",
                        habitId: habit.id,
                        field: "loop",
                      });
                      store.updateHabit(habit.id, {
                        loopCue: "",
                        loopCraving: "",
                        loopResponse: "",
                        loopReward: "",
                      });
                      hidePanel("loop");
                    }}
                  >
                    Clear loop
                  </button>
                </div>
                <LoopDiagram habit={habit} onUpdate={(patch) => saveHabitPatch("loop", patch)} />
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
          <div className={styles.overviewColumn}>
            <div className="card card-pad">
              <h3 className={`h3 ${styles.cardTitle}`}>Environment</h3>
              <EditableLine
                value={habit.environment}
                placeholder="Stage your space..."
                onSave={(value) => saveHabitPatch("environment", { environment: value })}
              />
            </div>
            <div className={`card card-pad ${habit.contract ? styles.contractCardActive : ""}`}>
              <div className={styles.contractHeader}>
                <h3 className="h3">Accountability contract</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowContract(true)}>
                  {habit.contract ? "Edit" : "+ Add"}
                </button>
              </div>
              {habit.contract ? (
                <>
                  <button onClick={() => setShowContract(true)} className={styles.contractText}>
                    {habit.contract}
                  </button>
                  <div className={styles.partnersRow}>
                    {habit.contractPartners.map((partner) => (
                      <span key={partner} className="chip">{partner}</span>
                    ))}
                  </div>
                </>
              ) : (
                <p className={styles.contractEmpty}>
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
          onSaveEntry={saveJournalEntry}
          onClearEntry={clearJournalEntry}
        />
      )}
      {tab === "history" && <HistoryWall habit={habit} />}
      {tab === "notes" && (
        <NotesManager habit={habit} onUpdateNotes={(notes) => store.updateHabit(habit.id, { notes })} />
      )}
      {tab === "stack" && <StackDiagram habit={habit} habits={store.habits} />}

      {showContract && (
        <ContractSheet
          habit={habit}
          onClose={() => setShowContract(false)}
          onSave={(patch) => saveHabitPatch("contract", patch)}
        />
      )}
      {showMood && (
        <MoodCheckSheet
          habit={habit}
          dateKey={today}
          onClose={() => setShowMood(false)}
          onSave={(payload) => saveJournalEntry(today, payload)}
        />
      )}
    </motion.div>
  );
}
