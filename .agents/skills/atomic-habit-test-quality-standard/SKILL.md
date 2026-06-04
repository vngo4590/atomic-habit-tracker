---
name: atomic-habit-test-quality-standard
description: The non-negotiable quality bar every Atomicly test must meet — business-logic fidelity, Given/When/Then comment structure, describe/it naming, and suite organization. Use when writing, reviewing, or critiquing any unit, integration, or end-to-end test in this repo to ensure each test asserts a product-visible outcome rather than an implementation detail.
---

# Atomicly Test Quality Standard

> **TL;DR:** Tests validate business logic, not code. Comment with Given/When/Then. Name in product language. Survive a behaviour-preserving refactor.

This skill defines the **bar every test must meet** at every tier (unit, integration, E2E). It is referenced by `atomic-habit-test-engineer`, `atomic-test-orchestrator`, and the three tier-specialist agents. Edit here, not in the consumers.

## 1. The Business-Logic Bar (Non-Negotiable)

1. The `describe` block names a **feature or behaviour** in product terms (habits, identity votes, streaks, schedules, journals, weekly review) — not the internal function call.
2. The `it` description is a present-tense, observable-outcome sentence: `"increments streak when check-in is consecutive"` — not `"calls update with new streak value"`.
3. Each test asserts **at least one observable outcome** — a returned value, a persisted user-visible field, an API envelope shape + status, a thrown error a UI would surface, or a DOM state a real user would see.
4. Mock-invocation assertions (`expect(mock).toHaveBeenCalledWith(...)`) are **supporting evidence only**, never the sole assertion of a test.
5. The test would **still pass** after a behaviour-preserving refactor that renamed internal helpers or restructured private code paths. If a refactor would force you to rewrite the assertion, the assertion is coupled to mechanism — rewrite or drop it.
6. Every test traces back to a source-of-truth statement in `openspec/specs/`, the active proposal under `openspec/changes/`, or `AGENTS.md` § "App Context". If no source-of-truth covers the behaviour, **flag the gap to the user** — do not invent a contract.

## 2. Given / When / Then Comments

Every `it()` body must carry inline comments in this structure:

```typescript
it("saves a new habit and revalidates the habits route", async () => {
  // Given: an authenticated user and a valid habit payload
  mocks.requireUserId.mockResolvedValue("user_1");
  mocks.createHabit.mockResolvedValue(testHabit({ id: "h_new", name: "Run" }));

  // When: createHabitAction is called with a minimal valid payload
  const { createHabitAction } = await import("@/lib/actions/domain");
  const result = await createHabitAction({ name: "Run", identity: "runner", cue: "After alarm" });

  // Then: the habit is persisted and the cache is invalidated
  expect(result).toMatchObject({ id: "h_new", name: "Run" });
  expect(mocks.createHabit).toHaveBeenCalledWith("user_1", expect.objectContaining({ name: "Run" }));
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/habits");
});
```

Comments describe **intent** and **workflow**, not mechanics. A reader unfamiliar with the code should understand what is being checked from the comments alone.

## 3. Naming

- `describe` block: name the module or feature being tested (`"createHabitAction"`, `"streak helper"`, `"auth route guards"`).
- Nested `describe` blocks: group by scenario or variant (`"when the user is unauthenticated"`, `"with an invalid payload"`).
- `it` description: plain English, present tense, describes the observable outcome (`"returns 401 when session is missing"`, `"increments streak for consecutive check-ins"`).

## 4. Suite Organization

```typescript
describe("<module or feature name>", () => {
  beforeEach(() => { /* shared setup */ });

  describe("<scenario group>", () => {
    it("<expected outcome>", async () => {
      // Given ...
      // When ...
      // Then ...
    });
  });

  describe("<error / edge case group>", () => {
    it("<expected outcome>", async () => { ... });
  });
});
```

Group tests by:
1. Happy path (normal usage, typical inputs)
2. Boundary / edge cases (empty, zero, max, dates at boundaries) — see `atomic-habit-test-edge-cases`
3. Error / rejection cases (invalid input, auth failure, DB error)
4. Concurrent / ordering edge cases where relevant

## 5. Scope Revalidation

Before marking a test suite complete, cross-check against:

1. **Project purpose**: does this feature exist to help users build atomic habits — designing habit loops, casting identity votes, journaling, reviewing weekly, learning from the curriculum? If yes, tests should reflect that domain language.
2. **OpenSpec tasks**: if there is an active OpenSpec change, confirm acceptance criteria for each task have corresponding coverage.
3. **Canonical specs**: check `openspec/specs/` for the relevant spec (`habit-api`, `user-auth`, `test-coverage`, etc.).
4. **AGENTS.md constraints**: confirm no test in the deterministic suite requires Docker, live DB, or network access.

## See Also

- `atomic-habit-test-tier-policy` — which tier to write at and what each tier may touch
- `atomic-habit-test-edge-cases` — the edge-case checklist
- `atomic-habit-test-mocking-patterns` — mocking patterns and jsdom/ESM gotchas
- `atomic-habit-test-engineer` — overall test orchestration
