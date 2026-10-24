"use client";

import { useState } from "react";
import { type AppState } from "@/lib/app/state";
import { Mask, maskColorFor } from "./Mask";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  notify: (message: string) => void;
  onReset: () => void;
}

const REGULARS = ["Kind Lantern", "Brave Auto", "Rainy Mango"];

export default function MeView({ state, update, notify, onReset }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const verified = state.level === "verified";

  function toggleReveal(name: string, on: boolean) {
    update((s) => ({ ...s, revealedTo: on ? [...s.revealedTo, name] : s.revealedTo.filter((n) => n !== name) }));
    notify(on ? `${name} can now see your real name.` : `${name} sees ${state.maskName} again.`);
  }

  return (
    <>
      <div className="card center-card">
        <Mask color={state.maskColor} size={76} />
        <div className="mask-name">{state.maskName}</div>
        <span className="chip">{verified ? "Verified" : "Masked"}</span>
      </div>
      <div className="stats">
        <div className="stat"><b>{state.thanks}</b><span>Thanks</span></div>
        <div className="stat"><b>{state.streak}</b><span>Day streak</span></div>
        <div className="stat"><b>1</b><span>Rest day a week</span></div>
      </div>

      <section className="card">
        <h2>Trust ladder</h2>
        <ol className="ladder">
          <li className={verified ? "done" : "current"}>
            <span className="badge">1</span>
            <div>
              <h3>Masked</h3>
              <p>Play, ask (3 a day), answer, receive Thanks, join public meetups.</p>
            </div>
          </li>
          <li className={verified ? "current" : ""}>
            <span className="badge">2</span>
            <div>
              <h3>Verified</h3>
              <p>Message neighbours with mutual consent, ask 10 a day, and reveal your name to people you choose.</p>
              {!verified && (
                <button
                  className="btn small"
                  onClick={() => {
                    update((s) => ({ ...s, level: "verified" }));
                    notify("Phone verified (demo). You can now reveal your name to people you choose.");
                  }}
                >
                  Verify phone (demo)
                </button>
              )}
            </div>
          </li>
          <li>
            <span className="badge">3</span>
            <div>
              <h3>Vouched</h3>
              <p>
                A neighbour vouches for you by exchanging a signed code in person. Lets you host meetups.{" "}
                <a href="/debug/handshake">Try the handshake</a>
              </p>
            </div>
          </li>
          <li>
            <span className="badge">4</span>
            <div>
              <h3>Watch</h3>
              <p>Trusted neighbours who review reports and welcome newcomers. Coming next.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>Reveal your name</h2>
        {verified ? (
          <>
            {REGULARS.map((n, i) => (
              <label key={n} className="check" htmlFor={`reveal-${i}`}>
                <input
                  type="checkbox"
                  id={`reveal-${i}`}
                  checked={state.revealedTo.includes(n)}
                  onChange={(e) => toggleReveal(n, e.target.checked)}
                />
                <Mask color={maskColorFor(n, state)} size={24} />
                {n} <span className="tag">sample</span>
              </label>
            ))}
            <p className="muted">Everyone else still sees {state.maskName}.</p>
          </>
        ) : (
          <p className="muted">Verify your phone to reveal your real name to people you choose. Until then everyone sees {state.maskName}.</p>
        )}
      </section>

      <section className="card">
        <h2>What Kavala keeps about you</h2>
        <p className="muted">
          Home area: <span className="mono">{state.homeCell}</span> (an H3 hexagon of about 0.1 sq km
          {state.homeFromGps ? ", from your phone's location" : ", a demo location"}). No coordinates are stored. In this demo,
          everything is saved only in this browser.
        </p>
        <p className="muted">
          See how it works: <a href="/engine">the engine behind Kavala</a>.
        </p>
        {confirmReset ? (
          <div className="row">
            <span className="muted">Start over and clear everything on this phone?</span>
            <button className="btn small danger" onClick={onReset}>Yes, start over</button>
            <button className="btn ghost small" onClick={() => setConfirmReset(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn ghost small" onClick={() => setConfirmReset(true)}>Start over</button>
        )}
      </section>
    </>
  );
}
