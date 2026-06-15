-- CreateTable
CREATE TABLE "Pet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "temperament" TEXT NOT NULL,
    "seed" INTEGER NOT NULL,
    "totalFeeds" INTEGER NOT NULL DEFAULT 0,
    "satiety" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "health" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "bornAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSimAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAlive" BOOLEAN NOT NULL DEFAULT true,
    "diedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PetFeedLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "petId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PetFeedLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pet_userId_isAlive_idx" ON "Pet"("userId", "isAlive");

-- CreateIndex
CREATE INDEX "PetFeedLog_userId_dateKey_idx" ON "PetFeedLog"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "PetFeedLog_petId_dateKey_idx" ON "PetFeedLog"("petId", "dateKey");

-- AddForeignKey
ALTER TABLE "Pet" ADD CONSTRAINT "Pet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetFeedLog" ADD CONSTRAINT "PetFeedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PetFeedLog" ADD CONSTRAINT "PetFeedLog_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
