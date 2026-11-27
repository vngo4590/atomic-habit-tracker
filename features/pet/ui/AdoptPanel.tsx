"use client";

import { Shuffle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Button, Card, Field, IconButton, Input } from "@/components/ui";

import { generateSprite, getTemperament, randomSeed, TEMPERAMENTS, type TemperamentId } from "..";
import { PixelSprite } from "./PixelSprite";
import styles from "./AdoptPanel.module.css";

interface AdoptPanelProps {
  /** Adopt a pet with the chosen name + temperament. */
  onAdopt: (draft: { name: string; temperament: TemperamentId }) => void | Promise<void>;
  /** How many more pets the user may adopt (drives the helper copy). */
  remainingSlots: number;
  /** Close the flow without adopting. Omit to hide the close button. */
  onClose?: () => void;
}

/**
 * AdoptPanel is the focused adopt flow: pick a temperament (which biases the
 * creature's colours and behaviour) and a name. A shuffleable egg preview hints
 * at the kind of creature they might get — always drawn at the egg stage, the
 * form every pet actually starts as, so the preview never promises a grown-up
 * look. The real pet's appearance is a server-seeded surprise.
 */
export function AdoptPanel({ onAdopt, remainingSlots, onClose }: AdoptPanelProps) {
  const [temperament, setTemperament] = useState<TemperamentId>(TEMPERAMENTS[0].id);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(() => randomSeed());
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Opening the flow moves focus to its heading so keyboard and screen-reader
  // users land in the new content rather than on the now-hidden trigger.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const previewSprite = useMemo(
    () => generateSprite({ seed: previewSeed, temperament }, "egg"),
    [previewSeed, temperament],
  );

  const active = getTemperament(temperament);
  const trimmedName = name.trim();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedName || remainingSlots <= 0) return;
    setPending(true);
    try {
      await onAdopt({ name: trimmedName, temperament });
    } finally {
      setPending(false);
    }
  };

  return (
    <Card as="section" padding="lg" aria-labelledby="adopt-title" className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2 id="adopt-title" ref={headingRef} tabIndex={-1} className={styles.title}>
            Adopt a companion
          </h2>
          <p className={styles.lede}>
            Pick a personality and a name. You have room for {remainingSlots} more{" "}
            {remainingSlots === 1 ? "pet" : "pets"}.
          </p>
        </div>
        {onClose ? <IconButton icon={<X />} aria-label="Close adopt panel" onClick={onClose} /> : null}
      </header>

      <div className={styles.body}>
        <div className={styles.preview}>
          <div className={styles.stage}>
            <PixelSprite
              sprite={previewSprite}
              label={`A ${active.name.toLowerCase()} creature egg preview`}
              pixelSize={12}
            />
          </div>
          <Button variant="ghost" size="sm" icon={<Shuffle />} onClick={() => setPreviewSeed(randomSeed())}>
            Shuffle preview
          </Button>
          <p className={styles.note}>Every pet hatches from an egg. How it grows up is a surprise.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <fieldset className={styles.fieldset}>
            <legend className={styles.legend}>Temperament</legend>
            <div className={styles.temperaments}>
              {TEMPERAMENTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={styles.chip}
                  onClick={() => setTemperament(option.id)}
                  aria-pressed={option.id === temperament}
                >
                  {option.name}
                </button>
              ))}
            </div>
            <p className={styles.blurb}>{active.blurb}</p>
          </fieldset>

          <Field label="Name" id="pet-name">
            <Input
              type="text"
              value={name}
              maxLength={40}
              autoComplete="off"
              placeholder={active.id === "calm" ? "e.g. Misty" : "e.g. Pip"}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>

          <Button type="submit" loading={pending} disabled={remainingSlots <= 0 || trimmedName.length === 0}>
            Adopt {trimmedName || "companion"}
          </Button>
        </form>
      </div>
    </Card>
  );
}
