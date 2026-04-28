// state.jsx — Shared store + sample data + icons + helpers
// Exposes via window: useStore, ICONS, SAMPLE_HABITS, fmt, todayKey, dateAdd

const { useState, useEffect, useMemo, useCallback, useRef } = React;

// ── Date helpers ─────────────────────────────────
const DAY = 86400000;
const todayKey = (d = new Date()) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};
const dateAdd = (key, days) => {
  const d = new Date(key);
  d.setDate(d.getDate() + days);
  return todayKey(d);
};
const fmt = {
  long: (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  short: (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  weekday: (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' }),
  time: (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
};

// ── Seed: build a believable history (last 90 days, varying adherence per habit) ──
function seedHistory(habitId, adherence, days = 90) {
  const out = {};
  // Use a deterministic pseudo-random per habit so refreshes are stable
  let seed = habitId * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = days; i >= 1; i--) {
    const k = dateAdd(todayKey(), -i);
    // simulate momentum: adherence rises slightly toward today
    const adj = adherence + (1 - i / days) * 0.1;
    if (rand() < adj) out[k] = true;
  }
  return out;
}

const SAMPLE_HABITS = [
  {
    id: 1, name: 'Read 10 pages', emoji: '📖',
    cue: 'After morning coffee, when I sit at the desk',
    craving: 'To feel like a curious, well-read person',
    response: 'Open the current book to the bookmarked page',
    reward: 'A clear mind and a single highlighted line in the margin',
    twoMin: 'Read one paragraph',
    stack: 'After I pour my morning coffee',
    identity: 'reader',
    environment: 'Book left open on the desk, phone in another room',
    schedule: 'Daily',
    time: 'Morning',
    contract: 'If I miss two days, I send $20 to charity (logged with Mira)',
    history: seedHistory(1, 0.78),
    notes: [],
    createdAt: dateAdd(todayKey(), -127),
  },
  {
    id: 2, name: 'Walk 8,000 steps', emoji: '🚶',
    cue: 'After lunch the calendar reminder fires at 1:15pm',
    craving: 'Mental reset, sunlight, the loop around the block',
    response: 'Lace up the trainers by the door',
    reward: 'Podcast episode I only let myself listen to while walking',
    twoMin: 'Walk to the corner and back',
    stack: 'After I close my laptop for lunch',
    identity: 'someone who moves daily',
    environment: 'Trainers + headphones staged at the door',
    schedule: 'Daily',
    time: 'Afternoon',
    contract: '',
    history: seedHistory(2, 0.84),
    notes: [],
    createdAt: dateAdd(todayKey(), -97),
  },
  {
    id: 3, name: 'Meditate 5 min', emoji: '◯',
    cue: 'Right after I brush my teeth at night',
    craving: 'Quiet, transition out of work brain',
    response: 'Sit on the cushion, set a 5-minute timer',
    reward: 'Falling asleep faster',
    twoMin: 'Take three slow breaths',
    stack: 'After I brush my teeth at night',
    identity: 'calm',
    environment: 'Cushion left out at the foot of the bed',
    schedule: 'Daily',
    time: 'Evening',
    contract: '',
    history: seedHistory(3, 0.61),
    notes: [],
    createdAt: dateAdd(todayKey(), -64),
  },
  {
    id: 4, name: 'Write morning pages', emoji: '✎',
    cue: 'Coffee + the notebook open on the kitchen table',
    craving: 'Clearing the mental cache before the day',
    response: 'Three pages, longhand, no editing',
    reward: 'A surprisingly honest sentence I underline at the end',
    twoMin: 'Write one sentence',
    stack: 'After I pour my morning coffee',
    identity: 'writer',
    environment: 'Notebook + pen on the kitchen table the night before',
    schedule: 'Mon, Tue, Wed, Thu, Fri',
    time: 'Morning',
    contract: '',
    history: seedHistory(4, 0.7),
    notes: [],
    createdAt: dateAdd(todayKey(), -45),
  },
  {
    id: 5, name: 'Cold shower 60s', emoji: '❄', 
    cue: 'End of normal shower, hand on the dial',
    craving: 'The dare itself; alertness',
    response: 'Turn the dial to cold for 60 seconds',
    reward: 'Wake-up jolt; small daily win banked before 8am',
    twoMin: 'Cold for 10 seconds',
    stack: 'After I finish my regular shower',
    identity: 'someone who does hard things',
    environment: 'Timer set on the bathroom shelf',
    schedule: 'Daily',
    time: 'Morning',
    contract: '',
    history: seedHistory(5, 0.55),
    notes: [],
    createdAt: dateAdd(todayKey(), -30),
  },
  {
    id: 6, name: 'No phone first hour', emoji: '⊘',
    cue: 'Waking up — the impulse to grab the phone',
    craving: 'Staying in my own head, not a feed',
    response: 'Phone stays charging in the kitchen until 9am',
    reward: 'A slow, owned hour',
    twoMin: 'Leave phone in another room overnight',
    stack: 'After my alarm goes off',
    identity: 'present',
    environment: 'Phone charges in the kitchen, not the bedroom',
    schedule: 'Daily',
    time: 'Morning',
    contract: '',
    history: seedHistory(6, 0.72),
    notes: [],
    createdAt: dateAdd(todayKey(), -22),
  },
];

const SAMPLE_JOURNAL = [
  { id: 1, date: dateAdd(todayKey(), -1),
    title: 'Reading is starting to stack',
    body: 'Three weeks in, the coffee → book → bookmark sequence is finally automatic. I noticed today I picked up the book before I even thought about it. The friction is gone. Tomorrow I want to try moving the phone further away — it\'s the one thing still pulling at the edge of attention.',
    mood: 'good', tags: ['reading', 'wins'] },
  { id: 2, date: dateAdd(todayKey(), -3),
    title: 'Missed meditation again',
    body: 'Second day in a row. Pattern: I\'m brushing teeth on the couch instead of in the bathroom, so the cue (cushion at foot of bed) doesn\'t fire. Fix: move the cushion next to where I actually brush.',
    mood: 'meh', tags: ['meditation', 'environment'] },
  { id: 3, date: dateAdd(todayKey(), -7),
    title: 'Week 1 review',
    body: 'Casting more votes for "reader" than "scroller" this week. The loop diagram for reading actually clarified something — the reward isn\'t finishing the book, it\'s the highlighted line. That\'s the thing I look forward to.',
    mood: 'good', tags: ['review', 'identity'] },
];

// ── Store ─────────────────────────────────────────
function useStore() {
  const [habits, setHabits] = useState(SAMPLE_HABITS);
  const [journal, setJournal] = useState(SAMPLE_JOURNAL);
  const [identity, setIdentity] = useState({
    statement: 'I am someone who shows up for small things, every day.',
    values: ['Curious', 'Calm', 'Strong', 'Present'],
  });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, sub) => {
    setToast({ msg, sub, id: Date.now() });
    setTimeout(() => setToast((t) => t && t.msg === msg ? null : t), 2400);
  }, []);

  const toggleHabit = useCallback((id, dateKey = todayKey(), payload = null) => {
    setHabits((hs) => hs.map((h) => {
      if (h.id !== id) return h;
      const hist = { ...h.history };
      if (hist[dateKey] && !payload) {
        delete hist[dateKey];
      } else {
        // payload may be { mood, journal }; default to plain check-in
        const prev = (typeof hist[dateKey] === 'object' && hist[dateKey]) || {};
        hist[dateKey] = { done: true, ...prev, ...(payload || {}) };
      }
      return { ...h, history: hist };
    }));
    const h = habits.find((x) => x.id === id);
    if (h && !h.history[dateKey]) {
      const votes = Object.keys(h.history).length + 1;
      showToast(`Vote cast for "${h.identity}"`, `${votes} total`);
    }
  }, [habits, showToast]);

  // Append a journal entry to a specific day's check-in (creates the check-in if missing)
  const logCheckIn = useCallback((id, payload, dateKey = todayKey()) => {
    setHabits((hs) => hs.map((h) => {
      if (h.id !== id) return h;
      const hist = { ...h.history };
      const prev = (typeof hist[dateKey] === 'object' && hist[dateKey]) || {};
      hist[dateKey] = { done: true, ...prev, ...payload };
      return { ...h, history: hist };
    }));
  }, []);

  const addHabit = useCallback((draft) => {
    setHabits((hs) => [...hs, {
      ...draft, id: Date.now(), history: {}, notes: [],
      createdAt: todayKey(),
    }]);
  }, []);

  const updateHabit = useCallback((id, patch) => {
    setHabits((hs) => hs.map((h) => h.id === id ? { ...h, ...patch } : h));
  }, []);

  const deleteHabit = useCallback((id) => {
    setHabits((hs) => hs.filter((h) => h.id !== id));
  }, []);

  const addJournal = useCallback((entry) => {
    setJournal((j) => [{ id: Date.now(), date: todayKey(), mood: 'good', tags: [], ...entry }, ...j]);
  }, []);

  // Streak calc
  const streak = useCallback((habit) => {
    let s = 0;
    let d = todayKey();
    // If today not done, start from yesterday for the "best" streak experience
    if (!habit.history[d]) d = dateAdd(d, -1);
    while (habit.history[d]) {
      s++;
      d = dateAdd(d, -1);
    }
    return s;
  }, []);

  const longestStreak = useCallback((habit) => {
    const keys = Object.keys(habit.history).sort();
    if (!keys.length) return 0;
    let best = 1, cur = 1;
    for (let i = 1; i < keys.length; i++) {
      if (dateAdd(keys[i - 1], 1) === keys[i]) {
        cur++;
        best = Math.max(best, cur);
      } else cur = 1;
    }
    return best;
  }, []);

  const completionRate = useCallback((habit, days = 30) => {
    let done = 0;
    for (let i = 0; i < days; i++) {
      if (habit.history[dateAdd(todayKey(), -i)]) done++;
    }
    return done / days;
  }, []);

  return {
    habits, setHabits, toggleHabit, logCheckIn, addHabit, updateHabit, deleteHabit,
    journal, addJournal,
    identity, setIdentity,
    toast, showToast,
    streak, longestStreak, completionRate,
  };
}

// ── Icons (single-stroke, 14px viewBox) ─────────────
const I = (path) => (props) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4"
       strokeLinecap="round" strokeLinejoin="round" {...props}>
    {path}
  </svg>
);

const ICONS = {
  today: I(<><circle cx="7" cy="7" r="5" /><path d="M7 4v3l2 1.5" /></>),
  list: I(<><path d="M3 4h8M3 7h8M3 10h8" /></>),
  plus: I(<><path d="M7 3v8M3 7h8" /></>),
  chart: I(<><path d="M2 11h10M3 11V7M6 11V4M9 11V8M12 11V6" /></>),
  journal: I(<><path d="M3 2h7l2 2v8H3z" /><path d="M5 5h5M5 8h4" /></>),
  review: I(<><path d="M2 7h10M7 2l5 5-5 5" /></>),
  identity: I(<><circle cx="7" cy="5" r="2.5" /><path d="M2.5 12c.7-2 2.4-3 4.5-3s3.8 1 4.5 3" /></>),
  settings: I(<><circle cx="7" cy="7" r="2" /><path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.5 2.5l1.4 1.4M10.1 10.1l1.4 1.4M2.5 11.5l1.4-1.4M10.1 3.9l1.4-1.4" /></>),
  check: I(<path d="M3 7l3 3 5-6" />),
  flame: I(<path d="M7 1c0 2-3 3-3 6a3 3 0 006 0c0-1.5-1-2-1-3 0 0 1 1 2 1.5C10.5 4 8 3 7 1z" />),
  arrow: I(<><path d="M3 7h8M8 4l3 3-3 3" /></>),
  back: I(<><path d="M11 7H3M6 4L3 7l3 3" /></>),
  edit: I(<><path d="M2 12h2l7-7-2-2-7 7v2z" /></>),
  trash: I(<><path d="M3 4h8M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v7a1 1 0 001 1h2a1 1 0 001-1V4" /></>),
  link: I(<><path d="M6 8l2-2M5 9l-1 1a2 2 0 01-3-3l1-1M9 5l1-1a2 2 0 013 3l-1 1" /></>),
  star: I(<path d="M7 1.5l1.7 3.5 3.8.5-2.8 2.7.7 3.8L7 10.2 3.6 12l.7-3.8L1.5 5.5l3.8-.5z" />),
  sun: I(<><circle cx="7" cy="7" r="2.5" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M2.5 11.5l1-1M10.5 3.5l1-1" /></>),
  moon: I(<path d="M11 8.5A4.5 4.5 0 016.5 4 4.5 4.5 0 1011 8.5z" />),
  search: I(<><circle cx="6" cy="6" r="3.5" /><path d="M9 9l3 3" /></>),
  close: I(<><path d="M3 3l8 8M11 3l-8 8" /></>),
  book: I(<><path d="M3 2h7l2 2v8H3z" /><path d="M3 2v10" /><path d="M5 5h5" /></>),
};

Object.assign(window, {
  useStore, ICONS, SAMPLE_HABITS, fmt, todayKey, dateAdd,
});
