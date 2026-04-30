import { dateAdd, todayKey } from "@/lib/helpers";
import type { Habit, Identity, JournalEntry } from "@/lib/types";

export function seedHistory(
  habitId: number,
  adherence: number,
  days = 90,
): Habit["history"] {
  const history: Habit["history"] = {};
  let seed = habitId * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = days; i >= 1; i--) {
    const key = dateAdd(todayKey(), -i);
    const adjustedAdherence = adherence + (1 - i / days) * 0.1;

    if (rand() < adjustedAdherence) {
      history[key] = true;
    }
  }

  return history;
}

export const SAMPLE_HABITS: Habit[] = [
  {
    id: "1",
    name: "Read 10 pages",
    emoji: "📖",
    cue: "After morning coffee, when I sit at the desk",
    craving: "To feel like a curious, well-read person",
    response: "Open the current book to the bookmarked page",
    reward: "A clear mind and a single highlighted line in the margin",
    twoMin: "Read one paragraph",
    stack: "After I pour my morning coffee",
    identity: "reader",
    environment: "Book left open on the desk, phone in another room",
    schedule: "Daily",
    time: "Morning",
    contract: "If I miss two days, I send $20 to charity (logged with Mira)",
    contractPartners: [],
    history: seedHistory(1, 0.78),
    notes: [],
    createdAt: dateAdd(todayKey(), -127),
  },
  {
    id: "2",
    name: "Walk 8,000 steps",
    emoji: "🚶",
    cue: "After lunch the calendar reminder fires at 1:15pm",
    craving: "Mental reset, sunlight, the loop around the block",
    response: "Lace up the trainers by the door",
    reward: "Podcast episode I only let myself listen to while walking",
    twoMin: "Walk to the corner and back",
    stack: "After I close my laptop for lunch",
    identity: "someone who moves daily",
    environment: "Trainers + headphones staged at the door",
    schedule: "Daily",
    time: "Afternoon",
    contract: "",
    contractPartners: [],
    history: seedHistory(2, 0.84),
    notes: [],
    createdAt: dateAdd(todayKey(), -97),
  },
  {
    id: "3",
    name: "Meditate 5 min",
    emoji: "◯",
    cue: "Right after I brush my teeth at night",
    craving: "Quiet, transition out of work brain",
    response: "Sit on the cushion, set a 5-minute timer",
    reward: "Falling asleep faster",
    twoMin: "Take three slow breaths",
    stack: "After I brush my teeth at night",
    identity: "calm",
    environment: "Cushion left out at the foot of the bed",
    schedule: "Daily",
    time: "Evening",
    contract: "",
    contractPartners: [],
    history: seedHistory(3, 0.61),
    notes: [],
    createdAt: dateAdd(todayKey(), -64),
  },
  {
    id: "4",
    name: "Write morning pages",
    emoji: "✎",
    cue: "Coffee + the notebook open on the kitchen table",
    craving: "Clearing the mental cache before the day",
    response: "Three pages, longhand, no editing",
    reward: "A surprisingly honest sentence I underline at the end",
    twoMin: "Write one sentence",
    stack: "After I pour my morning coffee",
    identity: "writer",
    environment: "Notebook + pen on the kitchen table the night before",
    schedule: "Mon, Tue, Wed, Thu, Fri",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: seedHistory(4, 0.7),
    notes: [],
    createdAt: dateAdd(todayKey(), -45),
  },
  {
    id: "5",
    name: "Cold shower 60s",
    emoji: "❄",
    cue: "End of normal shower, hand on the dial",
    craving: "The dare itself; alertness",
    response: "Turn the dial to cold for 60 seconds",
    reward: "Wake-up jolt; small daily win banked before 8am",
    twoMin: "Cold for 10 seconds",
    stack: "After I finish my regular shower",
    identity: "someone who does hard things",
    environment: "Timer set on the bathroom shelf",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: seedHistory(5, 0.55),
    notes: [],
    createdAt: dateAdd(todayKey(), -30),
  },
  {
    id: "6",
    name: "No phone first hour",
    emoji: "⊘",
    cue: "Waking up - the impulse to grab the phone",
    craving: "Staying in my own head, not a feed",
    response: "Phone stays charging in the kitchen until 9am",
    reward: "A slow, owned hour",
    twoMin: "Leave phone in another room overnight",
    stack: "After my alarm goes off",
    identity: "present",
    environment: "Phone charges in the kitchen, not the bedroom",
    schedule: "Daily",
    time: "Morning",
    contract: "",
    contractPartners: [],
    history: seedHistory(6, 0.72),
    notes: [],
    createdAt: dateAdd(todayKey(), -22),
  },
];

export const SAMPLE_JOURNAL: JournalEntry[] = [
  {
    id: "1",
    date: dateAdd(todayKey(), -1),
    title: "Reading is starting to stack",
    body: "Three weeks in, the coffee -> book -> bookmark sequence is finally automatic. I noticed today I picked up the book before I even thought about it. The friction is gone. Tomorrow I want to try moving the phone further away - it's the one thing still pulling at the edge of attention.",
    mood: "good",
    tags: ["reading", "wins"],
  },
  {
    id: "2",
    date: dateAdd(todayKey(), -3),
    title: "Missed meditation again",
    body: "Second day in a row. Pattern: I'm brushing teeth on the couch instead of in the bathroom, so the cue (cushion at foot of bed) doesn't fire. Fix: move the cushion next to where I actually brush.",
    mood: "meh",
    tags: ["meditation", "environment"],
  },
  {
    id: "3",
    date: dateAdd(todayKey(), -7),
    title: "Week 1 review",
    body: 'Casting more votes for "reader" than "scroller" this week. The loop diagram for reading actually clarified something - the reward isn\'t finishing the book, it\'s the highlighted line. That\'s the thing I look forward to.',
    mood: "good",
    tags: ["review", "identity"],
  },
];

export const SAMPLE_IDENTITY: Identity = {
  statement: "I am someone who shows up for small things, every day.",
  values: ["Curious", "Calm", "Strong", "Present"],
};
