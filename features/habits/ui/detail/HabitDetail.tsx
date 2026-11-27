"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";

import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, EmptyState, Skeleton, Tab, TabList, TabPanel, Tabs } from "@/components/ui";
import { todayKey } from "@/lib/helpers";
import { clientLogger } from "@/lib/logger-client";
import type { CheckIn, Habit } from "@/lib/types";

import { DetailHeader } from "./DetailHeader";
import { DetailStats } from "./DetailStats";
import { formationStatus } from "./formation";
import { HabitEditPanel, type HabitSentencePatch } from "./HabitEditPanel";
import { OverviewTab } from "./OverviewTab";
import styles from "./HabitDetail.module.css";

const TabLoading = () => <Skeleton height={240} />;

// Secondary tabs and overlays are split out of the first load: they only
// render after the user picks a tab or opens a sheet.
const HabitJournalStream = dynamic(
  () => import("@/components/HabitJournalStream").then((m) => m.HabitJournalStream),
  { loading: TabLoading },
);
const HistoryWall = dynamic(() => import("@/components/HistoryWall").then((m) => m.HistoryWall), {
  loading: TabLoading,
});
const NotesManager = dynamic(() => import("@/components/NotesManager").then((m) => m.NotesManager), {
  loading: TabLoading,
});
const StackDiagram = dynamic(() => import("@/features/stacks/ui").then((m) => m.StackDiagram), {
  loading: TabLoading,
});
const ContractSheet = dynamic(() => import("@/components/ContractSheet").then((m) => m.ContractSheet), {
  ssr: false,
});
const MoodCheckSheet = dynamic(() => import("@/components/MoodCheckSheet").then((m) => m.MoodCheckSheet), {
  ssr: false,
});

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "journal", label: "Journal" },
  { value: "history", label: "History" },
  { value: "notes", label: "Notes" },
  { value: "stack", label: "Stack" },
] as const;

const LOG = { page: "habit-detail" } as const;

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={styles.back}
      icon={<ArrowLeft size={18} strokeWidth={1.75} />}
      onClick={onBack}
    >
      Back
    </Button>
  );
}

/**
 * HabitDetail — the /habits/[id] page: header with today's check-in and
 * edit/delete, stats with formation status, then Overview / Journal /
 * History / Notes / Stack tabs. Only Overview ships in the first load.
 */
export function HabitDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStoreContext();
  const [tab, setTab] = useState<string>("overview");
  const [editing, setEditing] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const today = todayKey();
  const habitId = params.id;
  const viewedHabitIdRef = useRef(habitId);
  const habit = store.habits.find((item) => item.id === habitId);

  useEffect(() => {
    clientLogger.info("Page viewed", { ...LOG, habitId: viewedHabitIdRef.current });
  }, []);

  if (!habit) {
    return (
      <div className={styles.page}>
        <BackButton onBack={() => router.back()} />
        <Card padding="lg">
          <EmptyState icon={<SearchX size={24} strokeWidth={1.75} />} title="Habit not found.">
            It may have been deleted, or the link is out of date.
          </EmptyState>
        </Card>
      </div>
    );
  }

  const doneToday = Boolean(habit.history[today]);
  const verdict = (store.formationVerdicts ?? []).find((item) => item.habitId === habit.id);

  const savePatch = (field: string, patch: Partial<Habit>) => {
    clientLogger.info("Habit detail saved", { ...LOG, habitId: habit.id, field });
    store.updateHabit(habit.id, patch);
  };

  const saveEntry = (dateKey: string, payload: Partial<CheckIn>) => {
    clientLogger.info("Habit detail entry saved", {
      ...LOG,
      habitId: habit.id,
      dateKey,
      hasMood: Boolean(payload.mood),
      hasJournal: Boolean(payload.journal),
    });
    store.logCheckIn(habit.id, payload, dateKey);
  };

  const clearEntry = (dateKey: string) => {
    clientLogger.info("Habit detail entry cleared", { ...LOG, habitId: habit.id, dateKey });
    store.logCheckIn(habit.id, { mood: undefined, journal: undefined }, dateKey);
  };

  // Marking done also opens the mood sheet so the user can add a mood and a
  // quick note; unmarking just removes today's vote.
  const toggleDone = () => {
    store.toggleHabit(habit.id);
    if (!doneToday) setShowMood(true);
  };

  const startEditing = () => {
    clientLogger.info("Habit edit started", { ...LOG, habitId: habit.id });
    setEditing(true);
  };

  // Only the sentence + schedule fields are patched so inline edits to the
  // laws or loop are never clobbered.
  const saveEdit = (patch: HabitSentencePatch) => {
    store.updateHabit(habit.id, patch);
    clientLogger.info("Habit edit saved", { ...LOG, habitId: habit.id });
    setEditing(false);
  };

  const deleteHabit = () => {
    store.deleteHabit(habit.id);
    router.push("/habits");
  };

  return (
    <div className={styles.page}>
      <BackButton onBack={() => router.back()} />

      <DetailHeader
        habit={habit}
        doneToday={doneToday}
        editing={editing}
        onToggleDone={toggleDone}
        onEditEntry={() => setShowMood(true)}
        onEdit={startEditing}
        onDelete={deleteHabit}
      />

      {editing ? (
        <HabitEditPanel habit={habit} habits={store.habits} onCancel={() => setEditing(false)} onSave={saveEdit} />
      ) : (
        <DetailStats
          active={store.streak(habit)}
          best={store.longestStreak(habit)}
          rate={Math.round(store.completionRate(habit) * 100)}
          total={Object.keys(habit.history).length}
          formation={formationStatus(habit.createdAt, today, verdict)}
        />
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabList aria-label="Habit sections" className={styles.tabList}>
          {TABS.map((item) => (
            <Tab key={item.value} value={item.value}>
              {item.label}
            </Tab>
          ))}
        </TabList>
        <TabPanel value="overview">
          <OverviewTab key={habit.id} habit={habit} onPatch={savePatch} onOpenContract={() => setShowContract(true)} />
        </TabPanel>
        <TabPanel value="journal">
          <HabitJournalStream habit={habit} onSaveEntry={saveEntry} onClearEntry={clearEntry} />
        </TabPanel>
        <TabPanel value="history">
          <HistoryWall habit={habit} />
        </TabPanel>
        <TabPanel value="notes">
          <NotesManager habit={habit} onUpdateNotes={(notes) => store.updateHabit(habit.id, { notes })} />
        </TabPanel>
        <TabPanel value="stack">
          <StackDiagram habit={habit} habits={store.habits} />
        </TabPanel>
      </Tabs>

      {showContract ? (
        <ContractSheet
          habit={habit}
          onClose={() => setShowContract(false)}
          onSave={(patch) => savePatch("contract", patch)}
        />
      ) : null}
      {showMood ? (
        <MoodCheckSheet
          habit={habit}
          dateKey={today}
          onClose={() => setShowMood(false)}
          onSave={(payload) => saveEntry(today, payload)}
        />
      ) : null}
    </div>
  );
}
