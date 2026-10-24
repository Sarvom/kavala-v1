"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { latLngToCell } from "h3-js";
import { useLocation } from "@/lib/geo/useLocation";
import { assignNeighbourhood } from "@/lib/hood/assign";
import { KOCHI_CENTRE } from "@/lib/hood/synthetic";
import { MASK_COLORS, randomMaskName, type AppState } from "@/lib/app/state";
import type { GoogleAccount } from "@/lib/app/useGoogleAccount";
import { Mask } from "./Mask";
import GoogleButton from "./GoogleButton";

const Neighbourhood3D = dynamic(() => import("./Neighbourhood3D"), { ssr: false });

interface Props {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  notify: (message: string) => void;
  google: GoogleAccount;
}

export default function JoinView({ state, update, notify, google }: Props) {
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
          <>
          <Neighbourhood3D
            hoodCell={assignNeighbourhood(home.cell, []).hood.cells[0]}
            homeCell={home.cell}
            height={220}
            threads={0}
            label="Your neighbourhood. Your block glows amber; drag to turn it."
          />
          <div className="row">
            <div style={{ minWidth: 0 }}>
              <strong>{home.fromGps ? "Found from your phone's location" : "Using a demo location in Kochi"}</strong>
              <p className="muted">
                We keep only an area of about 0.1 sq km, never your exact position.
                {home.fromGps ? "" : " Demo locations count as lower trust."}
              </p>
            </div>
          </div>
          </>
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

      <div className="card">
        <p className="eyebrow">Step 3 · Create your profile (optional)</p>
        {state.account ? (
          <div className="row">
            {state.account.avatarUrl && <img className="avatar" src={state.account.avatarUrl} alt="" referrerPolicy="no-referrer" />}
            <div style={{ minWidth: 0 }}>
              <strong>Signed in as {state.account.name}</strong>
              <p className="muted">Your name stays hidden. Neighbours see {state.maskName} unless you choose to reveal it.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="muted">
              Connect your Google account to keep your profile safe and count as verified. Your Google name is never shown to
              neighbours unless you choose to reveal it.
            </p>
            <GoogleButton google={google} />
          </>
        )}
      </div>

      <button className="btn wide" onClick={join} disabled={!home}>
        Join my neighbourhood
      </button>
    </section>
  );
}
