-- Drop the old `stack` column (unused since reference UI port)
ALTER TABLE "Habit" DROP COLUMN "stack";

-- Add `stackAfterId` for habit chaining
ALTER TABLE "Habit" ADD COLUMN "stackAfterId" TEXT;
