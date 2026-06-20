"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { HabitSentenceFields } from "@/components/HabitSentenceFields";
import {
  SchedulePicker,
  scheduleLabelFromState,
  type Preset,
} from "@/components/SchedulePicker";
import { useStoreContext } from "@/components/StoreProvider";
import { capitalizeFirst, withCueConnector } from "@/lib/habit-sentence";
import { clientLogger } from "@/lib/logger-client";

import styles from "./page.module.css";

/**
 * NewHabitPage — the create-habit sentence builder. Users fill in inline
 * blanks ("I'll [action] [cue], [place] — so I can become [identity].") and
 * pick a schedule. The submit handler synthesises the full habit (the four
 * laws, the loop, environment, craving and reward) from those blanks so the
 * user doesn't have to think about the loop on day one.
 *
 * The cue is a single free-text blank: the user types the whole cue clause
 * ("after I pour my coffee" or "at 7am") instead of choosing a connector word
 * from a dropdown. Identity comes last ("so I can become ...") to frame the
 * habit as a vote for who you want to become.
 */
export default function NewHabitPage() {
  const router = useRouter();
  const { habits, addHabit } = useStoreContext();
  const [name, setName] = useState("");
  const [cue, setCue] = useState("");
  const [location, setLocation] = useState("");
  const [identity, setIdentity] = useState("");
  const [preset, setPreset] = useState<Preset>("daily");
  const [customDays, setCustomDays] = useState<string[]>([]);

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "habit-new" });
  }, []);

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

  const schedule = scheduleLabelFromState(preset, customDays);

  const toggleDay = (day: string) => {
    setPreset("custom");
    setCustomDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  // Synthesise the full habit record from the blanks then navigate to the
  // habits list so the user can see their creation. We set the loop fields
  // explicitly (rather than letting the store inherit them from the law
  // sentences) so the summary sentence on the detail page reads grammatically.
  const finalize = () => {
    clientLogger.info("New habit submission attempted", {
      page: "habit-new",
      canSubmit: Boolean(name.trim() && identity.trim()),
      scheduleType: preset,
    });

    if (!name.trim() || !identity.trim()) return;

    const cleanName = name.trim();
    const cleanIdentity = identity.trim();
    const cleanCue = cue.trim();
    const cleanLocation = location.trim();

    // Law 1 ("make it obvious") reads as a trigger statement, e.g.
    // "After I pour my coffee, at my desk." The user usually types a full cue
    // clause; withCueConnector only supplies a "when" for a bare clause that
    // lacks a leading connector, so a cue like "after I pour my coffee" is
    // never doubled.
    const cueWithConnector = withCueConnector(cleanCue);
    const cueClause = cueWithConnector ? capitalizeFirst(cueWithConnector) : "When the moment is right";
    const lawCue = cleanLocation ? `${cueClause}, ${cleanLocation}.` : `${cueClause}.`;

    addHabit({
      name: cleanName,
      emoji: "•",
      identity: cleanIdentity,
      time: "Morning",
      schedule,
      cue: lawCue,
      response: cleanName,
      twoMin: `Just ${cleanName.toLowerCase()} for two minutes.`,
      craving: `To become ${cleanIdentity}.`,
      reward: "A visible win I can see and feel.",
      environment: cleanLocation,
      // Store the cue exactly as the user typed it so the summary sentence on
      // the detail page reads back identically to what they entered here.
      loopCue: cleanCue,
      loopCraving: `to become ${cleanIdentity}`,
      loopResponse: cleanName,
      loopReward: "a visible win",
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
        <HabitSentenceFields
          name={name}
          cue={cue}
          location={location}
          identity={identity}
          onNameChange={setName}
          onCueChange={setCue}
          onLocationChange={setLocation}
          onIdentityChange={setIdentity}
          identitySuggestions={visibleIdentities}
        />
      </div>

      <div className={styles.sections}>
        <SchedulePicker
          preset={preset}
          customDays={customDays}
          onPresetChange={setPreset}
          onToggleDay={toggleDay}
        />
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
