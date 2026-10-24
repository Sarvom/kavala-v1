import { describe, expect, it } from "vitest";
import {
  advance,
  dailyNumber,
  initialState,
  nextStreak,
  rollDay,
  SAMPLE_NEIGHBOURS,
  SAMPLE_REPLY_MS,
  WIDEN_AFTER_MS,
  randomMaskName,
  type AppState,
  type Question,
} from "./state";
import { overpassQuery, parseOverpass, pickDailyPlace, type SpotPlace } from "../daily/spotPlace";

const NOW = 1_800_000_000_000;

function withMyQuestion(state: AppState, q: Partial<Question>): AppState {
  const mine: Question = {
    id: "mine-1",
    by: state.maskName,
    text: "Anyone know a plumber?",
    category: "Repairs",
    askedAt: NOW,
    mine: true,
    reach: "own",
    widenOffered: false,
    answers: [],
    ...q,
  };
  return { ...state, questions: [mine, ...state.questions] };
}

describe("streaks", () => {
  it("starts at 1, grows on consecutive days and forgives one missed day", () => {
    expect(nextStreak(undefined, "2026-10-25", 0)).toBe(1);
    expect(nextStreak("2026-10-25", "2026-10-26", 1)).toBe(2);
    expect(nextStreak("2026-10-25", "2026-10-27", 2)).toBe(3);
    expect(nextStreak("2026-10-25", "2026-10-29", 5)).toBe(1);
    expect(nextStreak("2026-10-25", "2026-10-25", 3)).toBe(3);
  });

  it("numbers dailies from 25 October 2026", () => {
    expect(dailyNumber("2026-10-25")).toBe(1);
    expect(dailyNumber("2026-11-03")).toBe(10);
  });
});

describe("rollDay", () => {
  it("resets the daily on a new day but keeps questions", () => {
    const s = { ...initialState("2026-10-25", NOW), daily: { key: "2026-10-25", done: true } };
    const next = rollDay(s, "2026-10-26");
    expect(next.daily).toEqual({ key: "2026-10-26", done: false });
    expect(next.questions).toBe(s.questions);
    expect(rollDay(next, "2026-10-26")).toBe(next);
  });
});

describe("advance", () => {
  it("offers widening once a question has waited long enough", () => {
    const s = withMyQuestion(initialState("2026-10-25", NOW), {});
    expect(advance(s, NOW + WIDEN_AFTER_MS - 1).state).toBe(s);
    const r = advance(s, NOW + WIDEN_AFTER_MS);
    expect(r.state.questions[0].widenOffered).toBe(true);
    expect(r.events).toHaveLength(1);
  });

  it("adds a labelled sample reply after widening", () => {
    const s = withMyQuestion(initialState("2026-10-25", NOW), { reach: "adjacent", widenedAt: NOW });
    const r = advance(s, NOW + SAMPLE_REPLY_MS);
    expect(r.state.questions[0].answers).toHaveLength(1);
    expect(r.state.questions[0].answers[0].sample).toBe(true);
  });

  it("thanks the user's help answer once, without changing the old state", () => {
    const base = initialState("2026-10-25", NOW);
    const withAnswer: AppState = {
      ...base,
      daily: { ...base.daily, help: "answered", helpAnsweredAt: NOW },
      questions: base.questions.map((q) =>
        q.id === "sample-induction"
          ? { ...q, answers: [...q.answers, { id: "x", by: base.maskName, text: "Try the shop", useful: false, sample: false }] }
          : q,
      ),
    };
    const r = advance(withAnswer, NOW + SAMPLE_REPLY_MS);
    expect(r.state.thanks).toBe(1);
    expect(r.state.daily.helpAnsweredAt).toBeUndefined();
    const original = withAnswer.questions.find((q) => q.id === "sample-induction")!;
    expect(original.answers.at(-1)!.useful).toBe(false);
    expect(advance(r.state, NOW + 10 * SAMPLE_REPLY_MS).state.thanks).toBe(1);
  });
});

describe("mask names", () => {
  it("never collides with a sample neighbour", () => {
    for (let i = 0; i < 200; i++) expect(SAMPLE_NEIGHBOURS[randomMaskName()]).toBeUndefined();
  });
});

describe("spot places", () => {
  const places: SpotPlace[] = [
    { id: "node/3", name: "C", kind: "cafe", lat: 1, lng: 1 },
    { id: "node/1", name: "A", kind: "library", lat: 1, lng: 1 },
    { id: "node/2", name: "B", kind: "bakery", lat: 1, lng: 1 },
  ];

  it("picks the same place for the same neighbourhood and day, whatever the input order", () => {
    const a = pickDailyPlace(places, "2026-10-25", "hood-1");
    const b = pickDailyPlace([...places].reverse(), "2026-10-25", "hood-1");
    expect(a).toEqual(b);
    expect(pickDailyPlace([], "2026-10-25", "hood-1")).toBeNull();
  });

  it("parses named places and skips unusable ones", () => {
    const parsed = parseOverpass({
      elements: [
        { type: "node", id: 1, lat: 9.98, lon: 76.3, tags: { amenity: "cafe", name: "Tea Point" } },
        { type: "node", id: 2, lat: 9.98, lon: 76.3, tags: { amenity: "cafe" } },
        { type: "node", id: 3, tags: { amenity: "library", name: "No position" } },
        { type: "node", id: 4, lat: 9.98, lon: 76.3, tags: { amenity: "parking", name: "Car park" } },
        { type: "node", id: 5, lat: 9.98, lon: 76.3, tags: { shop: "bakery", name: "Bake House" } },
      ],
    });
    expect(parsed.map((p) => p.name)).toEqual(["Tea Point", "Bake House"]);
    expect(parseOverpass(null)).toEqual([]);
  });

  it("builds a bounded query", () => {
    expect(overpassQuery(9.98, 76.3, 1800)).toContain("around:1800,9.98000,76.30000");
  });
});

describe("linkAccount", () => {
  const profile = { provider: "google" as const, userId: "u1", name: "Govind S", email: "g@example.com" };

  it("links a Google profile and marks the user verified, keeping the mask", async () => {
    const { linkAccount } = await import("./state");
    const s = initialState("2026-10-25", NOW);
    const linked = linkAccount(s, profile);
    expect(linked.level).toBe("verified");
    expect(linked.account?.email).toBe("g@example.com");
    expect(linked.maskName).toBe(s.maskName);
    expect(linkAccount(linked, profile)).toBe(linked);
  });

  it("unlinks on sign-out and hides the real name again", async () => {
    const { linkAccount } = await import("./state");
    const linked = { ...linkAccount(initialState("2026-10-25", NOW), profile), revealedTo: ["Carol Chacko"] };
    const out = linkAccount(linked, null);
    expect(out.account).toBeUndefined();
    expect(out.level).toBe("masked");
    expect(out.revealedTo).toEqual([]);
  });
});

describe("completeDaily", () => {
  it("completes only when all three games are finished, and counts the streak once", async () => {
    const { completeDaily } = await import("./state");
    const base = initialState("2026-10-25", NOW);
    const partial = { ...base, daily: { ...base.daily, help: "marked" as const, step: "done" as const } };
    expect(completeDaily(partial)).toBe(partial);
    const full = { ...partial, daily: { ...partial.daily, spot: "skipped" as const } };
    const done = completeDaily(full);
    expect(done.daily.done).toBe(true);
    expect(done.streak).toBe(1);
    expect(completeDaily(done)).toBe(done);
  });
});
