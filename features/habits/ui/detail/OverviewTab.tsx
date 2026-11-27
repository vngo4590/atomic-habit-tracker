"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";

import { EditableLaw } from "@/components/EditableLaw";
import { EditableLine } from "@/components/EditableLine";
import { LoopDiagram } from "@/components/LoopDiagram";
import { MoodChart } from "@/components/MoodChart";
import { Badge, Button, Card } from "@/components/ui";
import type { Habit } from "@/lib/types";

import { PrincipleIntro } from "./PrincipleIntro";
import styles from "./OverviewTab.module.css";

export interface OverviewTabProps {
  habit: Habit;
  /** Persist a patch; `field` names the change for logging. */
  onPatch: (field: string, patch: Partial<Habit>) => void;
  onOpenContract: () => void;
}

const LAW_FIELDS = ["cue", "craving", "twoMin", "reward"] as const;
const LOOP_FIELDS = ["loopCue", "loopCraving", "loopResponse", "loopReward"] as const;

const hasAny = (habit: Habit, fields: readonly (keyof Habit)[]) =>
  fields.some((field) => String(habit[field] ?? "").trim());

const cleared = (fields: readonly string[]) =>
  Object.fromEntries(fields.map((field) => [field, ""])) as Partial<Habit>;

function LawsCard({ habit, onPatch, onClear }: Pick<OverviewTabProps, "habit" | "onPatch"> & { onClear: () => void }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="laws-title">
      <div className={styles.cardHeader}>
        <h3 id="laws-title" className={styles.cardTitle}>
          The 4 laws
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear laws
        </Button>
      </div>
      <p className={styles.hint}>Tap any line to edit it.</p>
      <EditableLaw
        label="1. Make it obvious"
        hint="Cue"
        value={habit.cue}
        placeholder="When 7am, after I pour coffee..."
        onSave={(value) => onPatch("cue", { cue: value })}
      />
      <EditableLaw
        label="2. Make it attractive"
        hint="Craving"
        value={habit.craving}
        placeholder="To feel curious, calm, strong..."
        onSave={(value) => onPatch("craving", { craving: value })}
      />
      <EditableLaw
        label="3. Make it easy"
        hint="2-minute version"
        value={habit.twoMin}
        placeholder="Just open the book. Just put on the shoes."
        onSave={(value) => onPatch("twoMinute", { twoMin: value })}
      />
      <EditableLaw
        label="4. Make it satisfying"
        hint="Reward"
        value={habit.reward}
        placeholder="One visible win."
        onSave={(value) => onPatch("reward", { reward: value })}
        last
      />
    </Card>
  );
}

function ContractCard({ habit, onOpen }: { habit: Habit; onOpen: () => void }) {
  const hasContract = Boolean(habit.contract);
  return (
    <Card
      as="section"
      padding="lg"
      aria-labelledby="contract-title"
      className={hasContract ? styles.contractActive : undefined}
    >
      <div className={styles.cardHeader}>
        <h3 id="contract-title" className={styles.cardTitle}>
          Accountability contract
        </h3>
        <Button
          variant="ghost"
          size="sm"
          icon={hasContract ? <Pencil size={16} strokeWidth={1.75} /> : <Plus size={16} strokeWidth={1.75} />}
          onClick={onOpen}
        >
          {hasContract ? "Edit" : "Add"}
        </Button>
      </div>
      {hasContract ? (
        <>
          <button type="button" className={styles.contractText} onClick={onOpen}>
            {habit.contract}
          </button>
          {habit.contractPartners.length > 0 ? (
            <ul className={styles.partners} aria-label="Witnesses">
              {habit.contractPartners.map((partner) => (
                <li key={partner}>
                  <Badge>{partner}</Badge>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className={styles.empty}>Add a real cost to skipping. Invite a witness or write the terms.</p>
      )}
    </Card>
  );
}

/**
 * OverviewTab — how the habit is designed: the 4 laws and the habit loop
 * (each opt-in behind a short explainer until filled), the environment, the
 * accountability contract and the 30-day mood trend.
 */
export function OverviewTab({ habit, onPatch, onOpenContract }: OverviewTabProps) {
  const [revealed, setRevealed] = useState({ laws: false, loop: false });
  const showLaws = hasAny(habit, LAW_FIELDS) || revealed.laws;
  const showLoop = hasAny(habit, LOOP_FIELDS) || revealed.loop;
  const setPanel = (panel: "laws" | "loop", open: boolean) =>
    setRevealed((current) => ({ ...current, [panel]: open }));

  return (
    <div className={styles.grid}>
      <div className={styles.column}>
        {showLaws ? (
          <LawsCard
            habit={habit}
            onPatch={onPatch}
            onClear={() => {
              onPatch("laws", cleared(LAW_FIELDS));
              setPanel("laws", false);
            }}
          />
        ) : (
          <PrincipleIntro
            eyebrow="The 4 laws"
            title="Shape the habit before willpower is needed"
            body="The laws turn a vague intention into a designed behavior: make the cue visible, make the craving attractive, make the response small, and make the reward immediate."
            action="Define the 4 laws"
            steps={["Obvious", "Attractive", "Easy", "Satisfying"]}
            onStart={() => setPanel("laws", true)}
          />
        )}

        {showLoop ? (
          <div className={styles.loop}>
            <div className={styles.loopActions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onPatch("loop", cleared(LOOP_FIELDS));
                  setPanel("loop", false);
                }}
              >
                Clear loop
              </Button>
            </div>
            <LoopDiagram habit={habit} onUpdate={(patch) => onPatch("loop", patch)} />
          </div>
        ) : (
          <PrincipleIntro
            eyebrow="Habit loop"
            title="See the behavior as a complete loop"
            body="The loop connects what starts the habit, why it feels worth doing, the action itself, and the reward that teaches your brain to repeat it."
            action="Define the loop"
            steps={["Cue", "Craving", "Response", "Reward"]}
            onStart={() => setPanel("loop", true)}
          />
        )}
      </div>

      <div className={styles.column}>
        <Card as="section" padding="lg" aria-labelledby="environment-title">
          <h3 id="environment-title" className={styles.cardTitle}>
            Environment
          </h3>
          <EditableLine
            value={habit.environment}
            placeholder="Stage your space..."
            onSave={(value) => onPatch("environment", { environment: value })}
          />
        </Card>
        <ContractCard habit={habit} onOpen={onOpenContract} />
        <MoodChart habit={habit} days={30} />
      </div>
    </div>
  );
}
