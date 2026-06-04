import { describe, expect, it } from "vitest";

import { MAX_PARTICLES, createParticles } from "@/lib/click-fx";

// A deterministic RNG so particle counts/positions are stable in assertions.
function seededRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

describe("createParticles", () => {
  it("returns no particles for the 'none' effect", () => {
    // Then: themes with no click effect spawn nothing
    expect(createParticles("none", 10, 20)).toEqual([]);
  });

  it("spawns a single expanding ring for 'ripple'", () => {
    // When: a ripple click happens at a point
    const particles = createParticles("ripple", 100, 200, seededRng([0.5]));

    // Then: exactly one particle anchored at the click origin
    expect(particles).toHaveLength(1);
    expect(particles[0]).toMatchObject({ effect: "ripple", x: 100, y: 200, dx: 0, dy: 0 });
  });

  it("spawns a small cluster of upward bubbles for 'bubble'", () => {
    // When: a bubble click happens
    const particles = createParticles("bubble", 50, 60, seededRng([0.5]));

    // Then: several particles, all rising (negative dy) from the same origin
    expect(particles.length).toBeGreaterThan(1);
    for (const p of particles) {
      expect(p.effect).toBe("bubble");
      expect(p.x).toBe(50);
      expect(p.y).toBe(60);
      expect(p.dy).toBeLessThan(0);
    }
  });

  it("spawns radial stars for 'sparkle' with unique ids", () => {
    // When: a sparkle click happens
    const particles = createParticles("sparkle", 0, 0, seededRng([0.25, 0.75]));

    // Then: a ring of stars is produced
    expect(particles.length).toBe(8);
    // And: every particle id is unique so React keys never collide
    const ids = particles.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never exceeds the documented particle safety cap per click", () => {
    // Then: no single effect batch is anywhere near the global cap
    for (const effect of ["ripple", "bubble", "sparkle"] as const) {
      expect(createParticles(effect, 1, 1).length).toBeLessThanOrEqual(MAX_PARTICLES);
    }
  });
});
