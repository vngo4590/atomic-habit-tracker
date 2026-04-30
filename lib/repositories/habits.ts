import { db as defaultDb } from "@/lib/db/client";
import { validateDatabaseUrl } from "@/lib/db/config";
import {
  checkInSchema,
  contractSchema,
  habitCreateSchema,
  habitUpdateSchema,
  noteSchema,
  type CheckInInput,
  type HabitCreateInput,
  type HabitUpdateInput,
} from "@/lib/contracts/domain";
import type { CheckIn, Habit, Note } from "@/lib/types";

type DbClient = typeof defaultDb;
type HabitRecord = {
  id: string;
  name: string;
  emoji: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  twoMin: string;
  stack: string;
  identity: string;
  environment: string;
  schedule: string;
  time: string;
  createdAt: Date;
  checkIns?: Array<{
    dateKey: string;
    done: boolean;
    mood: number | null;
    journal: string | null;
  }>;
  notes?: Array<{ id: string; body: string; createdAt: Date }>;
  contract?: { terms: string; partners: string[] } | null;
};

const habitInclude = {
  checkIns: true,
  notes: { orderBy: { createdAt: "desc" as const } },
  contract: true,
};

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toHabit(record: HabitRecord): Habit {
  const checkIns = record.checkIns ?? [];
  const notes = record.notes ?? [];
  const contract = record.contract;
  const history: Habit["history"] = {};

  for (const checkIn of checkIns) {
    history[checkIn.dateKey] = {
      done: checkIn.done,
      ...(checkIn.mood ? { mood: checkIn.mood } : {}),
      ...(checkIn.journal ? { journal: checkIn.journal } : {}),
    };
  }

  return {
    id: record.id,
    name: record.name,
    emoji: record.emoji,
    cue: record.cue,
    craving: record.craving,
    response: record.response,
    reward: record.reward,
    twoMin: record.twoMin,
    stack: record.stack,
    identity: record.identity,
    environment: record.environment,
    schedule: record.schedule,
    time: record.time,
    contract: contract?.terms ?? "",
    contractPartners: contract?.partners ?? [],
    history,
    notes: notes.map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: toDateKey(note.createdAt),
    })),
    createdAt: toDateKey(record.createdAt),
  };
}

export async function listHabits(userId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const records = await db.habit.findMany({
    where: { userId, archivedAt: null },
    include: habitInclude,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return records.map(toHabit);
}

export async function getHabit(userId: string, habitId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();

  const record = await db.habit.findFirst({
    where: { id: habitId, userId, archivedAt: null },
    include: habitInclude,
  });

  return record ? toHabit(record) : null;
}

export async function createHabit(userId: string, input: HabitCreateInput, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = habitCreateSchema.parse(input);

  const record = await db.habit.create({
    data: {
      userId,
      name: data.name,
      emoji: data.emoji,
      cue: data.cue,
      craving: data.craving,
      response: data.response,
      reward: data.reward,
      twoMin: data.twoMin,
      stack: data.stack,
      identity: data.identity,
      environment: data.environment,
      schedule: data.schedule,
      time: data.time,
      contract: data.contract || data.contractPartners.length
        ? { create: { userId, terms: data.contract, partners: data.contractPartners } }
        : undefined,
    },
    include: habitInclude,
  });

  return toHabit(record);
}

export async function updateHabit(userId: string, habitId: string, input: HabitUpdateInput, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const current = await getHabit(userId, habitId, db);

  if (!current) {
    return null;
  }

  const data = habitUpdateSchema.parse(input);
  const { contract, contractPartners, notes, ...habitPatch } = data;

  await db.habit.update({
    where: { id: habitId },
    data: habitPatch,
  });

  if (contract !== undefined || contractPartners !== undefined) {
    await db.habitContract.upsert({
      where: { habitId },
      create: {
        userId,
        habitId,
        terms: contract ?? "",
        partners: contractPartners ?? [],
      },
      update: {
        terms: contract ?? current.contract,
        partners: contractPartners ?? current.contractPartners,
      },
    });
  }

  if (notes) {
    await db.habitNote.deleteMany({ where: { userId, habitId } });
    if (notes.length) {
      await db.habitNote.createMany({
        data: notes.map((note) => ({
          userId,
          habitId,
          body: note.body,
          createdAt: new Date(`${note.createdAt}T00:00:00.000Z`),
        })),
      });
    }
  }

  return getHabit(userId, habitId, db);
}

export async function archiveHabit(userId: string, habitId: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const current = await getHabit(userId, habitId, db);

  if (!current) {
    return null;
  }

  await db.habit.update({
    where: { id: habitId },
    data: { archivedAt: new Date() },
  });

  return current;
}

export async function upsertCheckIn(userId: string, habitId: string, input: CheckInInput, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = checkInSchema.parse(input);
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  if (!data.done && !data.mood && !data.journal) {
    await db.habitCheckIn.deleteMany({ where: { userId, habitId, dateKey: data.dateKey } });
    return getHabit(userId, habitId, db);
  }

  await db.habitCheckIn.upsert({
    where: { habitId_dateKey: { habitId, dateKey: data.dateKey } },
    create: {
      userId,
      habitId,
      dateKey: data.dateKey,
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
    update: {
      done: data.done,
      mood: data.mood ?? null,
      journal: data.journal ?? null,
    },
  });

  return getHabit(userId, habitId, db);
}

export async function replaceNotes(userId: string, habitId: string, notes: Note[], db: DbClient = defaultDb) {
  return updateHabit(userId, habitId, { notes }, db);
}

export async function addNote(userId: string, habitId: string, body: string, db: DbClient = defaultDb) {
  validateDatabaseUrl();
  const data = noteSchema.parse({ body });
  const habit = await getHabit(userId, habitId, db);

  if (!habit) {
    return null;
  }

  await db.habitNote.create({ data: { userId, habitId, body: data.body } });
  return getHabit(userId, habitId, db);
}

export async function saveContract(
  userId: string,
  habitId: string,
  input: { terms: string; partners: string[] },
  db: DbClient = defaultDb,
) {
  const data = contractSchema.parse(input);
  return updateHabit(userId, habitId, { contract: data.terms, contractPartners: data.partners }, db);
}

export type { CheckIn };
