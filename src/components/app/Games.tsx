"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { cellToLatLng, getResolution } from "h3-js";
import {
  bearingDegrees,
  compassWord,
  guessDistance,
  MAX_TRIES,
  SOLVE_RADIUS_M,
  spotPoints,
  spotSquare,
  verifyCheckin,
  warmth,
} from "@/lib/daily/score";
import { pickDailyPlace, searchRadiusFor, type SpotPlace } from "@/lib/daily/spotPlace";
import { fetchPlaces } from "@/lib/daily/fetchPlaces";
import { haversineMetres } from "@/lib/geo/filter";
import { useLocation } from "@/lib/geo/useLocation";
import { completeDaily, type AppState, type SpotResult } from "@/lib/app/state";
import type { MapGuess } from "./SpotMap";
import { Burst, GameFrame, formatTime, useElapsed } from "./GameKit";
import { NeighbourMask } from "./Mask";

const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false });

type Update = (fn: (s: AppState) => AppState) => void;
type Notify = (message: string) => void;

export const SQUARE_EMOJI = { green: "🟩", yellow: "🟨", orange: "🟧", grey: "⬜" } as const;

const WARMTH_CLASS: Record<string, string> = {
  "Found it": "guess-found",
  Hot: "guess-hot",
  Warm: "guess-warm",
  Cold: "guess-cold",
  Freezing: "guess-cold",
};

type PlaceLoad =
  | { status: "loading" }
  | { status: "ready"; place: SpotPlace }
  | { status: "error"; message: string; details: string[] };

/** Loads today's Spot place for the neighbourhood through our own API (cached per day). */
function useDailyPlace(state: AppState): [PlaceLoad, () => void] {
  const [load, setLoad] = useState<PlaceLoad>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const hood = state.hood;
  const key = state.daily.key;

  useEffect(() => {
    if (!hood) return;
    const cacheKey = `kavala-spot-v2-${key}-${hood.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setLoad({ status: "ready", place: JSON.parse(cached) });
        return;
      }
    } catch {
      // No cache; fetch below.
    }
    let cancelled = false;
    setLoad({ status: "loading" });
    (async () => {
      try {
        const cell = hood.cells[0];
        let places: SpotPlace[] | null = null;
        const details: string[] = [];
        try {
          const res = await fetch(`/api/places?cell=${encodeURIComponent(cell)}`);
          const data = (await res.json()) as { ok: boolean; places?: SpotPlace[]; error?: string; details?: string[] };
          if (res.ok && data.ok) places = data.places ?? [];
          else details.push(`Kavala server: ${data.error ?? res.status}`, ...(data.details ?? []));
        } catch {
          details.push("Kavala server could not be reached");
        }
        if (places === null) {
          // Fall back to asking OpenStreetMap from this browser. It sends the
          // neighbourhood's centre, never the person's own location.
          const [lat, lng] = cellToLatLng(cell);
          const direct = await fetchPlaces(lat, lng, searchRadiusFor(getResolution(cell)), fetch, 12_000, true);
          if (direct.endpoint) places = direct.places;
          else details.push(...direct.errors.map((e) => `from this browser: ${e}`));
        }
        if (cancelled) return;
        if (places === null) {
          setLoad({ status: "error", message: "OpenStreetMap place search is unavailable right now.", details });
          return;
        }
        const place = pickDailyPlace(places, key, hood.id);
        if (!place) {
          setLoad({ status: "error", message: "OpenStreetMap has no named public places around this neighbourhood yet.", details: [] });
          return;
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(place));
        } catch {
          // Caching is optional.
        }
        setLoad({ status: "ready", place });
      } catch {
        if (!cancelled) setLoad({ status: "error", message: "Couldn't reach the Kavala server. Check your connection.", details: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hood, key, attempt]);

  return [load, useCallback(() => setAttempt((a) => a + 1), [])];
}

interface Guess {
  lat: number;
  lng: number;
  distance: number;
}

export function SpotGame({ state, update, onClose }: { state: AppState; update: Update; onClose: () => void }) {
  const existing = state.daily.spot && state.daily.spot !== "skipped" ? state.daily.spot : null;
  const [load, retry] = useDailyPlace(state);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [pending, setPending] = useState<[number, number] | null>(null);
  const finished = !!existing;
  const elapsed = useElapsed(!finished);
  const center = state.hood ? (cellToLatLng(state.hood.cells[0]) as [number, number]) : ([9.9816, 76.2999] as [number, number]);

  function lockIn(place: SpotPlace) {
    if (!pending) return;
    const distance = guessDistance({ lat: pending[0], lng: pending[1] }, place);
    const next = [...guesses, { lat: pending[0], lng: pending[1], distance }];
    setGuesses(next);
    setPending(null);
    const solved = distance <= SOLVE_RADIUS_M;
    if (solved || next.length >= MAX_TRIES) {
      const best = Math.min(...next.map((g) => g.distance));
      const result: SpotResult = {
        place,
        distance: best,
        points: spotPoints(best),
        square: spotSquare(best),
        tries: next.map((g) => g.distance),
        solved,
        timeMs: elapsed,
      };
      update((s) => completeDaily({ ...s, daily: { ...s.daily, spot: result } }));
    }
  }

  const last = guesses[guesses.length - 1];
  const place = load.status === "ready" ? load.place : null;
  const shownGuesses: MapGuess[] = (existing?.tries && existing.tries.length && guesses.length === 0 ? [] : guesses).map((g) => ({
    lat: g.lat,
    lng: g.lng,
    className: WARMTH_CLASS[warmth(g.distance)],
  }));

  return (
    <GameFrame title="Spot" accent="#3ddc97" elapsed={existing?.timeMs ?? elapsed} onClose={onClose}>
      {load.status === "loading" && <p className="game-note">Picking today&apos;s place from OpenStreetMap…</p>}
      {load.status === "error" && (
        <div className="game-card">
          <p>{load.message}</p>
          {load.details.length > 0 && <p className="muted">{load.details.join(" · ")}</p>}
          <div className="row">
            <button className="btn" onClick={retry}>Try again</button>
            <button className="btn ghost" onClick={() => update((s) => completeDaily({ ...s, daily: { ...s.daily, spot: "skipped" } }))}>
              Skip today
            </button>
          </div>
        </div>
      )}
      {place && (
        <>
          <div className="clue-card">
            <span className="clue-label">Find</span>
            <span className="clue-name">{place.name}</span>
            <span className="clue-kind">{place.kind} · in your neighbourhood</span>
          </div>
          <div className="tries" aria-label={`${MAX_TRIES - guesses.length} guesses left`}>
            {Array.from({ length: MAX_TRIES }, (_, i) => {
              const g = (existing?.tries ?? guesses.map((x) => x.distance))[i];
              return <span key={i} className={`try ${g === undefined ? "" : `sq-${spotSquare(g)}`}`}>{g === undefined ? i + 1 : SQUARE_EMOJI[spotSquare(g)]}</span>;
            })}
          </div>
          <SpotMap
            center={center}
            guesses={shownGuesses}
            pending={finished ? null : pending}
            target={finished ? { lat: place.lat, lng: place.lng, name: place.name } : null}
            onPick={finished ? undefined : (lat, lng) => setPending([lat, lng])}
          />
          {finished && existing ? (
            <div className="result">
              <Burst word={existing.solved ? "SPOTTED!" : "SO CLOSE!"} color={existing.solved ? "#3ddc97" : "#ffb833"} />
              <div className="result-stats">
                <div><b>{formatTime(existing.timeMs ?? 0)}</b><span>time</span></div>
                <div><b>{existing.distance.toLocaleString("en-IN")} m</b><span>closest</span></div>
                <div><b>{existing.points}</b><span>points</span></div>
              </div>
              <button className="btn-hero" onClick={onClose}>Back to games</button>
            </div>
          ) : last ? (
            <p className={`hint ${WARMTH_CLASS[warmth(last.distance)]}`}>
              <strong>{warmth(last.distance)}</strong> · {last.distance.toLocaleString("en-IN")} m · head {compassWord(bearingDegrees(last, place))}
            </p>
          ) : (
            <p className="game-note">Tap the map where you think it is. Three guesses.</p>
          )}
          {!finished && (
            <button className="btn-hero" onClick={() => lockIn(place)} disabled={!pending}>
              {pending ? "Lock in guess" : "Tap the map to guess"}
            </button>
          )}
          <p className="fine">Place data © OpenStreetMap contributors</p>
        </>
      )}
    </GameFrame>
  );
}

export function GoodTurnGame({ state, update, onClose }: { state: AppState; update: Update; onClose: () => void }) {
  const q = state.questions.find((x) => x.id === "sample-induction");
  const done = state.daily.help;
  const elapsed = useElapsed(!done);
  const [writing, setWriting] = useState(false);
  const [text, setText] = useState("");
  if (!q) return null;

  function finish(kind: "marked" | "answered", answerId?: string, answerText?: string) {
    update((s) =>
      completeDaily({
        ...s,
        daily: {
          ...s.daily,
          help: kind,
          helpAnsweredAt: kind === "answered" ? Date.now() : s.daily.helpAnsweredAt,
          times: { ...s.daily.times, help: elapsed },
        },
        questions: s.questions.map((x) => {
          if (x.id !== q!.id) return x;
          if (kind === "marked") return { ...x, answers: x.answers.map((a) => (a.id === answerId ? { ...a, useful: true } : a)) };
          return { ...x, answers: [...x.answers, { id: `mine-${Date.now()}`, by: s.maskName, text: answerText ?? "", useful: false, sample: false }] };
        }),
      }),
    );
  }

  return (
    <GameFrame title="Good Turn" accent="#ffb833" elapsed={state.daily.times?.help ?? elapsed} onClose={onClose}>
      <div className="speech">
        <NeighbourMask name={q.by} me={state} size={52} />
        <div className="bubble">
          <span className="bubble-name">{q.by} <span className="tag">sample</span></span>
          <p>{q.text}</p>
        </div>
      </div>
      {done ? (
        <div className="result">
          <Burst word="GOOD TURN!" />
          <p className="game-note">
            {done === "answered"
              ? `Your tip is on its way to ${q.by}. You'll get Thanks if it helps.`
              : `You picked the tip neighbours should trust. ${q.by} gets the right help faster.`}
          </p>
          <div className="result-stats">
            <div><b>{formatTime(state.daily.times?.help ?? 0)}</b><span>time</span></div>
            <div><b>{state.thanks}</b><span>Thanks</span></div>
          </div>
          <button className="btn-hero" onClick={onClose}>Back to games</button>
        </div>
      ) : (
        <>
          <p className="game-note">Which tip would you trust? Tap it, or add your own.</p>
          <div className="answer-cards">
            {q.answers.map((a) => (
              <button key={a.id} className="answer-card" onClick={() => finish("marked", a.id)}>
                <span className="answer-by">
                  <NeighbourMask name={a.by} me={state} size={24} /> {a.by}
                </span>
                <span>{a.text}</span>
              </button>
            ))}
            {writing ? (
              <div className="answer-card writing">
                <label className="field" htmlFor="good-turn-text">
                  Your tip
                  <textarea id="good-turn-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="A name, a place or a phone-free tip" />
                </label>
                <button className="btn" disabled={!text.trim()} onClick={() => finish("answered", undefined, text.trim())}>Send tip</button>
              </div>
            ) : (
              <button className="answer-card add" onClick={() => setWriting(true)}>＋ I know a better one</button>
            )}
          </div>
        </>
      )}
    </GameFrame>
  );
}

export function QuestGame({ state, update, notify, onClose }: { state: AppState; update: Update; notify: Notify; onClose: () => void }) {
  const done = state.daily.step;
  const elapsed = useElapsed(!done);
  const loc = useLocation();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const place = state.daily.spot && state.daily.spot !== "skipped" ? state.daily.spot.place : null;

  const finish = useCallback(
    (step: "done" | "checked-in" | "later") => {
      update((s) => completeDaily({ ...s, daily: { ...s.daily, step, times: { ...s.daily.times, step: elapsed } } }));
    },
    [update, elapsed],
  );

  useEffect(() => {
    if (!checking || !place) return;
    if (loc.cells && loc.position) {
      const ok = verifyCheckin(loc.cells.cellFine, place);
      const metres = Math.round(haversineMetres(loc.position.lat, loc.position.lng, place.lat, place.lng));
      loc.stop();
      setChecking(false);
      if (ok) {
        notify(`Checked in at ${place.name}.`);
        finish("checked-in");
      } else {
        setMessage(`You're about ${metres.toLocaleString("en-IN")} m away. Check in when you get there.`);
      }
    } else if (loc.status === "denied" || loc.status === "error" || loc.status === "unsupported") {
      setChecking(false);
      setMessage(loc.message);
    }
  }, [checking, loc, place, notify, finish]);

  return (
    <GameFrame title="Quest" accent="#b28cff" elapsed={state.daily.times?.step ?? elapsed} onClose={onClose}>
      {done ? (
        <div className="result">
          <Burst word={done === "later" ? "SAVED!" : "QUEST DONE!"} color={done === "later" ? "#9fb0d8" : "#b28cff"} />
          <p className="game-note">
            {done === "checked-in" ? "Verified by your phone's location. Your position never left your phone." : done === "done" ? "Small steps make a neighbourhood." : "Saved for later. It'll still count tomorrow."}
          </p>
          <button className="btn-hero" onClick={onClose}>Back to games</button>
        </div>
      ) : (
        <>
          <p className="game-note">Pick one small step in the real world.</p>
          <div className="quest-card">
            <NeighbourMask name="Scott Mathew" me={state} size={48} />
            <div>
              <span className="quest-title">Say hi to Scott Mathew</span>
              <span className="muted">The newest neighbour (sample) moved in yesterday.</span>
            </div>
            <button className="btn" onClick={() => finish("done")}>Done</button>
          </div>
          {place && (
            <div className="quest-card">
              <span className="quest-pin" aria-hidden="true">📍</span>
              <div>
                <span className="quest-title">Visit {place.name}</span>
                <span className="muted">Today&apos;s Spot place. Your phone checks you&apos;re really there.</span>
              </div>
              <button
                className="btn"
                disabled={checking}
                onClick={() => {
                  setMessage(null);
                  setChecking(true);
                  loc.start();
                }}
              >
                {checking ? "Checking…" : "Check in"}
              </button>
            </div>
          )}
          {message && <p className="hint guess-warm">{message}</p>}
          <button className="linkish center" onClick={() => finish("later")}>Save it for later</button>
        </>
      )}
    </GameFrame>
  );
}
