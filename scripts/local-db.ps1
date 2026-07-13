param(
  [Parameter(Position = 0)]
  [ValidateSet("up", "down", "logs", "setup", "clean", "reset", "migrate-dev", "migrate-deploy", "seed", "random-data", "randomize", "randomize-data", "fake-history", "history-data")]
  [string]$Action = "setup",

  [string]$MigrationName = "local-change",
  [Parameter(Position = 1)]
  [int]$Users = 3,
  [Parameter(Position = 2)]
  [int]$HabitsPerUser = 5,
  [Parameter(Position = 3)]
  [int]$Days = 30,
  [switch]$CleanFirst,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$TempRandomDataScript = Join-Path $PSScriptRoot ".local-db-random-data.tmp.ts"

function Invoke-RepoCommand {
  param(
    [string]$Executable,
    [string[]]$Arguments = @()
  )

  Push-Location $RepoRoot
  try {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Assert-LocalDatabaseUrl {
  $envFile = Join-Path $RepoRoot ".env"
  if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
      if ($_ -match '^\s*DATABASE_URL\s*=\s*"?([^"#]+)"?\s*$') {
        $env:DATABASE_URL = $Matches[1]
      }
    }
  }

  if ($env:NODE_ENV -eq "production") {
    throw "Refusing to run local database script with NODE_ENV=production."
  }

  if (-not $env:DATABASE_URL) {
    throw "DATABASE_URL is not set. Create .env from .env.example first."
  }

  # The safety boundary is the host: only ever mutate a database on this
  # machine (localhost / 127.0.0.1), never a remote or production server. The
  # port is intentionally not pinned to 55432 because local setups may remap it
  # (e.g. to 15432 when WinNAT reserves 55432). We still require the "atomicly"
  # database name so we don't clobber some other local Postgres database.
  if ($env:DATABASE_URL -notmatch "(localhost|127\.0\.0\.1):\d+/atomicly\b") {
    throw "Refusing to modify a non-local Atomicly database: $env:DATABASE_URL"
  }
}

function Start-LocalDatabase {
  Invoke-RepoCommand "docker" @("compose", "up", "-d", "postgres")
}

function Invoke-Prisma {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  Invoke-RepoCommand "npx" (@("prisma") + $Args)
}

function Invoke-Seed {
  Assert-LocalDatabaseUrl
  Invoke-RepoCommand "npx" @("tsx", "prisma/seed.ts")
}

function Clear-LocalData {
  Assert-LocalDatabaseUrl

  if (-not $Force) {
    $answer = Read-Host "This will delete all local Atomicly data from Docker Postgres. Type CLEAN to continue"
    if ($answer -ne "CLEAN") {
      Write-Host "Cancelled."
      return
    }
  }

  $sql = @"
TRUNCATE
  "Account",
  "Session",
  "VerificationToken",
  "UserPreference",
  "IdentityProfile",
  "HabitCheckIn",
  "HabitNote",
  "HabitContract",
  "JournalEntry",
  "WeeklyReview",
  "LessonProgress",
  "FormationVerdict",
  "Habit",
  "User"
RESTART IDENTITY CASCADE;
"@

  $sql | docker compose exec -T postgres psql -U postgres -d atomicly
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to clean local database."
  }
}

function Write-RandomDataScript {
  $script = @'
import "dotenv/config";

import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db/client";
import { FormationDecision } from "../lib/generated/prisma/enums";
import { MAX_ACTIVE_HABITS } from "../lib/habit-cap";

const users = Number(process.env.ATOMICLY_RANDOM_USERS ?? "3");
const habitsPerUser = Number(process.env.ATOMICLY_RANDOM_HABITS ?? "5");
const days = Number(process.env.ATOMICLY_RANDOM_DAYS ?? "30");

const habitNames = [
  "Morning walk",
  "Read ten pages",
  "Plan tomorrow",
  "Drink water",
  "Stretch",
  "Inbox zero",
  "Meditate",
  "Practice coding",
  "Cook at home",
  "Evening review",
];

const identities = [
  "I am someone who keeps promises to myself.",
  "I am a consistent learner.",
  "I am the kind of person who designs my environment.",
  "I am someone who shows up even on busy days.",
];

function dateKey(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to generate random data in production.");
  }

  const passwordHash = await hashPassword("Atomicly1!");

  for (let userIndex = 1; userIndex <= users; userIndex += 1) {
    const email = `demo${userIndex}@atomicly.local`;

    await db.user.deleteMany({ where: { email } });

    const user = await db.user.create({
      data: {
        email,
        name: `Demo User ${userIndex}`,
        passwordHash,
        preferences: {
          create: {
            timezone: "UTC",
            accentHue: 35 + userIndex * 18,
            onboardingSeen: true,
          },
        },
        identityProfile: {
          create: {
            statement: pick(identities, userIndex),
            values: ["Consistency", "Focus", "Health"].slice(0, 1 + (userIndex % 3)),
          },
        },
      },
    });

    const habits = [];
    for (let habitIndex = 1; habitIndex <= habitsPerUser; habitIndex += 1) {
      const name = pick(habitNames, habitIndex + userIndex);
      const habit = await db.habit.create({
        data: {
          userId: user.id,
          name,
          emoji: ["*", "+", "#", ">"][habitIndex % 4],
          identity: pick(identities, habitIndex),
          cue: "After breakfast",
          craving: "Feel clear and in control",
          response: name.toLowerCase(),
          reward: "Mark the day as a win",
          loopCue: "Kitchen counter",
          loopCraving: "A lighter day",
          loopResponse: name.toLowerCase(),
          loopReward: "Coffee after completion",
          twoMin: `Do the smallest version of ${name.toLowerCase()}`,
          environment: "Keep the tool visible the night before",
          schedule: habitIndex % 2 === 0 ? "Weekdays" : "Daily",
          time: habitIndex % 3 === 0 ? "Evening" : "Morning",
          sortOrder: habitIndex,
          notes: {
            create: {
              userId: user.id,
              body: `Remember why ${name.toLowerCase()} matters.`,
            },
          },
          contract: {
            create: {
              userId: user.id,
              terms: `Complete ${name.toLowerCase()} at least 4 times this week.`,
              partners: ["Accountability partner"],
            },
          },
        },
      });
      habits.push(habit);
    }

    // Link a deterministic subset of habits into 1-2 chains so demo data
    // includes habit stacks alongside solo habits. Subsets never overlap so
    // we never violate the stackNextId @unique constraint.
    {
      const stackable = habits.slice();
      const used = new Set<string>();
      const chainCount = stackable.length >= 4 ? 2 : stackable.length >= 2 ? 1 : 0;
      let cursor = userIndex;
      for (let c = 0; c < chainCount; c += 1) {
        const remaining = stackable.filter((h) => !used.has(h.id));
        if (remaining.length < 2) break;
        const maxLen = Math.min(4, remaining.length);
        const chainLen = 2 + (cursor % Math.max(1, maxLen - 1));
        const chain: typeof stackable = [];
        for (let i = 0; i < chainLen; i += 1) {
          const pickIndex = (cursor + i * 3) % remaining.length;
          const candidate = remaining[pickIndex];
          if (used.has(candidate.id) || chain.find((h) => h.id === candidate.id)) {
            const fallback = remaining.find((h) => !used.has(h.id) && !chain.find((m) => m.id === h.id));
            if (!fallback) break;
            chain.push(fallback);
          } else {
            chain.push(candidate);
          }
        }
        if (chain.length < 2) continue;
        for (let i = 0; i < chain.length - 1; i += 1) {
          await db.habit.update({
            where: { id: chain[i].id },
            data: { stackNextId: chain[i + 1].id },
          });
          used.add(chain[i].id);
        }
        used.add(chain[chain.length - 1].id);
        cursor += chain.length + 1;
      }
    }

    for (let day = 0; day < days; day += 1) {
      const key = dateKey(day);

      for (const [habitIndex, habit] of habits.entries()) {
        if ((day + habitIndex + userIndex) % 5 === 0) {
          continue;
        }

        await db.habitCheckIn.create({
          data: {
            userId: user.id,
            habitId: habit.id,
            dateKey: key,
            done: true,
            mood: 3 + ((day + habitIndex) % 3),
            journal: `Completed ${habit.name.toLowerCase()} on ${key}.`,
          },
        });
      }

      if (day % 3 === 0) {
        await db.journalEntry.create({
          data: {
            userId: user.id,
            dateKey: key,
            title: `Reflection for ${key}`,
            body: "Small wins compound when the system is easy to repeat.",
            mood: ["good", "focused", "steady"][day % 3],
            tags: ["demo", "reflection"],
          },
        });
      }

      if (day % 7 === 0) {
        await db.weeklyReview.create({
          data: {
            userId: user.id,
            weekStartKey: key,
            wentWell: "Kept the core habits visible.",
            smallestFix: "Prepare the environment earlier.",
            identityVote: "I showed up consistently.",
          },
        });
      }
    }

    for (let lessonId = 1; lessonId <= Math.min(24, days); lessonId += 1) {
      if (lessonId % 2 === userIndex % 2) {
        await db.lessonProgress.create({
          data: {
            userId: user.id,
            lessonId,
          },
        });
      }
    }

    if (habits[0]) {
      await db.formationVerdict.create({
        data: {
          userId: user.id,
          habitId: habits[0].id,
          score: 82 + userIndex,
          reflection: "The habit is stable enough to keep practicing.",
          decision: FormationDecision.keep_practicing,
        },
      });
    }

    // Reflect the active-habit cap (see lib/habit-cap.ts): a user may keep at
    // most MAX_ACTIVE_HABITS *active* habits — ones that are not archived and
    // carry no `formed` formation verdict. So the seeded demo matches the
    // product rule, induct any surplus active habits into the Hall of Fame with
    // a `formed` verdict — exactly how the app frees a slot. Inducted habits
    // stay fully trackable, so their check-in history and streaks are kept.
    {
      const formedHabitIds = new Set(
        (
          await db.formationVerdict.findMany({
            where: { userId: user.id, decision: FormationDecision.formed },
            select: { habitId: true },
          })
        ).map((verdict) => verdict.habitId),
      );
      const activeHabits = habits.filter(
        (habit) => !habit.archivedAt && !formedHabitIds.has(habit.id),
      );
      for (const habit of activeHabits.slice(MAX_ACTIVE_HABITS)) {
        await db.formationVerdict.upsert({
          where: { habitId: habit.id },
          update: { decision: FormationDecision.formed },
          create: {
            userId: user.id,
            habitId: habit.id,
            score: 88,
            reflection: "Inducted into the Hall of Fame — this habit is formed.",
            decision: FormationDecision.formed,
          },
        });
      }
    }

    console.log(`Demo user ready: ${email} / Atomicly1!`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
'@

  Set-Content -Path $TempRandomDataScript -Value $script -Encoding utf8
}

function New-RandomData {
  Assert-LocalDatabaseUrl

  if ($CleanFirst) {
    Clear-LocalData
    Invoke-Seed
  }

  Write-RandomDataScript
  try {
    $env:ATOMICLY_RANDOM_USERS = [string]$Users
    $env:ATOMICLY_RANDOM_HABITS = [string]$HabitsPerUser
    $env:ATOMICLY_RANDOM_DAYS = [string]$Days
    Invoke-RepoCommand "npx" @("tsx", "scripts/.local-db-random-data.tmp.ts")
  } finally {
    Remove-Item -LiteralPath $TempRandomDataScript -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_RANDOM_USERS -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_RANDOM_HABITS -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_RANDOM_DAYS -ErrorAction SilentlyContinue
  }
}

function Write-FakeHistoryScript {
  $script = @'
import "dotenv/config";

import { hashPassword } from "../lib/auth/password";
import { db } from "../lib/db/client";
import { FormationDecision } from "../lib/generated/prisma/enums";
import { MAX_ACTIVE_HABITS } from "../lib/habit-cap";

const users = Number(process.env.ATOMICLY_HISTORY_USERS ?? "2");
const habitsPerUser = Number(process.env.ATOMICLY_HISTORY_HABITS ?? "7");
const days = Number(process.env.ATOMICLY_HISTORY_DAYS ?? "90");

const habitTemplates = [
  {
    name: "Morning walk",
    cue: "After putting on shoes",
    response: "walk for ten minutes",
    reward: "listen to a favorite playlist",
    identity: "I am an active person.",
  },
  {
    name: "Read before bed",
    cue: "After setting my alarm",
    response: "read ten pages",
    reward: "turn on the bedside lamp",
    identity: "I am a daily reader.",
  },
  {
    name: "Plan tomorrow",
    cue: "After dinner",
    response: "write tomorrow's top three tasks",
    reward: "close the laptop for the night",
    identity: "I am organized and intentional.",
  },
  {
    name: "Hydration check",
    cue: "After opening the laptop",
    response: "drink a glass of water",
    reward: "mark the habit complete",
    identity: "I take care of my energy.",
  },
  {
    name: "Stretch reset",
    cue: "After the first meeting",
    response: "stretch for two minutes",
    reward: "take three slow breaths",
    identity: "I recover before I burn out.",
  },
  {
    name: "Practice coding",
    cue: "After morning coffee",
    response: "solve one small programming problem",
    reward: "write down one lesson learned",
    identity: "I improve my craft daily.",
  },
  {
    name: "Evening reflection",
    cue: "After brushing teeth",
    response: "write one sentence about the day",
    reward: "check the weekly trend",
    identity: "I learn from my patterns.",
  },
  {
    name: "Tidy workspace",
    cue: "Before leaving the desk",
    response: "clear the desk surface",
    reward: "start tomorrow with less friction",
    identity: "I design my environment.",
  },
];

const journalPrompts = [
  "The cue was easier to notice today.",
  "A small environment change made the habit more automatic.",
  "Energy was lower, so the two-minute version mattered.",
  "The reward felt immediate enough to repeat tomorrow.",
  "Missed one routine, but recovered on the next cue.",
  "The streak is less important than the identity vote.",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)];
}

function dateAt(daysAgo: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

function dateKey(daysAgo: number) {
  return dateAt(daysAgo).toISOString().slice(0, 10);
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to generate fake history in production.");
  }

  const passwordHash = await hashPassword("Atomicly1!");

  for (let userIndex = 1; userIndex <= users; userIndex += 1) {
    const email = `history${userIndex}@atomicly.local`;
    await db.user.deleteMany({ where: { email } });

    const user = await db.user.create({
      data: {
        email,
        name: `History Tester ${userIndex}`,
        passwordHash,
        createdAt: dateAt(days + 14),
        preferences: {
          create: {
            timezone: "UTC",
            onboardingSeen: true,
            remindersEnabled: true,
            weeklyReviewNudge: userIndex % 2 === 0,
            accountabilityNudge: userIndex % 3 === 0,
            accentHue: randomInt(20, 300),
          },
        },
        identityProfile: {
          create: {
            statement: "I am someone who proves my identity with small daily votes.",
            values: ["Consistency", "Focus", "Energy", "Learning"].slice(0, randomInt(2, 4)),
            createdAt: dateAt(days + 10),
          },
        },
      },
    });

    const habits = [];
    for (let habitIndex = 0; habitIndex < habitsPerUser; habitIndex += 1) {
      const template = habitTemplates[(habitIndex + userIndex) % habitTemplates.length];
      const createdDaysAgo = Math.max(days - randomInt(0, Math.max(1, Math.floor(days / 3))), 7);
      const archivedAt = habitIndex % 5 === 4 ? dateAt(randomInt(3, Math.max(4, Math.floor(days / 3)))) : null;

      const habit = await db.habit.create({
        data: {
          userId: user.id,
          name: `${template.name} ${habitIndex + 1}`,
          emoji: ["*", "+", "#", "~"][habitIndex % 4],
          cue: template.cue,
          craving: "Make the next good action feel obvious.",
          response: template.response,
          reward: template.reward,
          loopCue: template.cue,
          loopCraving: "Feel momentum building.",
          loopResponse: template.response,
          loopReward: template.reward,
          twoMin: `Do the smallest version: ${template.response}.`,
          identity: template.identity,
          environment: "Prepare the space before the cue appears.",
          schedule: habitIndex % 2 === 0 ? "Daily" : "Weekdays",
          time: habitIndex % 3 === 0 ? "Evening" : "Morning",
          sortOrder: habitIndex,
          archivedAt,
          createdAt: dateAt(createdDaysAgo),
          contract: {
            create: {
              userId: user.id,
              terms: `Complete ${template.name.toLowerCase()} at least ${randomInt(3, 6)} times per week.`,
              partners: habitIndex % 2 === 0 ? ["Coach", "Friend"] : ["Friend"],
              createdAt: dateAt(createdDaysAgo - 1),
            },
          },
        },
      });

      const noteCount = randomInt(3, 8);
      for (let noteIndex = 0; noteIndex < noteCount; noteIndex += 1) {
        const noteDaysAgo = Math.max(1, createdDaysAgo - noteIndex * randomInt(4, 10));
        await db.habitNote.create({
          data: {
            userId: user.id,
            habitId: habit.id,
            body: `${pick(journalPrompts)} Adjustment ${noteIndex + 1}: reduce friction before ${template.response}.`,
            createdAt: dateAt(noteDaysAgo),
          },
        });
      }

      habits.push(habit);
    }

    // Link a random subset of non-archived habits into 1-2 chains so demo
    // data includes habit stacks. Subsets never overlap (and exclude
    // archived habits) so we never violate the stackNextId @unique
    // constraint.
    {
      const stackable = habits.filter((h) => !h.archivedAt);
      const used = new Set<string>();
      const chainCount = stackable.length >= 4 ? randomInt(1, 2) : stackable.length >= 2 ? 1 : 0;
      for (let c = 0; c < chainCount; c += 1) {
        const remaining = stackable.filter((h) => !used.has(h.id));
        if (remaining.length < 2) break;
        const maxLen = Math.min(4, remaining.length);
        const chainLen = randomInt(2, maxLen);
        const shuffled = remaining.slice();
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
          const j = randomInt(0, i);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const chain = shuffled.slice(0, chainLen);
        for (let i = 0; i < chain.length - 1; i += 1) {
          await db.habit.update({
            where: { id: chain[i].id },
            data: { stackNextId: chain[i + 1].id },
          });
          used.add(chain[i].id);
        }
        used.add(chain[chain.length - 1].id);
      }
    }

    for (let day = days; day >= 0; day -= 1) {
      const key = dateKey(day);
      const dayDate = dateAt(day);

      for (const [habitIndex, habit] of habits.entries()) {
        const archivedDate = habit.archivedAt ? new Date(habit.archivedAt) : null;
        if (dayDate < habit.createdAt || (archivedDate && dayDate > archivedDate)) {
          continue;
        }

        const completionChance = 0.55 + ((habitIndex + userIndex) % 4) * 0.1;
        if (Math.random() <= completionChance) {
          await db.habitCheckIn.create({
            data: {
              userId: user.id,
              habitId: habit.id,
              dateKey: key,
              done: true,
              mood: randomInt(2, 5),
              journal: Math.random() > 0.55 ? pick(journalPrompts) : null,
              createdAt: dayDate,
            },
          });
        }
      }

      if (day % randomInt(2, 4) === 0) {
        await db.journalEntry.create({
          data: {
            userId: user.id,
            dateKey: key,
            title: `Daily reflection ${key}`,
            body: `${pick(journalPrompts)} Tomorrow I will make the cue easier to see.`,
            mood: pick(["good", "steady", "tired", "focused", "motivated"]),
            tags: ["fake-history", day % 2 === 0 ? "habits" : "reflection"],
            createdAt: dayDate,
          },
        });
      }

      if (day % 7 === 0) {
        await db.weeklyReview.create({
          data: {
            userId: user.id,
            weekStartKey: key,
            wentWell: "The easiest habits stayed close to their cues.",
            smallestFix: "Move one cue earlier in the day and prepare the environment.",
            identityVote: "I cast more votes for the identity I want.",
            createdAt: dayDate,
          },
        });
      }
    }

    const completedLessons = randomInt(8, 24);
    for (let lessonId = 1; lessonId <= completedLessons; lessonId += 1) {
      await db.lessonProgress.create({
        data: {
          userId: user.id,
          lessonId,
          completedAt: dateAt(Math.max(0, completedLessons - lessonId)),
        },
      });
    }

    for (const [habitIndex, habit] of habits.entries()) {
      if (habitIndex % 3 !== 0) {
        continue;
      }

      await db.formationVerdict.create({
        data: {
          userId: user.id,
          habitId: habit.id,
          score: randomInt(58, 96),
          reflection: "The habit has enough history to review its formation pattern.",
          decision: habitIndex % 2 === 0 ? FormationDecision.formed : FormationDecision.keep_practicing,
          reviewedAt: dateAt(randomInt(0, 10)),
          createdAt: dateAt(randomInt(0, 10)),
        },
      });
    }

    // Reflect the active-habit cap (see lib/habit-cap.ts): a user may keep at
    // most MAX_ACTIVE_HABITS *active* habits — ones that are not archived and
    // carry no `formed` formation verdict. Archiving and the verdict loop above
    // already retire some habits, but the remainder can still exceed the cap, so
    // induct any surplus active habits into the Hall of Fame with a `formed`
    // verdict — exactly how the app frees a slot. Inducted habits stay fully
    // trackable, so their long check-in history and streaks are preserved.
    {
      const formedHabitIds = new Set(
        (
          await db.formationVerdict.findMany({
            where: { userId: user.id, decision: FormationDecision.formed },
            select: { habitId: true },
          })
        ).map((verdict) => verdict.habitId),
      );
      const activeHabits = habits.filter(
        (habit) => !habit.archivedAt && !formedHabitIds.has(habit.id),
      );
      for (const habit of activeHabits.slice(MAX_ACTIVE_HABITS)) {
        await db.formationVerdict.upsert({
          where: { habitId: habit.id },
          update: { decision: FormationDecision.formed },
          create: {
            userId: user.id,
            habitId: habit.id,
            score: randomInt(80, 98),
            reflection: "Inducted into the Hall of Fame after a strong run.",
            decision: FormationDecision.formed,
            reviewedAt: dateAt(randomInt(0, 8)),
            createdAt: dateAt(randomInt(0, 8)),
          },
        });
      }
    }

    console.log(`Fake history user ready: ${email} / Atomicly1!`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
'@

  Set-Content -Path $TempRandomDataScript -Value $script -Encoding utf8
}

function New-FakeHistoryData {
  Assert-LocalDatabaseUrl

  if ($CleanFirst) {
    Clear-LocalData
    Invoke-Seed
  }

  Write-FakeHistoryScript
  try {
    $env:ATOMICLY_HISTORY_USERS = [string]$Users
    $env:ATOMICLY_HISTORY_HABITS = [string]$HabitsPerUser
    $env:ATOMICLY_HISTORY_DAYS = [string]$Days
    Invoke-RepoCommand "npx" @("tsx", "scripts/.local-db-random-data.tmp.ts")
  } finally {
    Remove-Item -LiteralPath $TempRandomDataScript -Force -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_HISTORY_USERS -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_HISTORY_HABITS -ErrorAction SilentlyContinue
    Remove-Item Env:\ATOMICLY_HISTORY_DAYS -ErrorAction SilentlyContinue
  }
}

switch ($Action) {
  "up" {
    Start-LocalDatabase
  }
  "down" {
    Invoke-RepoCommand "docker" @("compose", "down")
  }
  "logs" {
    Invoke-RepoCommand "docker" @("compose", "logs", "-f", "postgres")
  }
  "setup" {
    Start-LocalDatabase
    Assert-LocalDatabaseUrl
    Invoke-Prisma migrate deploy
    Invoke-Seed
  }
  "clean" {
    Clear-LocalData
  }
  "reset" {
    Invoke-RepoCommand "docker" @("compose", "down", "-v")
    Start-LocalDatabase
    Assert-LocalDatabaseUrl
    Invoke-Prisma migrate deploy
    Invoke-Seed
  }
  "migrate-dev" {
    Start-LocalDatabase
    Assert-LocalDatabaseUrl
    Invoke-Prisma migrate dev --name $MigrationName
  }
  "migrate-deploy" {
    Start-LocalDatabase
    Assert-LocalDatabaseUrl
    Invoke-Prisma migrate deploy
  }
  "seed" {
    Invoke-Seed
  }
  "random-data" {
    Start-LocalDatabase
    New-RandomData
  }
  "randomize" {
    Start-LocalDatabase
    New-RandomData
  }
  "randomize-data" {
    Start-LocalDatabase
    New-RandomData
  }
  "fake-history" {
    Start-LocalDatabase
    New-FakeHistoryData
  }
  "history-data" {
    Start-LocalDatabase
    New-FakeHistoryData
  }
}
