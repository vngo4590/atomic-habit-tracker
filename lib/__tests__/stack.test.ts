import { describe, expect, it } from "vitest";

import {
  getChainFrom,
  getPredecessor,
  getStackChain,
  getStackRoot,
  getSuccessor,
  getVisibleStackHabit,
  groupHabitsByStack,
  isInStack,
  stackInsertPatches,
  stackRemovePatches,
  wouldCreateCycle,
} from "@/lib/stack";
import type { Habit } from "@/lib/types";

function makeHabit(id: string, stackNextId?: string | null, history: Habit["history"] = {}): Habit {
  return {
    id,
    name: `Habit ${id}`,
    emoji: "•",
    cue: "",
    craving: "",
    response: "",
    reward: "",
    loopCue: "",
    loopCraving: "",
    loopResponse: "",
    loopReward: "",
    twoMin: "",
    identity: "tester",
    environment: "",
    schedule: "Daily",
    time: "Morning",
    stackNextId: stackNextId ?? null,
    contract: "",
    contractPartners: [],
    history,
    notes: [],
    createdAt: "2030-01-01",
  };
}

describe("getStackRoot", () => {
  it("returns the habit itself when it has no predecessor", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(getStackRoot(habits[0], habits).id).toBe("a");
  });

  it("walks backward to find the root", () => {
    const habits = [makeHabit("root", "mid"), makeHabit("mid", "tail"), makeHabit("tail")];
    expect(getStackRoot(habits[2], habits).id).toBe("root");
  });
});

describe("getStackChain", () => {
  it("returns ordered habits from root to tail", () => {
    const habits = [makeHabit("root", "a"), makeHabit("a", "b"), makeHabit("b")];
    const chain = getStackChain(habits[1], habits);
    expect(chain.map((h) => h.id)).toEqual(["root", "a", "b"]);
  });

  it("returns a single habit for solo habits", () => {
    const habits = [makeHabit("solo")];
    const chain = getStackChain(habits[0], habits);
    expect(chain.map((h) => h.id)).toEqual(["solo"]);
  });
});

describe("getSuccessor", () => {
  it("returns the next habit when one exists", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(getSuccessor(habits[0], habits)?.id).toBe("b");
  });

  it("returns null for the tail", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(getSuccessor(habits[1], habits)).toBeNull();
  });
});

describe("wouldCreateCycle", () => {
  it("detects direct self-reference", () => {
    const habits = [makeHabit("a")];
    expect(wouldCreateCycle("a", "a", habits)).toBe(true);
  });

  it("detects indirect cycle", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    expect(wouldCreateCycle("c", "a", habits)).toBe(true);
  });

  it("allows valid links", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b"), makeHabit("c")];
    expect(wouldCreateCycle("c", "a", habits)).toBe(false);
  });
});

describe("stackInsertPatches", () => {
  it("inserts before a target", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    const patches = stackInsertPatches("c", "before", "a", habits);
    expect(patches).toContainEqual({ id: "c", patch: { stackNextId: "a" } });
  });

  it("inserts after a target", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    const patches = stackInsertPatches("c", "after", "a", habits);
    expect(patches).toContainEqual({ id: "a", patch: { stackNextId: "c" } });
    expect(patches).toContainEqual({ id: "c", patch: { stackNextId: "b" } });
  });
});

describe("stackRemovePatches", () => {
  it("removes a middle habit and re-links neighbors", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    const patches = stackRemovePatches("b", habits);
    expect(patches).toContainEqual({ id: "a", patch: { stackNextId: "c" } });
    expect(patches).toContainEqual({ id: "b", patch: { stackNextId: null } });
  });

  it("removes a tail habit cleanly", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    const patches = stackRemovePatches("b", habits);
    expect(patches).toContainEqual({ id: "a", patch: { stackNextId: null } });
    expect(patches).toContainEqual({ id: "b", patch: { stackNextId: null } });
  });
});

describe("getVisibleStackHabit", () => {
  it("returns the first undone habit in a chain", () => {
    const habits = [
      makeHabit("root", "a", { "2030-01-01": true }),
      makeHabit("a", "b"),
      makeHabit("b"),
    ];
    const visible = getVisibleStackHabit(habits, "2030-01-01");
    expect(visible.map((h) => h.id)).toEqual(["a"]);
  });

  it("returns nothing when all habits in the chain are done", () => {
    const habits = [
      makeHabit("root", "a", { "2030-01-01": true }),
      makeHabit("a", "b", { "2030-01-01": true }),
      makeHabit("b", null, { "2030-01-01": true }),
    ];
    const visible = getVisibleStackHabit(habits, "2030-01-01");
    expect(visible).toHaveLength(0);
  });
});

describe("groupHabitsByStack", () => {
  it("groups chained habits under their root", () => {
    const habits = [makeHabit("root", "a"), makeHabit("a"), makeHabit("solo")];
    const groups = groupHabitsByStack(habits);
    expect(groups.get("root")?.map((h) => h.id)).toEqual(["root", "a"]);
    expect(groups.get("solo")?.map((h) => h.id)).toEqual(["solo"]);
  });
});

describe("getChainFrom", () => {
  it("returns the sub-chain starting at the given habit, not the root", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    expect(getChainFrom(habits[1], habits).map((h) => h.id)).toEqual(["b", "c"]);
  });

  it("is cycle-safe with corrupted data", () => {
    // Cycle: a -> b -> a. getChainFrom must not infinite-loop.
    const habits = [makeHabit("a", "b"), makeHabit("b", "a")];
    const chain = getChainFrom(habits[0], habits);
    expect(chain.map((h) => h.id)).toEqual(["a", "b"]);
  });
});

describe("getPredecessor", () => {
  it("returns the habit pointing to this one", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(getPredecessor(habits[1], habits)?.id).toBe("a");
  });

  it("returns null for chain heads and solo habits", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b"), makeHabit("solo")];
    expect(getPredecessor(habits[0], habits)).toBeNull();
    expect(getPredecessor(habits[2], habits)).toBeNull();
  });
});

describe("isInStack", () => {
  it("flags habits with a successor", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(isInStack(habits[0], habits)).toBe(true);
  });

  it("flags habits with a predecessor (tail)", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    expect(isInStack(habits[1], habits)).toBe(true);
  });

  it("returns false for solo habits", () => {
    const habits = [makeHabit("solo"), makeHabit("a", "b"), makeHabit("b")];
    expect(isInStack(habits[0], habits)).toBe(false);
  });
});

describe("wouldCreateCycle (additional)", () => {
  it("rejects extending a 3-chain into a cycle", () => {
    // a -> b -> c, attempting b -> a.
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    expect(wouldCreateCycle("b", "a", habits)).toBe(true);
  });

  it("permits linking onto a long chain when no cycle results", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c"), makeHabit("d")];
    expect(wouldCreateCycle("c", "d", habits)).toBe(false);
  });
});

describe("stackInsertPatches (ordering)", () => {
  it("for insert-before with a predecessor: rewires predecessor BEFORE habit -> target", () => {
    // Existing: p -> t (target). Insert h before t. Want: p -> h, then h -> t.
    const habits = [makeHabit("p", "t"), makeHabit("t"), makeHabit("h")];
    const patches = stackInsertPatches("h", "before", "t", habits);
    expect(patches).toEqual([
      { id: "p", patch: { stackNextId: "h" } },
      { id: "h", patch: { stackNextId: "t" } },
    ]);
  });

  it("for insert-after with a successor: frees target's pointer BEFORE re-pointing habit", () => {
    // Existing: t -> n (target's successor). Insert h after t. Want: t -> h, then h -> n.
    const habits = [makeHabit("t", "n"), makeHabit("n"), makeHabit("h")];
    const patches = stackInsertPatches("h", "after", "t", habits);
    expect(patches).toEqual([
      { id: "t", patch: { stackNextId: "h" } },
      { id: "h", patch: { stackNextId: "n" } },
    ]);
  });

  it("for insert-before with no predecessor: only sets habit -> target", () => {
    const habits = [makeHabit("t"), makeHabit("h")];
    const patches = stackInsertPatches("h", "before", "t", habits);
    expect(patches).toEqual([{ id: "h", patch: { stackNextId: "t" } }]);
  });

  it("for insert-after at tail: only sets target -> habit", () => {
    const habits = [makeHabit("t"), makeHabit("h")];
    const patches = stackInsertPatches("h", "after", "t", habits);
    expect(patches).toEqual([{ id: "t", patch: { stackNextId: "h" } }]);
  });
});

describe("stackRemovePatches (ordering)", () => {
  it("frees the removed habit BEFORE rewiring the predecessor", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "c"), makeHabit("c")];
    const patches = stackRemovePatches("b", habits);
    expect(patches).toEqual([
      { id: "b", patch: { stackNextId: null } },
      { id: "a", patch: { stackNextId: "c" } },
    ]);
  });

  it("removes a root with a successor by only freeing the removed habit", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b")];
    const patches = stackRemovePatches("a", habits);
    expect(patches).toEqual([{ id: "a", patch: { stackNextId: null } }]);
  });

  it("returns an empty patch list for a solo habit", () => {
    const habits = [makeHabit("solo")];
    expect(stackRemovePatches("solo", habits)).toEqual([]);
  });
});

describe("cycle safety on corrupted data", () => {
  it("getStackRoot terminates on a circular chain", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "a")];
    const root = getStackRoot(habits[0], habits);
    expect(["a", "b"]).toContain(root.id);
  });

  it("getStackChain terminates on a circular chain without duplicates", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "a")];
    const chain = getStackChain(habits[0], habits);
    expect(chain.map((h) => h.id).sort()).toEqual(["a", "b"]);
  });

  it("groupHabitsByStack terminates on a circular chain", () => {
    const habits = [makeHabit("a", "b"), makeHabit("b", "a")];
    const groups = groupHabitsByStack(habits);
    // One group per discovered root; defensive behaviour may treat both as
    // roots, so we just assert that the traversal terminates and that every
    // habit id appears at least once.
    const ids = new Set(Array.from(groups.values()).flat().map((h) => h.id));
    expect(ids.has("a")).toBe(true);
    expect(ids.has("b")).toBe(true);
  });
});
