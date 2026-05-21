import { describe, expect, it } from "vitest";

import {
  getStackChain,
  getStackRoot,
  getSuccessor,
  getVisibleStackHabit,
  groupHabitsByStack,
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
