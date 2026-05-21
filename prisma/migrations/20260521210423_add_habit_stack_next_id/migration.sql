-- AlterTable
ALTER TABLE "Habit" ADD COLUMN "stackNextId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Habit_stackNextId_key" ON "Habit"("stackNextId");

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_stackNextId_fkey" FOREIGN KEY ("stackNextId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
