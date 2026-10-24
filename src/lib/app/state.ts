import type { SpotPlace } from "../daily/spotPlace";
import type { GoogleProfile } from "./useGoogleAccount";
import type { Square } from "../daily/score";

/**
 * Everything the app experience remembers, saved on the phone only. Neighbours,
 * questions and leaderboard entries marked `sample` are demo content, shown
 * until accounts and the database arrive (Phase 2).
 */

export type TrustLevel = "masked" | "verified";

export interface Answer {
  id: string;
  by: string;
  text: string;
  useful: boolean;
  sample: boolean;
  /** Set when the answer came from a neighbouring area after widening. */
  area?: string;
}

export interface Question {
  id: string;
  by: string;
  text: string;
  category: string;
  askedAt: number;
  mine: boolean;
  reach: "own" | "adjacent";
  widenOffered: boolean;
  widenedAt?: number;
  answers: Answer[];
}

export interface SpotResult {
  place: SpotPlace;
  distance: number;
  points: number;
  square: Square;
}

export interface DailyState {
  key: string;
  spot?: SpotResult | "skipped";
  help?: "marked" | "answered" | "skipped";
  /** When the user's own help answer was posted, for the sample asker's reply. */
  helpAnsweredAt?: number;
  step?: "done" | "checked-in" | "later";
  done: boolean;
}

export interface Neighbourhood {
  id: string;
  cells: string[];
  resolution: number;
}

export interface AppState {
  version: 1;
  joined: boolean;
  maskName: string;
  maskColor: string;
  homeCell?: string;
  homeFromGps: boolean;
  hood?: Neighbourhood;
  level: TrustLevel;
  thanks: number;
  streak: number;
  lastPlayedKey?: string;
  daily: DailyState;
  questions: Question[];
  revealedTo: string[];
  /** Profile linked by signing in with Google. Others still see the mask. */
  account?: GoogleProfile;
}

export const MASK_COLORS = ["#1d6a4e", "#c58a12", "#3d6fa8", "#b4533a", "#7a5ba6", "#2e8c8c"];

/** Sample neighbours shown in the demo. Clearly not real people. */
export const SAMPLE_NEIGHBOURS: Record<string, string> = {
  "Rainy Mango": "#b4533a",
  "Early Kite": "#3d6fa8",
  "Brave Auto": "#c58a12",
  "Quiet Kettle": "#2e8c8c",
  "Steady Banyan": "#7a5ba6",
  "Kind Lantern": "#1d6a4e",
  "Gentle Heron": "#b4533a",
  "Curious Monsoon": "#3d6fa8",
  "Morning Kite": "#2e8c8c",
};

export const SAMPLE_BOARD = [
  { name: "Brave Auto", points: 931 },
  { name: "Kind Lantern", points: 874 },
  { name: "Early Kite", points: 802 },
  { name: "Rainy Mango", points: 655 },
  { name: "Steady Banyan", points: 540 },
];

export const SAMPLE_PLAYED_TODAY = 38;
export const SAMPLE_MEMBERS = 112;

/** Demo wait before offering to ask neighbouring areas (the spec uses 60 s in demo mode). */
export const WIDEN_AFTER_MS = 20_000;
/** Demo delay before a sample neighbour replies. */
export const SAMPLE_REPLY_MS = 4_000;

const ADJECTIVES = ["Quiet", "Early", "Rainy", "Kind", "Curious", "Steady", "Brave", "Gentle", "Sunny", "Patient"];
const NOUNS = ["Heron", "Kettle", "Mango", "Lantern", "Kite", "Banyan", "Auto", "Monsoon", "Jackfruit", "Ferry"];

export function randomMaskName(random: () => number = Math.random): string {
  for (;;) {
    const name = `${ADJECTIVES[Math.floor(random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(random() * NOUNS.length)]}`;
    if (!SAMPLE_NEIGHBOURS[name]) return name;
  }
}

function sampleQuestions(now: number): Question[] {
  const hour = 3_600_000;
  return [
    {
      id: "sample-induction",
      by: "Rainy Mango",
      text: "My induction cooker stopped heating this morning. Anyone know a repair person who comes home?",
      category: "Repairs",
      askedAt: now - 2 * hour,
      mine: false,
      reach: "own",
      widenOffered: false,
      answers: [
        {
          id: "a1",
          by: "Early Kite",
          text: "The electronics shop near the bus stop repairs them, but you have to carry it there.",
          useful: false,
          sample: true,
        },
      ],
    },
    {
      id: "sample-puncture",
      by: "Quiet Kettle",
      text: "Puncture shop open now, anywhere close?",
      category: "Transport",
      askedAt: now - 14 * hour,
      mine: false,
      reach: "own",
      widenOffered: false,
      answers: [
        {
          id: "a2",
          by: "Brave Auto",
          text: "The shop behind the mosque is open till 9:30. About ₹80 for a bike tyre.",
          useful: true,
          sample: true,
        },
      ],
    },
    {
      id: "sample-waste",
      by: "Gentle Heron",
      text: "Which days does the waste collection come to our lane? Just moved in.",
      category: "Waste",
      askedAt: now - 20 * hour,
      mine: false,
      reach: "own",
      widenOffered: false,
      answers: [
        {
          id: "a3",
          by: "Kind Lantern",
          text: "Tuesdays and Fridays, around 8 AM. They take plastic only if it's washed and dry.",
          useful: true,
          sample: true,
        },
      ],
    },
    {
      id: "sample-lunch",
      by: "Curious Monsoon",
      text: "Cheap and good lunch meals near the library?",
      category: "Food",
      askedAt: now - 30 * hour,
      mine: false,
      reach: "own",
      widenOffered: false,
      answers: [],
    },
  ];
}

export function initialState(dailyKey: string, now: number = Date.now()): AppState {
  return {
    version: 1,
    joined: false,
    maskName: randomMaskName(),
    maskColor: MASK_COLORS[0],
    homeFromGps: false,
    level: "masked",
    thanks: 0,
    streak: 0,
    daily: { key: dailyKey, done: false },
    questions: sampleQuestions(now),
    revealedTo: [],
  };
}

/** Starts a fresh daily when the 6 AM boundary has passed. Questions carry over. */
export function rollDay(state: AppState, dailyKey: string): AppState {
  if (state.daily.key === dailyKey) return state;
  return { ...state, daily: { key: dailyKey, done: false } };
}

/** Days between two YYYY-MM-DD keys. */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/**
 * New streak after finishing today's daily. Missing one day is forgiven (a
 * rest day); missing two or more starts again from 1.
 */
export function nextStreak(lastKey: string | undefined, todayKey: string, streak: number): number {
  if (!lastKey) return 1;
  const gap = daysBetween(lastKey, todayKey);
  if (gap <= 0) return Math.max(streak, 1);
  if (gap <= 2) return streak + 1;
  return 1;
}

/** Kavala Daily number, counted from the first daily on 25 October 2026. */
export function dailyNumber(dailyKey: string): number {
  return Math.max(1, daysBetween("2026-10-25", dailyKey) + 1);
}

export interface AppEvent {
  message: string;
}

const SAMPLE_REPLIES: Record<string, string> = {
  Repairs: "There's a repair person on Market Road who comes home. Usually free after 4 PM.",
  Food: "The mess opposite the station does a full meal for about ₹70.",
  Transport: "The early bus to the city leaves from the stop near the market. It fills up fast.",
  Waste: "Our side gets collection on Mondays and Thursdays. Yours may be the same.",
  Internet: "Most people near us use the local cable broadband. It holds up in the rain.",
  Other: "I can help with that. Ask here again this evening and I'll share details.",
};

/**
 * Moves demo time forward: offers widening for unanswered questions, adds a
 * sample reply after widening, and lets the sample asker thank the user's
 * help answer. Pure, so it is easy to test.
 */
export function advance(state: AppState, now: number): { state: AppState; events: AppEvent[] } {
  const events: AppEvent[] = [];
  let changed = false;

  const questions = state.questions.map((q) => {
    if (!q.mine) return q;
    if (q.reach === "own" && q.answers.length === 0 && !q.widenOffered && now - q.askedAt >= WIDEN_AFTER_MS) {
      changed = true;
      events.push({ message: "No answer yet. You can ask the next areas too." });
      return { ...q, widenOffered: true };
    }
    if (q.reach === "adjacent" && q.widenedAt && q.answers.length === 0 && now - q.widenedAt >= SAMPLE_REPLY_MS) {
      changed = true;
      events.push({ message: "Steady Banyan (sample) from a neighbouring area answered." });
      const reply: Answer = {
        id: `reply-${q.id}`,
        by: "Steady Banyan",
        text: SAMPLE_REPLIES[q.category] ?? SAMPLE_REPLIES.Other,
        useful: false,
        sample: true,
        area: "a neighbouring area",
      };
      return { ...q, answers: [reply] };
    }
    return q;
  });

  let thanks = state.thanks;
  let daily = state.daily;
  let finalQuestions = questions;
  if (daily.helpAnsweredAt && now - daily.helpAnsweredAt >= SAMPLE_REPLY_MS) {
    let thanked = false;
    finalQuestions = questions.map((q) => {
      if (q.id !== "sample-induction") return q;
      return {
        ...q,
        answers: q.answers.map((a) => {
          if (a.by === state.maskName && !a.useful) {
            thanked = true;
            return { ...a, useful: true };
          }
          return a;
        }),
      };
    });
    if (thanked) {
      thanks += 1;
      events.push({ message: "Rainy Mango (sample) found your answer useful. +1 Thanks" });
    }
    daily = { ...daily, helpAnsweredAt: undefined };
    changed = true;
  }

  if (!changed) return { state, events };
  return { state: { ...state, questions: finalQuestions, thanks, daily }, events };
}

/**
 * Links or unlinks a Google profile. Signing in counts as verified identity;
 * the user stays masked to everyone they haven't chosen to reveal to.
 */
export function linkAccount(state: AppState, profile: GoogleProfile | null): AppState {
  if (!profile) {
    if (!state.account) return state;
    return { ...state, account: undefined, level: "masked", revealedTo: [] };
  }
  if (state.account?.userId === profile.userId && state.level === "verified") return state;
  return { ...state, account: profile, level: "verified" };
}

export const STORAGE_KEY = "kavala-app-v1";

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode); the app still works for this visit.
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
