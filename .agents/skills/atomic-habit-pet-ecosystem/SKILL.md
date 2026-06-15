---
name: atomic-habit-pet-ecosystem
description: Data model, pure engine, mutation API, store wiring, and UI for the Atomicly Pet Ecosystem (`/pet`) — a procedural, evolving, mortal Tamagotchi world with no hardcoded pets. Use when touching anything under `lib/pet/`, `lib/repositories/pets.ts`, `lib/actions/pets.ts`, `lib/contracts/pet.ts`, `app/(root)/pet/`, or `components/pet/`; when balancing food/decay/evolution; or when reasoning about adoption caps, feeding, moods, or permanent death. Source of truth for the food economy, survival tuning, and ecosystem rules.
---

# Atomicly Pet Ecosystem

> **TL;DR:** Every pet is generated deterministically from a **genome** (`seed` + `temperament`) — there are **no hardcoded pets**. Pure engine in `lib/pet/`, persisted in Postgres (`Pet` + `PetFeedLog`) via `lib/repositories/pets.ts`, mutated through `lib/actions/pets.ts`, cached optimistically in `lib/store.ts`, rendered under `app/(root)/pet/`. Feeding is funded by doing habits & journalling. Pets decay in real time and **die permanently** if neglected.

## 1. Where things live

| Layer | File(s) |
|---|---|
| Pure engine (barrel) | `lib/pet/index.ts` — `MAX_ALIVE_PETS=3`, `PetRecord`, `PetView`, `buildPetView(record, ctx)` |
| Genome / temperaments | `lib/pet/genome.ts` — seeded PRNG, `TEMPERAMENTS`, `randomSeed`, trait decoding |
| Sprite | `lib/pet/sprite.ts` — deterministic bilateral-symmetry pixel art from `(genome, stage)` |
| Evolution | `lib/pet/evolution.ts` — stage ladder, `stageForFeeds`, `feedsUntilNextStage`, `didEvolve` |
| Simulation | `lib/pet/simulation.ts` — per-day vitals decay, feeding, permanent death |
| Mood | `lib/pet/mood.ts` — `deriveMood(vitals, ctx)` → 8 moods + idle animation |
| Food economy | `lib/pet/food.ts` — `FOOD_PER_HABIT`, `FOOD_PER_JOURNAL`, `earnedFoodFrom` |
| Age label | `lib/pet/age.ts` — `formatAge(ageMs)` |
| Repository | `lib/repositories/pets.ts` — `listPets`, `adoptPet`, `feedPet`, `buryPet`, `deletePet`, `countEarnedFoodToday`, `countFeedsUsedToday` |
| Server actions | `lib/actions/pets.ts` — `adoptPetAction`, `feedPetAction`, `buryPetAction`, `deletePetAction` |
| Zod contracts | `lib/contracts/pet.ts` — `petAdoptSchema`, `petFeedSchema`, `petBurySchema`, `petDeleteSchema` |
| Store wiring | `lib/store.ts` — `adoptPet`/`feedPet`/`buryPet`/`deletePet` callbacks; state `pets`, `petFeedsUsedToday` |
| UI | `app/(root)/pet/` — `page.tsx`, `PetEcosystem.tsx`, `PetCard.tsx`, `AdoptPanel.tsx`, `page.module.css` |
| Sprite rendering | `components/pet/MoodSprite.tsx` (Framer Motion idle loops) over `components/pet/PixelSprite.tsx` |
| DB schema | `prisma/schema.prisma` — `Pet`, `PetFeedLog` models |
| Nav | `components/Nav.tsx` — `/pet` lives in its own **`Companion`** group |

## 2. Data flow

1. `getStoreSnapshot` loads `pets` + `petFeedsUsedToday` into the store (`app/(root)/layout.tsx`).
2. `PetEcosystem` converts each store `Pet` → engine `PetRecord` and calls `buildPetView(record, { now, hour })` every `useNow` tick to simulate vitals forward and derive sprite/mood/stage live.
3. Mutations go through the store callbacks → server actions → `lib/repositories/pets.ts` → Prisma. The repo is **authoritative**; the store is optimistic.

## 3. The economy (food)

`lib/pet/food.ts` is the single source of truth, used by **both** client (optimistic) and server (authoritative):

- **`FOOD_PER_HABIT = 3`** — each habit completed today grants 3 feeds.
- **`FOOD_PER_JOURNAL = 1`** — each reflective act grants 1: a Journal-tab entry, a habit journal note, and a saved Weekly Review.
- `earnedFoodFrom({ habitsCompleted, journalEntries, habitJournals, weeklyReviews })` totals them.

**Shared daily pool:** `availableFood = earnedToday − feedsUsedToday`.
- Server: `countEarnedFoodToday(userId, dateKey, now, db)` counts habits (`done`), journal entries, habit-journal notes (`journal != null`) by `dateKey`, and weekly reviews by `updatedAt` within today's **local-day window**. `countFeedsUsedToday` sums `PetFeedLog.amount`.
- Client: `PetEcosystem` mirrors the same counts from store arrays (habits' `history[today]`, `store.journal` by `date`, `store.weeklyReviews` by `updatedAt` local-day) because the `(root)` layout does **not** re-run on client-side nav, so optimistic food must be computed client-side too.

## 4. Simulation & survival (`lib/pet/simulation.ts`)

Per-**day** model (was per-hour in the first version):

| Constant | Value | Meaning |
|---|---|---|
| `MAX_SATIETY` | `3` | banks ~3 days of food |
| `MAX_HEALTH` | `100` | health only drains via starvation |
| `SATIETY_DECAY_PER_DAY` | `0.7` | × `metabolism`; kept < 1 so **one feed/day survives** even fiery (1.3 → 0.91/day) |
| `HEALTH_DRAIN_PER_DAY` | `25` | × `1/resilience`; ~4 days of empty belly → death |
| `HEALTH_REGEN_PER_DAY` | `30` | recovers while satiety > 0 |

- `simulatePet(vitals, tuning, now)` is **pure** and idempotent ("simulate on read"). Satiety decays first; health only drains **after** satiety hits 0; death pins a precise `diedAt` and freezes the pet (no resurrection).
- `feedVitals`, `satietyCapacity` (`MAX_SATIETY − ceil(satiety)`), `initialVitals` (satiety `round(MAX/2)=2`, full health), `tuningFor(temperament)`, `satietyRatio`, `healthRatio`.
- **Schema quirk:** `Pet.satiety @default(4)` is a harmless fallback only — `adoptPet` always sets satiety explicitly, so the >`MAX_SATIETY` default never applies (avoids a migration).

## 5. Evolution (`lib/pet/evolution.ts`)

Stages by **lifetime** feeds (`totalFeeds`), thresholds `STAGE_FEED_THRESHOLDS = [0, 1, 8, 20, 45]`:
`egg → hatchling → juvenile → adult → elder`. `didEvolve(before, after)` flags a stage crossing so the UI can celebrate. Note: with `FOOD_PER_HABIT=3`, lifetime feeds (and thus evolution) accrue ~3× faster than the original 1-feed model.

## 6. Moods (`lib/pet/mood.ts`)

`deriveMood(vitals, { now, hour })` resolves one of **8** moods (each with an idle animation), in **priority order**:

`dead` (not alive) → `sick` (healthRatio ≤ 0.3) → `excited` (just fed within ~90s & satiety > 0.25) → `inLove` (satiety ≥ 0.95 & health ≥ 0.95) → `hungry` (satietyRatio ≤ 0.15) → `sleeping` (night: hour ≥ 22 or < 6, & satiety > 0.3) → `happy` (satietyRatio ≥ 0.6) → `content` (else).

Thresholds use **ratios** (`satiety/MAX_SATIETY`), so changing `MAX_SATIETY` is mood-safe. All 8 are reachable.

## 7. Ecosystem rules (`lib/repositories/pets.ts`)

- **Alive cap:** at most `MAX_ALIVE_PETS = 3` alive pets (defined once in `lib/pet/index.ts`, re-exported from the repo so client & server share it).
- **Monthly adoption limit:** `adoptPet` blocks if any `Pet.bornAt` falls in the current calendar month (local time). **Releasing/deleting a pet frees that month's slot immediately** — a delete-then-adopt works instantly.
- **`feedPet`** returns a `FeedResult` union: `{ ok: true, pet, fedAmount, evolved }` | `{ ok: false, reason: 'not_found'|'dead'|'no_food'|'full', pet? }`. The fed amount is clamped by both remaining food pool and `satietyCapacity`.
- **`buryPet`** removes a pet **only after it has died** ("Lay to rest" in the graveyard). **`deletePet`** removes **any** pet, alive or dead ("Release" button on living cards, confirm-gated in `PetCard`).
- `persistDeathIfNeeded` makes death permanent on read.

## 8. Tests

- Engine units: `lib/pet/__tests__/` — `genome`, `sprite`, `evolution`, `simulation`, `mood`, `food`, `age`.
- Repository integration (mock Prisma): `lib/repositories/__tests__/pets.test.ts` — alive cap, monthly limit, food sources, clamping, evolution, death, bury, delete. Set `process.env.DATABASE_URL` in `beforeEach` (repo calls `validateDatabaseUrl()`).
- Component: `app/(root)/pet/__tests__/PetEcosystem.test.tsx` — food display, feed, adopt, age/feeds, release, journalling food.
- E2E: `e2e/pet.spec.ts` — complete habit → adopt → feed → release (needs Playwright + DB).

## 9. Gotchas

- **No hardcoded pets** — appearance is a pure function of `(seed, temperament, stage)`. Never special-case a named pet.
- Keep the food formula in `earnedFoodFrom` and reuse it on both sides; never duplicate the maths inline.
- Repo count mocks must inspect the `where` clause: `pet.count` answers both alive-count and born-this-month; `habitCheckIn.count` answers both completions and journal notes.
- Pets persist in **Postgres**, not `localStorage` (the legacy `atomicly:pet` mirror is gone).
