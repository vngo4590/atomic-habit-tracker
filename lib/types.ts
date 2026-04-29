export interface CheckIn {
  done: boolean;
  mood?: number;
  journal?: string;
}

export interface Note {
  id: number;
  body: string;
  createdAt: string;
}

export interface Habit {
  id: number;
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
  id: number;
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
  toggleHabit: (id: number, dateKey?: string, payload?: Partial<CheckIn> | null) => void;
  logCheckIn: (id: number, payload: Partial<CheckIn>, dateKey?: string) => void;
  addHabit: (draft: HabitDraft) => void;
  updateHabit: (id: number, patch: Partial<Habit>) => void;
  deleteHabit: (id: number) => void;
  journal: JournalEntry[];
  addJournal: (entry: Partial<JournalEntry>) => void;
  identity: Identity;
  setIdentity: (identity: Identity) => void;
  toast: ToastState | null;
  showToast: (msg: string, sub?: string) => void;
  streak: (habit: Habit) => number;
  longestStreak: (habit: Habit) => number;
  completionRate: (habit: Habit, days?: number) => number;
}
