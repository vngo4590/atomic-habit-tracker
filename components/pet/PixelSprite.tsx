import type { CSSProperties } from "react";

import type { PetCharacter } from "@/lib/pet";

import styles from "./PixelSprite.module.css";

/**
 * PixelSprite renders a {@link PetCharacter}'s tiny pixel art as a CSS grid of
 * coloured cells — no image files involved. Each character in the sprite's
 * `pixels` rows is a key into its `palette`; the "." key (and any unknown key)
 * renders as a transparent cell so the creature reads as a silhouette.
 *
 * It is a pure presentational component: give it a character and a pixel size
 * and it draws the art, which keeps it trivial to reuse on the picker cards and
 * the main pet stage and easy to test.
 */
export function PixelSprite({
  character,
  pixelSize = 14,
  className,
}: {
  /** The creature to draw. */
  character: PetCharacter;
  /** Edge length of a single pixel cell, in CSS pixels. */
  pixelSize?: number;
  /** Optional extra class for layout/animation by the parent. */
  className?: string;
}) {
  const columns = character.pixels[0]?.length ?? 0;

  // Dynamic grid sizing: the column count and cell size vary per character and
  // per usage (small on cards, large on the stage), so they pass through as CSS
  // variables that the module stylesheet consumes.
  const gridStyle = {
    "--pet-cols": columns,
    "--pet-cell": `${pixelSize}px`,
  } as CSSProperties;

  return (
    <div
      className={`${styles.sprite} ${className ?? ""}`.trim()}
      style={gridStyle}
      role="img"
      aria-label={`${character.name}, a ${character.personality.toLowerCase()} companion`}
    >
      {character.pixels.flatMap((row, rowIndex) =>
        row.split("").map((key, colIndex) => {
          const color = character.palette[key];
          // Dynamic per-data colour: each cell's fill comes from the character's
          // palette, so it must be an inline style rather than a static class.
          const cellStyle = color ? { backgroundColor: color } : undefined;
          return (
            <span
              key={`${rowIndex}-${colIndex}`}
              className={styles.cell}
              style={cellStyle}
              aria-hidden="true"
            />
          );
        }),
      )}
    </div>
  );
}
