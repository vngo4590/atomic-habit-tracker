import type {
  FormationVerdict,
  Habit,
  Identity,
  JournalEntry,
  StoreSnapshot,
  StoreState,
  UserPreferences,
  WeeklyReview,
  WeeklyReviewAnswers,
} from "@/lib/types";
import type { AuthUserRecord } from "@/lib/repositories/users";

export function testSessionUser(patch: Partial<{ id: string; name: string | null; email: string | null; image: string | null }> = {}) {
  return {
    id: "user_1",
    name: "Ada",
    email: "ada@example.com",
    image: null,
    ...patch,
  };
}

export function testAuthUserRecord(patch: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: "user_1",
    name: "Ada",
    email: "ada@example.com",
    image: null,
    passwordHash: "hash",
    sessionsValidFrom: null,
    ...patch,
  };
}

export function testPreferences(patch: Partial<UserPreferences> = {}): UserPreferences {
  return {
    theme: "light",
    accentHue: 60,
    remindersEnabled: true,
    weeklyReviewNudge: true,
    accountabilityNudge: false,
    onboardingSeen: false,
    lessonMode: "sequential",
    timezone: "UTC",
    ...patch,
  };
}

export function testHabit(patch: Partial<Habit> = {}): Habit {
  return {
    id: "habit_1",
    name: "Read",
    emoji: "*",
    cue: "After coffee",
    craving: "To feel clear",
    response: "Read one page",
    reward: "Mark the streak",
    loopCue: "Coffee poured",
    loopCraving: "Feel clear",
    loopResponse: "Read one page",
    loopReward: "Check it off",
    twoMin: "Open the book",
    identity: "reader",
    environment: "Book on desk",
    schedule: "Daily",
    time: "Morning",
    stackNextId: null,
    contract: "",
    contractPartners: [],
    history: {},
    notes: [],
    createdAt: "2030-01-01",
    ...patch,
  };
}

export function testJournalEntry(patch: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "journal_1",
    date: "2030-01-02",
    title: "Small win",
    body: "Read before breakfast.",
    mood: "good",
    tags: [],
    ...patch,
  };
}

export function testWeeklyReviewAnswers(patch: Partial<WeeklyReviewAnswers> = {}): WeeklyReviewAnswers {
  return {
    wentWell: "Kept the cue visible.",
    smallestFix: "Put the book on the keyboard.",
    identityVote: "I am a reader.",
    ...patch,
  };
}

export function testWeeklyReview(patch: Partial<WeeklyReview> = {}): WeeklyReview {
  return {
    weekStartKey: "2030-01-01",
    updatedAt: "2030-01-07T00:00:00.000Z",
    ...testWeeklyReviewAnswers(),
    ...patch,
  };
}

export function testIdentity(patch: Partial<Identity> = {}): Identity {
  return {
    statement: "I am someone who keeps promises to myself.",
    values: ["Consistency"],
    ...patch,
  };
}

export function testFormationVerdict(patch: Partial<FormationVerdict> = {}): FormationVerdict {
  return {
    habitId: "habit_1",
    score: 4.2,
    reflection: "The cue is stable.",
    formed: true,
    reviewedAt: "2030-01-10T00:00:00.000Z",
    ...patch,
  };
}

export function testStoreSnapshot(patch: Partial<StoreSnapshot> = {}): StoreSnapshot {
  return {
    habits: [testHabit()],
    journal: [testJournalEntry()],
    identity: testIdentity(),
    weeklyReview: testWeeklyReviewAnswers(),
    weeklyReviews: [testWeeklyReview()],
    completedLessons: [1],
    formationVerdicts: [testFormationVerdict()],
    preferences: testPreferences(),
    pets: [],
    petFeedsUsedToday: 0,
    ...patch,
  };
}

export function testStoreContext(patch: Partial<StoreState> = {}): StoreState {
  const snapshot = testStoreSnapshot();
  return {
    habits: snapshot.habits,
    setHabits: () => {},
    addHabit: () => {},
    toggleHabit: () => {},
    logCheckIn: () => {},
    updateHabit: () => {},
    applyStackMutation: async () => {},
    deleteHabit: () => {},
    journal: snapshot.journal,
    addJournal: () => {},
    updateJournal: () => {},
    identity: snapshot.identity,
    setIdentity: () => {},
    weeklyReview: snapshot.weeklyReview,
    weeklyReviews: snapshot.weeklyReviews ?? [],
    setWeeklyReview: () => {},
    completedLessons: new Set(snapshot.completedLessons),
    lessonMode: snapshot.preferences.lessonMode,
    setLessonMode: () => {},
    markLessonRead: () => {},
    formationVerdicts: snapshot.formationVerdicts,
    saveFormationVerdict: () => {},
    preferences: snapshot.preferences,
    setPreferences: () => {},
    pets: snapshot.pets ?? [],
    petFeedsUsedToday: snapshot.petFeedsUsedToday ?? 0,
    adoptPet: async () => {},
    feedPet: async () => {},
    buryPet: async () => {},
    deletePet: async () => {},
    toast: null,
    showToast: () => {},
    streak: () => 0,
    longestStreak: () => 0,
    completionRate: () => 0,
    ...patch,
  };
}
