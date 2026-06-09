import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PixelSprite } from "@/components/pet/PixelSprite";
import { PET_CHARACTERS } from "@/lib/pet";

describe("PixelSprite", () => {
  it("renders the character's full pixel grid with an accessible label", () => {
    // Given: a known character with a rectangular sprite
    const character = PET_CHARACTERS[0];
    const cellCount = character.pixels.reduce((sum, row) => sum + row.length, 0);

    // When: the sprite is rendered
    const { container } = render(<PixelSprite character={character} />);

    // Then: it exposes an image role describing the creature
    const sprite = screen.getByRole("img");
    expect(sprite.getAttribute("aria-label")).toContain(character.name);

    // And: it draws exactly one cell per pixel in the art
    expect(container.querySelectorAll("span").length).toBe(cellCount);
  });

  it("fills painted pixels with their palette colour and leaves blanks transparent", () => {
    // Given: a character whose first row starts with a transparent pixel
    const character = PET_CHARACTERS[0];

    // When: rendered
    const { container } = render(<PixelSprite character={character} />);
    const cells = Array.from(container.querySelectorAll<HTMLSpanElement>("span"));

    // Then: at least one cell carries an inline background colour (a painted
    // pixel) and at least one carries none (a transparent "." pixel)
    const painted = cells.filter((cell) => cell.style.backgroundColor !== "");
    const blank = cells.filter((cell) => cell.style.backgroundColor === "");
    expect(painted.length).toBeGreaterThan(0);
    expect(blank.length).toBeGreaterThan(0);
  });
});
