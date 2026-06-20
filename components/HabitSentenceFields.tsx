"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import styles from "./HabitSentenceFields.module.css";

/**
 * MLInput — auto-resizing inline input used inside the Mad-Libs habit sentence.
 *
 * Measures the typed text in a hidden span so the input width matches the
 * content (within min/max bounds). The width is exposed to CSS via the
 * --ml-width and --ml-max-width custom properties so the wrapper stays
 * style-free.
 */
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
    <span
      className={styles.mlWrap}
      // The measured content width is passed to CSS so the wrapper sizes to the
      // text the user typed; this is dynamic data, not static styling.
      style={
        {
          "--ml-width": `${textWidth}px`,
          "--ml-max-width": `${maxWidth}px`,
        } as CSSProperties
      }
    >
      <input
        className={`input ${styles.mlInput}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxChars}
      />
      <span ref={measureRef} aria-hidden="true" className={styles.mlMeasure}>
        {text}
      </span>
    </span>
  );
}

/** Small clickable chip that fills in a suggested identity into the sentence. */
function MLChip({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button className="chip identity-chip" type="button" onClick={onClick}>
      {children}
    </button>
  );
}

/**
 * HabitSentenceFields — the shared Mad-Libs habit sentence used by both the
 * create-habit page and the edit-habit panel on the detail page. Keeping it in
 * one component guarantees the sentence the user fills in when creating a habit
 * is *identical* in wording and order to the sentence they edit later and the
 * summary they read at the top of the habit page.
 *
 * The sentence reads: "I'll <action> <cue>, <place> — so I can become
 * <identity>." There is no connector dropdown: the user types the entire cue
 * clause themselves (e.g. "after I pour my coffee" or "at 7am"), which keeps
 * the wording flexible and removes a control that previously dropped the chosen
 * connector from the summary sentence.
 */
export function HabitSentenceFields({
  name,
  cue,
  location,
  identity,
  onNameChange,
  onCueChange,
  onLocationChange,
  onIdentityChange,
  identitySuggestions,
}: {
  name: string;
  cue: string;
  location: string;
  identity: string;
  onNameChange: (value: string) => void;
  onCueChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onIdentityChange: (value: string) => void;
  identitySuggestions: string[];
}) {
  return (
    <div>
      <div className={styles.sentence}>
        I&apos;ll
        <MLInput value={name} onChange={onNameChange} placeholder="read one page" wide />
        <MLInput value={cue} onChange={onCueChange} placeholder="after I pour my coffee" wide />
        ,
        <MLInput value={location} onChange={onLocationChange} placeholder="at my desk" wide />
        — so I can become
        <MLInput value={identity} onChange={onIdentityChange} placeholder="a reader" wide />
        .
      </div>
      <div className={styles.identityChips}>
        {identitySuggestions.map((item) => (
          <MLChip key={item} onClick={() => onIdentityChange(item)}>
            {item}
          </MLChip>
        ))}
      </div>
    </div>
  );
}
