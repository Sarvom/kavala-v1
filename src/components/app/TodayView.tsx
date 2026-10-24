"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { cellToLatLng } from "h3-js";
import { guessDistance, spotPoints, spotSquare, verifyCheckin } from "@/lib/daily/score";
import { OVERPASS_URL, overpassQuery, parseOverpass, pickDailyPlace, searchRadiusFor, type SpotPlace } from "@/lib/daily/spotPlace";
import { haversineMetres } from "@/lib/geo/filter";
import { useLocation } from "@/lib/geo/useLocation";
import {
  dailyNumber,
  nextStreak,
  SAMPLE_BOARD,
  SAMPLE_PLAYED_TODAY,
  type AppState,
  type SpotResult,
} from "@/lib/app/state";
import { Mask, maskColorFor } from "./Mask";

const SpotMap = dynamic(() => import("./SpotMap"), { ssr: false });
const Neighbourhood3D = dynamic(() => import("./Neighbourhood3D"), { ssr: false });

type Stage = "home" | "spot" | "help" | "step" | "result";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  notify: (message: string) => void;
  goToAsk: () => void;
  goToMe?: () => void;
  googleAvailable?: boolean;
}

const SQUARE_EMOJI = { green: "🟩", yellow: "🟨", orange: "🟧", grey: "⬜" } as const;

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function prettyDate(key: string): string {
  try {
    return new Date(`${key}T12:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return key;
  }
}

function spotResult(state: AppState): SpotResult | null {
  return state.daily.spot && state.daily.spot !== "skipped" ? state.daily.spot : null;
}

function played(state: AppState): number {
  return SAMPLE_PLAYED_TODAY + (state.daily.done ? 1 : 0);
}

export default function TodayView({ state, update, notify, goToAsk, goToMe, googleAvailable }: Props) {
  const [stage, setStage] = useState<Stage>("home");
  const d = state.daily;

  function nextStage(): Stage {
    if (!d.spot) return "spot";
    if (!d.help) return "help";
    if (!d.step) return "step";
    return "result";
  }

  if (stage === "spot") return <SpotStage state={state} update={update} onNext={() => setStage("help")} onClose={() => setStage("home")} />;
  if (stage === "help") return <HelpStage state={state} update={update} onNext={() => setStage("step")} onClose={() => setStage("home")} />;
  if (stage === "step")
    return <StepStage state={state} update={update} notify={notify} onNext={() => setStage("result")} onClose={() => setStage("home")} />;
  if (stage === "result") return <ResultStage state={state} notify={notify} onClose={() => setStage("home")} />;

  const parts: [string, boolean][] = [
    ["Spot", !!d.spot],
    ["Help", !!d.help],
    ["Small step", !!d.step],
  ];
  const openQuestions = state.questions.filter((q) => !q.mine).slice(0, 3);

  return (
    <>
      <p className="eyebrow">
        {greeting()}, {state.maskName} · your friendly neighbourhood
      </p>
      {state.hood && (
        <Neighbourhood3D
          hoodCell={state.hood.cells[0]}
          homeCell={state.homeCell}
          height={210}
          threads={Math.min(8, 2 + state.thanks)}
          label="Your web: amber threads link your block to neighbours. Help more, and it grows."
        />
      )}
      <section className="daily-card" aria-label="Today's Kavala Daily">
        <span className="daily-meta">KAVALA DAILY · {prettyDate(d.key)}</span>
        <div className="daily-num">#{dailyNumber(d.key)}</div>
        {d.done ? (
          <p className="daily-copy strong">Done for today. See you tomorrow.</p>
        ) : (
          <p className="daily-copy">Three small parts, about two minutes. Everyone in your neighbourhood plays the same one today.</p>
        )}
        <div className="steps">
          {parts.map(([label, done]) => (
            <span key={label} className={`step-pill ${done ? "done" : ""}`}>
              {label}
            </span>
          ))}
        </div>
        <button className="btn gold" onClick={() => setStage(d.done ? "result" : nextStage())}>
          {d.done ? "View today's result" : d.spot || d.help || d.step ? "Continue" : "Start"}
        </button>
      </section>

      <div className="stats">
        <div className="stat"><b>{state.thanks}</b><span>Thanks</span></div>
        <div className="stat"><b>{state.streak}</b><span>Day streak</span></div>
        <div className="stat"><b>{played(state)}</b><span>Played today*</span></div>
      </div>

      <section className="card">
        <div className="row between">
          <h2>Asked nearby</h2>
          <button className="linkish" onClick={goToAsk}>See all</button>
        </div>
        {openQuestions.map((q) => (
          <article key={q.id} className="q">
            <div className="who">
              <Mask color={maskColorFor(q.by, state)} size={24} />
              <strong>{q.by}</strong>
              <span className="tag">sample</span>
              <span className="cat">{q.category}</span>
            </div>
            <p>{q.text}</p>
            <p className="muted">{q.answers.length} {q.answers.length === 1 ? "answer" : "answers"}</p>
          </article>
        ))}
        <button className="btn ghost" onClick={goToAsk}>Ask your neighbours</button>
      </section>
      {!state.account && googleAvailable && goToMe && (
        <section className="card">
          <h2>Create your profile</h2>
          <p className="muted">Connect Google to keep your profile and count as verified. Neighbours still see only your mask.</p>
          <button className="btn ghost" onClick={goToMe}>Set up my profile</button>
        </section>
      )}
      <p className="muted">* Neighbours, questions and counts marked sample are demo content until accounts arrive.</p>
    </>
  );
}

function FlowHead({ step, onClose }: { step: number; onClose: () => void }) {
  return (
    <div className="flow-head">
      <div className="progress" aria-label={`Part ${step} of 3`}>
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= step ? "on" : ""} />
        ))}
      </div>
      <button className="close" onClick={onClose}>Close</button>
    </div>
  );
}

type PlaceLoad = { status: "loading" } | { status: "ready"; place: SpotPlace } | { status: "error"; message: string };

function useSpotPlace(state: AppState): [PlaceLoad, () => void] {
  const [load, setLoad] = useState<PlaceLoad>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const hood = state.hood;
  const key = state.daily.key;

  useEffect(() => {
    if (!hood) return;
    const cacheKey = `kavala-spot-${key}-${hood.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setLoad({ status: "ready", place: JSON.parse(cached) });
        return;
      }
    } catch {
      // No cache available; fetch below.
    }
    let cancelled = false;
    setLoad({ status: "loading" });
    const [lat, lng] = cellToLatLng(hood.cells[0]);
    const radius = searchRadiusFor(hood.resolution);

    async function fetchPlaces(r: number): Promise<SpotPlace[]> {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(overpassQuery(lat, lng, r))}`,
      });
      if (!res.ok) throw new Error(`OpenStreetMap search answered ${res.status}`);
      return parseOverpass(await res.json());
    }

    (async () => {
      try {
        let places = await fetchPlaces(radius);
        if (places.length === 0) places = await fetchPlaces(radius * 2);
        const place = pickDailyPlace(places, key, hood.id);
        if (cancelled) return;
        if (!place) {
          setLoad({ status: "error", message: "No named public places were found nearby in OpenStreetMap." });
          return;
        }
        try {
          localStorage.setItem(cacheKey, JSON.stringify(place));
        } catch {
          // Caching is optional.
        }
        setLoad({ status: "ready", place });
      } catch {
        if (!cancelled) setLoad({ status: "error", message: "Couldn't reach OpenStreetMap to pick today's place." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hood, key, attempt]);

  return [load, () => setAttempt((a) => a + 1)];
}

function SpotStage({ state, update, onNext, onClose }: { state: AppState; update: Props["update"]; onNext: () => void; onClose: () => void }) {
  const [load, retry] = useSpotPlace(state);
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const done = spotResult(state);
  const center = state.hood ? (cellToLatLng(state.hood.cells[0]) as [number, number]) : ([9.9816, 76.2999] as [number, number]);

  function confirm(place: SpotPlace) {
    if (!guess) return;
    const distance = guessDistance({ lat: guess[0], lng: guess[1] }, place);
    update((s) => ({
      ...s,
      daily: { ...s.daily, spot: { place, distance, points: spotPoints(distance), square: spotSquare(distance) } },
    }));
  }

  return (
    <>
      <FlowHead step={1} onClose={onClose} />
      <div>
        <p className="eyebrow">Part 1 · Spot</p>
        <h1 className="flow-title">Where&apos;s this?</h1>
      </div>
      {load.status === "loading" && <p className="muted">Picking today&apos;s place from OpenStreetMap…</p>}
      {load.status === "error" && (
        <div className="card">
          <p>{load.message}</p>
          <div className="row">
            <button className="btn" onClick={retry}>Try again</button>
            <button
              className="btn ghost"
              onClick={() => {
                update((s) => ({ ...s, daily: { ...s.daily, spot: "skipped" } }));
                onNext();
              }}
            >
              Skip Spot today
            </button>
          </div>
        </div>
      )}
      {load.status === "ready" && (
        <>
          <p className="clue">
            Find <strong>{load.place.name}</strong>, a {load.place.kind} in your neighbourhood. Tap the map where you think it is.
          </p>
          <SpotMap
            center={center}
            guess={done ? null : guess}
            target={done ? { lat: done.place.lat, lng: done.place.lng, name: done.place.name } : null}
            onPick={done ? undefined : (lat, lng) => setGuess([lat, lng])}
          />
          {done ? (
            <>
              <div className="card outcome">
                <span className={`sq ${done.square}`} aria-hidden="true" />
                <div>
                  <div className="big-num">{done.distance.toLocaleString("en-IN")} m off</div>
                  <p className="muted">{done.points} points for your neighbourhood&apos;s leaderboard.</p>
                </div>
              </div>
              <button className="btn wide" onClick={onNext}>Next: help a neighbour</button>
            </>
          ) : guess ? (
            <button className="btn wide" onClick={() => confirm(load.place)}>Confirm my guess</button>
          ) : (
            <p className="muted center">Tap the map to drop your guess. Tap again to move it.</p>
          )}
          <p className="muted">Place data &copy; OpenStreetMap contributors.</p>
        </>
      )}
    </>
  );
}

function HelpStage({ state, update, onNext, onClose }: { state: AppState; update: Props["update"]; onNext: () => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const q = state.questions.find((x) => x.id === "sample-induction");
  const d = state.daily;
  if (!q) return null;

  function markUseful(answerId: string) {
    update((s) => ({
      ...s,
      daily: { ...s.daily, help: "marked" },
      questions: s.questions.map((x) =>
        x.id !== q!.id ? x : { ...x, answers: x.answers.map((a) => (a.id === answerId ? { ...a, useful: true } : a)) },
      ),
    }));
  }

  function postAnswer() {
    const value = text.trim();
    if (!value) return;
    update((s) => ({
      ...s,
      daily: { ...s.daily, help: "answered", helpAnsweredAt: Date.now() },
      questions: s.questions.map((x) =>
        x.id !== q!.id
          ? x
          : { ...x, answers: [...x.answers, { id: `mine-${Date.now()}`, by: s.maskName, text: value, useful: false, sample: false }] },
      ),
    }));
  }

  return (
    <>
      <FlowHead step={2} onClose={onClose} />
      <div>
        <p className="eyebrow">Part 2 · Help</p>
        <h1 className="flow-title">{d.help ? (d.help === "skipped" ? "No problem" : "Thank you") : "A neighbour asked"}</h1>
      </div>
      <section className="card">
        <div className="who">
          <Mask color={maskColorFor(q.by, state)} size={26} />
          <strong>{q.by}</strong>
          <span className="tag">sample</span>
          <span className="cat">{q.category}</span>
        </div>
        <p className="clue">{q.text}</p>
        {q.answers.map((a) => (
          <div key={a.id} className="answer">
            <div className="who">
              <Mask color={maskColorFor(a.by, state)} size={22} />
              <strong>{a.by === state.maskName ? "You" : a.by}</strong>
              {a.sample && <span className="tag">sample</span>}
            </div>
            <p>{a.text}</p>
            {a.useful ? (
              <span className="useful">Marked useful</span>
            ) : !d.help && a.by !== state.maskName ? (
              <div>
                <button className="btn ghost small" onClick={() => markUseful(a.id)}>This is useful</button>
              </div>
            ) : null}
          </div>
        ))}
      </section>
      {d.help ? (
        <>
          <p className="muted">
            {d.help === "answered"
              ? "Your answer is posted. You'll receive Thanks if Rainy Mango finds it useful."
              : d.help === "marked"
                ? "You marked the most useful answer, so the next person sees the tip neighbours trust."
                : "Skipped for today. The question stays open for others."}
          </p>
          <button className="btn wide" onClick={onNext}>Next: today&apos;s small step</button>
        </>
      ) : (
        <>
          <label className="field" htmlFor="help-text">
            Know something better?
            <textarea id="help-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Share a name, a place or a tip" />
          </label>
          <button className="btn wide" onClick={postAnswer} disabled={!text.trim()}>Post my answer</button>
          <button className="linkish" onClick={() => update((s) => ({ ...s, daily: { ...s.daily, help: "skipped" } }))}>
            Skip for today
          </button>
        </>
      )}
    </>
  );
}

function StepStage({
  state,
  update,
  notify,
  onNext,
  onClose,
}: {
  state: AppState;
  update: Props["update"];
  notify: Props["notify"];
  onNext: () => void;
  onClose: () => void;
}) {
  const loc = useLocation();
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const place = spotResult(state)?.place ?? null;

  function finish(step: "done" | "checked-in" | "later") {
    update((s) => ({
      ...s,
      streak: nextStreak(s.lastPlayedKey, s.daily.key, s.streak),
      lastPlayedKey: s.daily.key,
      daily: { ...s.daily, step, done: true },
    }));
    onNext();
  }

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
        setCheckMessage(`You're about ${metres.toLocaleString("en-IN")} m from ${place.name}. Check in when you're there.`);
      }
    } else if (loc.status === "denied" || loc.status === "error" || loc.status === "unsupported") {
      setChecking(false);
      setCheckMessage(loc.message);
    }
    // finish and notify are stable enough for this one-shot check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, loc.cells, loc.position, loc.status, place]);

  return (
    <>
      <FlowHead step={3} onClose={onClose} />
      <div>
        <p className="eyebrow">Part 3 · Small step</p>
        <h1 className="flow-title">Try to do better</h1>
      </div>
      <div className="card">
        <div className="row">
          <Mask color={maskColorFor("Morning Kite", state)} size={40} />
          <p className="muted">Morning Kite (sample) joined your neighbourhood yesterday.</p>
        </div>
        <p className="small-step">Say hi to the newest neighbour.</p>
        <p className="muted">A wave on the street or a reply to their first question both count.</p>
        <button className="btn" onClick={() => finish("done")}>I did it</button>
      </div>
      {place && (
        <div className="card">
          <p className="small-step">Or visit {place.name} and check in.</p>
          <p className="muted">
            Your phone checks that you are really there: its hexagon must be the place&apos;s hexagon or touch it. Your position never
            leaves the phone.
          </p>
          <button
            className="btn ghost"
            disabled={checking}
            onClick={() => {
              setCheckMessage(null);
              setChecking(true);
              loc.start();
            }}
          >
            {checking ? "Checking where you are…" : "Check in here"}
          </button>
          {checkMessage && <p className="muted">{checkMessage}</p>}
        </div>
      )}
      <button className="linkish" onClick={() => finish("later")}>Save it for later</button>
    </>
  );
}

function ResultStage({ state, notify, onClose }: { state: AppState; notify: Props["notify"]; onClose: () => void }) {
  const d = state.daily;
  const spot = spotResult(state);
  const helped = d.help === "answered" || d.help === "marked";
  const stepped = d.step === "done" || d.step === "checked-in";
  const text = [
    `Kavala #${dailyNumber(d.key)}`,
    `📍 ${spot ? `${SQUARE_EMOJI[spot.square]} Spot: ${spot.distance} m off` : "⬜ Spot skipped"}`,
    `🤝 ${helped ? "Helped a neighbour" : "Help skipped"}`,
    `🌱 ${d.step === "checked-in" ? "Checked in nearby" : stepped ? "Small step done" : "Small step saved for later"}`,
    `${played(state)} neighbours played today`,
  ].join("\n");

  const board = [...SAMPLE_BOARD.map((r) => ({ ...r, me: false })), ...(spot ? [{ name: state.maskName, points: spot.points, me: true }] : [])].sort(
    (a, b) => b.points - a.points,
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      notify("Result copied");
    } catch {
      notify("Couldn't copy automatically. Select the text and copy it.");
    }
  }

  return (
    <>
      <div className="tomorrow">
        <p className="eyebrow">Kavala Daily #{dailyNumber(d.key)}</p>
        <h1 className="flow-title">See you tomorrow</h1>
        <p className="muted">That&apos;s everything for today. Nothing more to scroll.</p>
      </div>
      <section className="card">
        <div className="r-line">
          <span className={`sq small ${spot ? spot.square : "grey"}`} />
          {spot ? `Spot: ${spot.distance.toLocaleString("en-IN")} m off · ${spot.points} pts` : "Spot skipped"}
        </div>
        <div className="r-line">
          <span className={`dot ${helped ? "yes" : ""}`}>{helped ? "✓" : "–"}</span>
          {helped ? "Helped a neighbour" : "Help skipped"}
        </div>
        <div className="r-line">
          <span className={`dot ${stepped ? "yes" : ""}`}>{stepped ? "✓" : "–"}</span>
          {d.step === "checked-in" ? "Checked in nearby (verified by location)" : stepped ? "Small step done" : "Small step saved for later"}
        </div>
      </section>
      <pre className="mono copybox">{text}</pre>
      <div className="two-col">
        <button className="btn ghost" onClick={copy}>Copy result</button>
        <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
          Share on WhatsApp
        </a>
      </div>
      <section className="card">
        <h2>Today&apos;s leaderboard</h2>
        <ol className="board">
          {board.map((r, i) => (
            <li key={r.name} className={r.me ? "me" : ""}>
              <span className="rank">{i + 1}</span>
              <Mask color={maskColorFor(r.name, state)} size={26} />
              <span>
                {r.me ? `${r.name} (you)` : r.name} {!r.me && <span className="tag">sample</span>}
              </span>
              <span className="pts">{r.points}</span>
            </li>
          ))}
        </ol>
      </section>
      <button className="btn ghost wide" onClick={onClose}>Back to today</button>
    </>
  );
}
