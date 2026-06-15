import type { StackMutationInput } from "@/lib/contracts/domain";

export interface CheckIn {
  done: boolean;
  mood?: number | null;
  journal?: string;
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  cue: string;
  craving: string;
  response: string;
  reward: string;
  loopCue: string;
  loopCraving: string;
  loopResponse: string;
  loopReward: string;
  twoMin: string;
  identity: string;
  environment: string;
  schedule: string;
  time: string;
  stackNextId?: string | null;
  contract: string;
  contractPartners: string[];
  history: Record<string, boolean | CheckIn>;
  notes: Note[];
  createdAt: string;
}

export type HabitDraft = Partial<
  Omit<Habit, 'id' | 'history' | 'notes' | 'createdAt'>
> & {
  name: string;
  identity: string;
};

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  mood: string;
  tags: string[];
}

export interface Identity {
  statement: string;
  values: string[];
}

export interface ToastState {
  msg: string;
  sub?: string;
  id: number;
}

export interface StoreState {
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  toggleHabit: (id: string, dateKey?: string, payload?: Partial<CheckIn> | null) => void;
  logCheckIn: (id: string, payload: Partial<CheckIn>, dateKey?: string) => void;
  addHabit: (draft: HabitDraft) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  applyStackMutation: (input: StackMutationInput) => Promise<void>;
  deleteHabit: (id: string) => void;
  journal: JournalEntry[];
  addJournal: (entry: Partial<JournalEntry>) => void;
  updateJournal: (id: string, patch: Partial<JournalEntry>) => void;
  identity: Identity;
  setIdentity: (identity: Identity) => void;
  weeklyReview: WeeklyReviewAnswers;
  weeklyReviews: WeeklyReview[];
  setWeeklyReview: (weekStartKey: string, answers: WeeklyReviewAnswers) => void;
  completedLessons: Set<number>;
  lessonMode: LessonMode;
  setLessonMode: (mode: LessonMode) => void;
  markLessonRead: (lessonId: number) => void;
  formationVerdicts: FormationVerdict[];
  saveFormationVerdict: (verdict: FormationVerdict) => void;
  preferences: UserPreferences;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
  pets: Pet[];
  petFeedsUsedToday: number;
  adoptPet: (draft: PetDraft) => Promise<void>;
  feedPet: (petId: string, amount: number) => Promise<void>;
  buryPet: (petId: string) => Promise<void>;
  deletePet: (petId: string) => Promise<void>;
  toast: ToastState | null;
  showToast: (msg: string, sub?: string) => void;
  streak: (habit: Habit) => number;
  longestStreak: (habit: Habit) => number;
  completionRate: (habit: Habit, days?: number) => number;
}

export type LessonMode = "sequential" | "random";
export type Theme = "light" | "dark";

export interface WeeklyReviewAnswers {
  wentWell: string;
  smallestFix: string;
  identityVote: string;
}

export interface WeeklyReview extends WeeklyReviewAnswers {
  weekStartKey: string;
  updatedAt: string;
}

export interface FormationVerdict {
  habitId: string;
  score: number;
  reflection: string;
  formed: boolean;
  reviewedAt: string;
}

export interface UserPreferences {
  theme: Theme;
  accentHue: number;
  remindersEnabled: boolean;
  weeklyReviewNudge: boolean;
  accountabilityNudge: boolean;
  onboardingSeen: boolean;
  lessonMode: LessonMode;
  timezone: string;
}

/**
 * A persisted pet companion. Its *appearance* is never stored — only the genome
 * (`temperament` + `seed`), from which the sprite is always regenerated. The
 * remaining fields are the time-varying vital signs advanced by the simulation.
 * Timestamps are ISO strings so the snapshot is JSON-serialisable across the
 * server/client boundary; the client converts them to epoch ms to simulate.
 */
export interface Pet {
  id: string;
  name: string;
  temperament: string;
  seed: number;
  totalFeeds: number;
  satiety: number;
  health: number;
  bornAt: string;
  lastFedAt: string;
  lastSimAt: string;
  isAlive: boolean;
  diedAt: string | null;
}

/** Draft used when adopting a new pet (the user picks a name + temperament). */
export interface PetDraft {
  name: string;
  temperament: string;
}

export interface StoreSnapshot {
  habits: Habit[];
  journal: JournalEntry[];
  identity: Identity;
  weeklyReview: WeeklyReviewAnswers;
  weeklyReviews?: WeeklyReview[];
  completedLessons: number[];
  formationVerdicts: FormationVerdict[];
  preferences: UserPreferences;
  pets?: Pet[];
  /** Total feeds spent across the whole ecosystem today (shared food pool). */
  petFeedsUsedToday?: number;
}
