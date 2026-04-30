export interface CheckIn {
  done: boolean;
  mood?: number;
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
  twoMin: string;
  stack: string;
  identity: string;
  environment: string;
  schedule: string;
  time: string;
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
  deleteHabit: (id: string) => void;
  journal: JournalEntry[];
  addJournal: (entry: Partial<JournalEntry>) => void;
  identity: Identity;
  setIdentity: (identity: Identity) => void;
  weeklyReview: WeeklyReviewAnswers;
  setWeeklyReview: (weekStartKey: string, answers: WeeklyReviewAnswers) => void;
  completedLessons: Set<number>;
  lessonMode: LessonMode;
  setLessonMode: (mode: LessonMode) => void;
  markLessonRead: (lessonId: number) => void;
  formationVerdicts: FormationVerdict[];
  saveFormationVerdict: (verdict: FormationVerdict) => void;
  preferences: UserPreferences;
  setPreferences: (preferences: Partial<UserPreferences>) => void;
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

export interface StoreSnapshot {
  habits: Habit[];
  journal: JournalEntry[];
  identity: Identity;
  weeklyReview: WeeklyReviewAnswers;
  completedLessons: number[];
  formationVerdicts: FormationVerdict[];
  preferences: UserPreferences;
}
