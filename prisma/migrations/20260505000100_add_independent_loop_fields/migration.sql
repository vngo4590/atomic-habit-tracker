-- Add independent habit loop fields so the loop can diverge from the four laws.
ALTER TABLE "Habit" ADD COLUMN "loopCue" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Habit" ADD COLUMN "loopCraving" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Habit" ADD COLUMN "loopResponse" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Habit" ADD COLUMN "loopReward" TEXT NOT NULL DEFAULT '';

UPDATE "Habit"
SET
  "loopCue" = "cue",
  "loopCraving" = "craving",
  "loopResponse" = "response",
  "loopReward" = "reward";
