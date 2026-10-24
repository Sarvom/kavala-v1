"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dailyKey } from "@/lib/daily/score";
import { advance, clearState, initialState, loadState, rollDay, saveState, type AppState } from "@/lib/app/state";
import JoinView from "./JoinView";
import TodayView from "./TodayView";
import AskView from "./AskView";
import HoodView from "./HoodView";
import MeView from "./MeView";

type Tab = "today" | "ask" | "hood" | "me";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "today", label: "Today", icon: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" /> },
  { id: "ask", label: "Ask", icon: <><path d="M5 5h14v10H9l-4 4z" /><path d="M12 8.5v2.5" /><path d="M12 13h.01" /></> },
  { id: "hood", label: "Neighbourhood", icon: <><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" /><circle cx="12" cy="12" r="2.5" /></> },
  { id: "me", label: "Me", icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></> },
];

/**
 * The Kavala app experience. Progress is saved in this browser only; sample
 * neighbours stand in for real ones until accounts and the database arrive.
 */
export default function KavalaApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);
  const stateRef = useRef<AppState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState((s) => (s ? fn(s) : s));
  }, []);

  useEffect(() => {
    const key = dailyKey();
    setState(rollDay(loadState() ?? initialState(key), key));
  }, []);

  useEffect(() => {
    stateRef.current = state;
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    const timer = setInterval(() => {
      const current = stateRef.current;
      if (!current) return;
      const rolled = rollDay(current, dailyKey());
      const { state: next, events } = advance(rolled, Date.now());
      if (next !== current) setState(next);
      if (events.length > 0) notify(events[events.length - 1].message);
    }, 2000);
    return () => clearInterval(timer);
  }, [notify]);

  function reset() {
    clearState();
    setTab("today");
    setState(initialState(dailyKey()));
  }

  if (!state) {
    return (
      <div className="app">
        <p className="muted center">Loading your neighbourhood…</p>
      </div>
    );
  }

  return (
    <div className="app">
      {!state.joined ? (
        <JoinView state={state} update={update} notify={notify} />
      ) : (
        <>
          <div className="app-bar">
            <span className="chip">Your neighbourhood</span>
            <span className="chip gold">{state.thanks} Thanks</span>
          </div>
          <div className="app-body">
            {tab === "today" && <TodayView state={state} update={update} notify={notify} goToAsk={() => setTab("ask")} />}
            {tab === "ask" && <AskView state={state} update={update} notify={notify} />}
            {tab === "hood" && <HoodView state={state} />}
            {tab === "me" && <MeView state={state} update={update} notify={notify} onReset={reset} />}
          </div>
          <nav className="tabs" aria-label="App sections">
            {TABS.map((t) => (
              <button key={t.id} className="tab" aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
                {t.label}
              </button>
            ))}
          </nav>
        </>
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </div>
  );
}
