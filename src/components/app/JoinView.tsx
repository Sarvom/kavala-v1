"use client";

import { useEffect, useState } from "react";
import { latLngToCell } from "h3-js";
import { useLocation } from "@/lib/geo/useLocation";
import { assignNeighbourhood } from "@/lib/hood/assign";
import { KOCHI_CENTRE } from "@/lib/hood/synthetic";
import { MASK_COLORS, randomMaskName, type AppState } from "@/lib/app/state";
import { Mask } from "./Mask";

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  notify: (message: string) => void;
}

export default function JoinView({ state, update, notify }: Props) {
  const loc = useLocation();
  const [home, setHome] = useState<{ cell: string; fromGps: boolean } | null>(null);

  useEffect(() => {
    if (loc.cells && !home) {
      setHome({ cell: loc.cells.cellR9, fromGps: true });
      loc.stop();
    }
  }, [loc, home]);

  function chooseDemoLocation() {
    loc.stop();
    setHome({ cell: latLngToCell(KOCHI_CENTRE.lat, KOCHI_CENTRE.lng, 9), fromGps: false });
  }

  function join() {
    if (!home) return;
    const { hood } = assignNeighbourhood(home.cell, []);
    update((s) => ({
      ...s,
      joined: true,
      homeCell: home.cell,
      homeFromGps: home.fromGps,
      hood: { id: hood.id, cells: hood.cells, resolution: hood.resolution },
    }));
    notify(`Welcome to your neighbourhood, ${state.maskName}.`);
  }

  const asking = loc.status === "asking" || loc.status === "watching";

  return (
    <section className="join">
      <div className="join-hero">
        <p className="eyebrow">Your friendly neighbourhood</p>
        <h1 className="display">Kavala</h1>
        <p className="lede">Trying to do better, one small step at a time.</p>
      </div>

      <div className="card">
        <p className="eyebrow">Step 1 · Find your neighbourhood</p>
        {home ? (
          <div className="row">
            <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
              <polygon points="32,4 56,18 56,46 32,60 8,46 8,18" fill="var(--surface-2)" stroke="var(--leaf)" strokeWidth="3" />
              <circle cx="32" cy="32" r="5" fill="var(--turmeric)" />
            </svg>
            <div style={{ minWidth: 0 }}>
              <strong>{home.fromGps ? "Found from your phone's location" : "Using a demo location in Kochi"}</strong>
              <p className="muted">
                We keep only an area of about 0.1 sq km, never your exact position.
                {home.fromGps ? "" : " Demo locations count as lower trust."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="muted">
              Your phone reads its location and turns it into a hexagon ID. Only that ID is kept, never your coordinates.
            </p>
            <div className="row">
              <button className="btn" onClick={loc.start} disabled={asking}>
                {asking ? "Reading location…" : "Use my location"}
              </button>
              <button className="btn ghost" onClick={chooseDemoLocation}>Use a demo location in Kochi</button>
            </div>
            {loc.message && <p className="muted">{loc.message}</p>}
            {loc.lastRejection && !loc.cells && <p className="muted">{loc.lastRejection}</p>}
          </>
        )}
      </div>

      <div className="card mask-pick">
        <p className="eyebrow">Step 2 · You start masked</p>
        <Mask color={state.maskColor} size={84} />
        <div className="mask-name">{state.maskName}</div>
        <div className="row" role="group" aria-label="Mask colour" style={{ justifyContent: "center" }}>
          {MASK_COLORS.map((c, i) => (
            <button
              key={c}
              className="swatch-btn"
              style={{ background: c }}
              aria-label={`Colour ${i + 1}`}
              aria-pressed={c === state.maskColor}
              onClick={() => update((s) => ({ ...s, maskColor: c }))}
            />
          ))}
        </div>
        <button className="btn ghost small" onClick={() => update((s) => ({ ...s, maskName: randomMaskName() }))}>
          Shuffle name
        </button>
        <p className="muted">No phone number needed to start. Neighbours see only your mask until you choose to reveal more.</p>
      </div>

      <button className="btn wide" onClick={join} disabled={!home}>
        Join my neighbourhood
      </button>
    </section>
  );
}
