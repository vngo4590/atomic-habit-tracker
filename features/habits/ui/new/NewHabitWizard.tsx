"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { HelpTip } from "@/components/HelpTip";
import { useStoreContext } from "@/components/StoreProvider";
import { Button, Card, PageHeader } from "@/components/ui";
import { clientLogger } from "@/lib/logger-client";

import { remainingHabitSlots } from "../../model/habit-cap";
import { composeHabitSentence } from "../../model/habit-sentence";
import { scheduleLabelFromState, toggleScheduleDay, type Preset } from "../schedule/schedule-state";
import { IdentityStep, NameStep, WhenStep } from "./AnswerSteps";
import { buildHabitDraft, canCreate, defaultLaws, type LawOverrides } from "./build-habit-draft";
import { CAP_EXPLANATION, CapBanner } from "./CapBanner";
import { LawsStep, ReviewStep } from "./FinishSteps";
import { rankIdentities, visibleIdentities } from "./identity-suggestions";
import { StepIndicator } from "./StepIndicator";
import styles from "./NewHabitWizard.module.css";

const STEPS = [
  { id: "name", label: "Habit", title: "What's the tiny habit?" },
  { id: "identity", label: "Identity", title: "Who are you becoming?" },
  { id: "when", label: "Cue & schedule", title: "When and where?" },
  { id: "stick", label: "Make it stick", title: "Make it stick (optional)" },
  { id: "review", label: "Review", title: "Review your habit" },
] as const;
const LAST = STEPS.length - 1;

type Errors = { name?: string; identity?: string };

/**
 * NewHabitWizard — /habits/new as a short, guided wizard: habit → identity →
 * cue & schedule → (optional) four laws → review. One question per screen,
 * Enter advances, focus moves to each new step's heading, and errors appear
 * inline next to the field. Respects the active-habit cap.
 */
export function NewHabitWizard() {
  const router = useRouter();
  const { habits, formationVerdicts, addHabit } = useStoreContext();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [identity, setIdentity] = useState("");
  const [cue, setCue] = useState("");
  const [location, setLocation] = useState("");
  const [preset, setPreset] = useState<Preset>("daily");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [laws, setLaws] = useState<LawOverrides>({});
  const [errors, setErrors] = useState<Errors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  const atCap = remainingHabitSlots(habits, formationVerdicts ?? []) <= 0;
  const schedule = scheduleLabelFromState(preset, customDays);
  const answers = { name, identity, cue, location, schedule, laws };

  useEffect(() => {
    clientLogger.info("Page viewed", { page: "habit-new" });
  }, []);

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (hasNavigated.current) headingRef.current?.focus();
  }, [step]);

  const goTo = (next: number) => {
    hasNavigated.current = true;
    setStep(Math.max(0, Math.min(LAST, next)));
  };

  /** Validate the current step; returns false (and shows an error) if blocked. */
  const validate = (current: number): boolean => {
    if (current === 0 && !name.trim()) {
      setErrors({ name: "Add what you'll do — even something tiny." });
      return false;
    }
    if (current === 1 && !identity.trim()) {
      setErrors({ identity: "Add who this habit helps you become." });
      return false;
    }
    setErrors({});
    return true;
  };

  const create = () => {
    clientLogger.info("New habit submission attempted", {
      page: "habit-new",
      canSubmit: canCreate(answers),
      scheduleType: preset,
      atCap,
    });
    // The server enforces the cap too; blocking here avoids an optimistic
    // add followed by a rollback.
    if (atCap || !canCreate(answers)) return;
    addHabit(buildHabitDraft(answers));
    router.push("/habits");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (step === LAST) {
      create();
      return;
    }
    if (validate(step)) goTo(step + 1);
  };

  const updateName = (value: string) => {
    setName(value);
    if (errors.name && value.trim()) setErrors({});
  };
  const updateIdentity = (value: string) => {
    setIdentity(value);
    if (errors.identity && value.trim()) setErrors({});
  };

  const current = STEPS[step];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Create"
        title={
          <>
            Design a small vote <HelpTip label="How many habits can I have?">{CAP_EXPLANATION}</HelpTip>
          </>
        }
      />

      {atCap ? <CapBanner /> : null}

      <Card as="section" padding="lg" className={styles.card} aria-labelledby="wizard-step-title">
        <StepIndicator steps={[...STEPS]} current={step} />

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <h2 id="wizard-step-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            {current.title}
          </h2>

          <div className={styles.body} key={current.id}>
            {step === 0 ? <NameStep value={name} error={errors.name} onChange={updateName} /> : null}
            {step === 1 ? (
              <IdentityStep
                value={identity}
                error={errors.identity}
                suggestions={visibleIdentities(rankIdentities(habits), identity)}
                onChange={updateIdentity}
              />
            ) : null}
            {step === 2 ? (
              <WhenStep
                cue={cue}
                location={location}
                preset={preset}
                customDays={customDays}
                onCueChange={setCue}
                onLocationChange={setLocation}
                onPresetChange={setPreset}
                onToggleDay={(day) => {
                  setCustomDays(toggleScheduleDay(preset, customDays, day));
                  setPreset("custom");
                }}
              />
            ) : null}
            {step === 3 ? (
              <LawsStep
                laws={laws}
                defaults={defaultLaws(answers)}
                onChange={(key, value) => setLaws((prev) => ({ ...prev, [key]: value }))}
              />
            ) : null}
            {step === LAST ? (
              <ReviewStep
                sentence={composeHabitSentence({ name, identity, loopCue: cue, environment: location })}
                items={[
                  { label: "Habit", value: name.trim(), step: 0 },
                  { label: "Identity", value: identity.trim(), step: 1 },
                  { label: "Cue", value: cue.trim(), step: 2 },
                  { label: "Place", value: location.trim(), step: 2 },
                  { label: "Schedule", value: schedule, step: 2 },
                ]}
                onEdit={goTo}
              />
            ) : null}
          </div>

          <div className={styles.footer}>
            {step === 0 ? (
              <Button variant="ghost" href="/habits">
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" icon={<ArrowLeft size={18} strokeWidth={1.75} />} onClick={() => goTo(step - 1)}>
                Back
              </Button>
            )}
            <div className={styles.footerEnd}>
              {step === 3 ? (
                <Button variant="secondary" onClick={() => goTo(LAST)}>
                  Skip
                </Button>
              ) : null}
              {step === LAST ? (
                <Button type="submit" disabled={atCap || !canCreate(answers)}>
                  Create habit
                </Button>
              ) : (
                <Button type="submit">
                  Next
                  <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
