"use client";

import { useEffect, useState } from "react";
import { dailyNumber, SAMPLE_BOARD, SAMPLE_PLAYED_TODAY, type AppState } from "@/lib/app/state";
import { GameIcon, formatTime } from "./GameKit";
import { GoodTurnGame, QuestGame, SpotGame, SQUARE_EMOJI } from "./Games";
import { NeighbourMask } from "./Mask";

type Game = "spot" | "help" | "quest";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  notify: (message: string) => void;
}

/** Milliseconds until the next daily, which starts at 6:00 AM India time (00:30 UTC). */
function msUntilNextDaily(dailyKey: string, now: number): number {
  const next = Date.parse(`${dailyKey}T00:30:00Z`) + 86_400_000;
  return Math.max(0, next - now);
}

function countdown(ms: number): string {
  const m = Math.floor(ms / 60_000);
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

function shareText(state: AppState): string {
  const d = state.daily;
  const spot = d.spot && d.spot !== "skipped" ? d.spot : null;
  const tries = spot?.tries?.map((t) => SQUARE_EMOJI[t <= 120 ? "green" : t <= 500 ? "yellow" : t <= 2000 ? "orange" : "grey"]).join("") ?? (spot ? SQUARE_EMOJI[spot.square] : "⬜");
  return [
    `Kavala #${dailyNumber(d.key)}`,
    `📍 Spot ${tries}${spot?.timeMs ? ` ${formatTime(spot.timeMs)}` : ""}`,
    `🤝 Good Turn ${d.help && d.help !== "skipped" ? "✓" : "–"}`,
    `🌱 Quest ${d.step === "done" || d.step === "checked-in" ? "✓" : "–"}`,
    "Your friendly neighbourhood",
  ].join("\n");
}

export default function GameHub({ state, update, notify }: Props) {
  const [open, setOpen] = useState<Game | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const close = () => setOpen(null);
  if (open === "spot") return <SpotGame state={state} update={update} onClose={close} />;
  if (open === "help") return <GoodTurnGame state={state} update={update} onClose={close} />;
  if (open === "quest") return <QuestGame state={state} update={update} notify={notify} onClose={close} />;

  const d = state.daily;
  const spot = d.spot && d.spot !== "skipped" ? d.spot : null;
  const played = SAMPLE_PLAYED_TODAY + (d.done ? 1 : 0);

  const tiles: { id: Game; name: string; tagline: string; color: string; status: string | null }[] = [
    {
      id: "spot",
      name: "Spot",
      tagline: "Find the place on the map",
      color: "#3ddc97",
      status: d.spot === "skipped" ? "Skipped" : spot ? `${(spot.tries ?? [spot.distance]).map((t) => SQUARE_EMOJI[t <= 120 ? "green" : t <= 500 ? "yellow" : t <= 2000 ? "orange" : "grey"]).join("")}  ${formatTime(spot.timeMs ?? 0)}` : null,
    },
    {
      id: "help",
      name: "Good Turn",
      tagline: "Help a neighbour out",
      color: "#ffb833",
      status: d.help ? `✓ ${formatTime(d.times?.help ?? 0)}` : null,
    },
    {
      id: "quest",
      name: "Quest",
      tagline: "One small step outside",
      color: "#b28cff",
      status: d.step ? (d.step === "later" ? "Saved for later" : `✓ ${d.step === "checked-in" ? "Checked in" : "Done"}`) : null,
    },
  ];

  const board = [
    ...SAMPLE_BOARD.map((r) => ({ ...r, me: false })),
    ...(spot ? [{ name: state.maskName, points: spot.points, me: true }] : []),
  ].sort((a, b) => b.points - a.points);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareText(state));
      notify("Result copied");
    } catch {
      notify("Couldn't copy automatically.");
    }
  }

  return (
    <div className="hub">
      <header className="hub-head">
        <div>
          <span className="hub-kicker">Kavala Daily</span>
          <span className="hub-number">#{dailyNumber(d.key)}</span>
        </div>
        <div className="streak" aria-label={`${state.streak} day streak`}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z" fill="#ffb833" />
          </svg>
          <b>{state.streak}</b>
        </div>
      </header>

      <div className="tiles">
        {tiles.map((t) => (
          <button key={t.id} className={`tile ${t.status ? "done" : ""}`} style={{ "--tile": t.color } as React.CSSProperties} onClick={() => setOpen(t.id)}>
            <span className="tile-icon"><GameIcon kind={t.id} /></span>
            <span className="tile-text">
              <span className="tile-name">{t.name}</span>
              <span className="tile-tag">{t.status ?? t.tagline}</span>
            </span>
            <span className="tile-cta">{t.status ? "View" : "Play"}</span>
          </button>
        ))}
      </div>
      <p className="hub-played">{played} neighbours played today <span className="tag">sample</span></p>

      {d.done && (
        <section className="complete">
          <span className="complete-word">Daily complete!</span>
          <pre className="share-box">{shareText(state)}</pre>
          <div className="two-col">
            <button className="btn ghost" onClick={copy}>Copy</button>
            <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(shareText(state))}`} target="_blank" rel="noopener noreferrer">
              Share on WhatsApp
            </a>
          </div>
          <span className="muted">Next daily in {countdown(msUntilNextDaily(d.key, now))}</span>
        </section>
      )}

      <section className="board-card">
        <span className="board-title">Neighbourhood leaderboard</span>
        <ol className="board">
          {board.map((r, i) => (
            <li key={r.name} className={r.me ? "me" : ""}>
              <span className="rank">{i + 1}</span>
              <NeighbourMask name={r.name} me={state} size={28} />
              <span>
                {r.me ? `${r.name} (you)` : r.name}
              </span>
              <span className="pts">{r.points}</span>
            </li>
          ))}
        </ol>
        {!spot && <span className="muted">Play Spot to get on the board.</span>}
      </section>
    </div>
  );
}
