# Change log

## 2026-10-24T21:53:05+05:30 — Correct Devin Hack Kochi event guidance

- Changed: corrected the current event name and AI tool guidance in `.github/pull_request_template.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `README.md`, `RULES.md`, `SUBMISSION.md`.
- Why: the organizer shared an older event template; Devin Hack Kochi has no
  major AI usage constraints and the template must not require a particular AI provider.
- Scope: preserved project implementation and historical assistance records.
- Removed obsolete template logistics, participation limits, and credit promises; current organizer instructions remain authoritative.
- Validation: reviewed documentation diffs, checked whitespace with `git diff --check`, and checked local Markdown links for new breakage.
- Limitations: maintainer review is pending; application tests were not run for this documentation-only correction.

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## Event build log

## 2026-10-24T22:23:22+00:00 — Reorder bottom tabs

- Changed: bottom tab order is now Play, Map, Ask, Me (was Play, Ask, Map, Me) in `src/components/app/KavalaApp.tsx`.
- Why: requested by the team; Map sits next to Play.
- Validation: `npm run typecheck` passed; no behaviour change besides tab order.
- Limitations: not checked on a real phone.

## 2026-10-25T02:35:29+05:30 — Demo polish for phones

- Changed: games now open full screen (app header and tabs hide while playing) and results scroll into view (`KavalaApp.tsx`, `GameHub.tsx`, `Games.tsx`). Spot keeps its guesses and clock in saved state, so closing and reopening no longer resets the three tries, and past guesses show on the map (`state.ts`, `Games.tsx`). Good Turn and Quest rotate daily from a pool of sample questions and steps; Good Turn now offers 2 or 3 tips and reveals which tip sample neighbours trusted, and writing your own tip earns a Thanks from the asker (`src/lib/app/dailyContent.ts`, `state.ts`). The leaderboard changes by day. Toasts moved to the top so they no longer cover the main button. Best streak replaces the "Rest day a week" stat (`MeView.tsx`). Fonts are bundled through Fontsource instead of Google Fonts (`layout.tsx`, `package.json`). Added a web app manifest and icons for Add to Home screen (`src/app/manifest.ts`, `src/app/icon.svg`, `src/app/apple-icon.png`, `public/icon-192.png`, `public/icon-512.png`). Sharing uses the phone's share sheet when available. Light vibration on wins where supported. Spot reuses a neighbourhood's place list for up to a week when OpenStreetMap can't be reached, and loads the place while the hub is open. Google sign-in is offered only when Supabase's public settings report the Google provider is on (`useGoogleAccount.ts`).
- Fixed: the Kavala Daily number repeated across the 6 AM boundary on the first night (now counted from 24 October 2026); a found Spot guess between 100 and 120 m showed a yellow square (green now matches the 120 m solve radius; `score.ts`, `docs/SPEC.md`); burst words overflowed when the comic font hadn't loaded; the Quest "save for later" text promised a carry-over that didn't exist (now "Skip today"); a skipped Spot shared as a grey square instead of a dash.
- Why: make the demo feel like a finished game on a phone, stop Spot being replayable by closing it, and keep the daily fresh from day to day.
- Validation: `npm test` passed (66 tests in 5 files, including new tests for daily content rotation, best streak, the Good Turn Thanks, the sample leaderboard and the Google provider check); `npm run typecheck` and `npm run build` passed; `npm audit --omit=dev` reported 0 vulnerabilities. Played through the full flow in headless Chromium at 390×844 and 360×640 with a simulated GPS position and a test stand-in for the places API: onboarding, Spot (including close and resume), Good Turn (trusted tip and own tip with Thanks), Quest (check-in and skip), share card, Ask, Map and Me; the Spot error screen; and the engine and debug pages for horizontal overflow (none).
- Limitations: this environment can't reach OpenStreetMap or the Vercel deployment, so map tiles and live Spot places were not checked here; still not tested on a real phone; Good Turn tips, poll shares, Quests, leaderboard scores and counts are labelled sample content.

## 2026-10-25T02:12:30+05:30 — Game experience, original masks, Spot fix

- Changed: `/` now plays like a daily game: a Kerala night splash (`Splash.tsx`), a choice to create a profile with Google or go under a mask (`Onboarding.tsx`), and a games hub (`GameHub.tsx`, `Games.tsx`, `GameKit.tsx`) with Spot, Good Turn and Quest, each with a clock, a comic win burst and a share card. Five original masks (`Mask.tsx`) and Marvel-inspired hero names with Kerala surnames (`state.ts`); sample neighbours renamed to match. Spot now has 3 tries with warmth, distance and compass hints (`score.ts`). Removed the 3D neighbourhood (`Neighbourhood3D.tsx`, `src/lib/geo/scene.ts`, three.js) and the old Today and Join screens. Engine and debug pages moved under a `(site)` route group with their own header; URLs are unchanged.
- Spot fix: places are now fetched by a server route, `/api/places?cell=` (`src/app/api/places/route.ts`, `src/lib/daily/fetchPlaces.ts`), which tries three Overpass servers with timeouts, widens the radius once and caches for a day. If that fails, the browser asks Overpass directly with the neighbourhood centre. Errors now show each server's reason.
- Why: the app should feel like a game, the 3D view didn't help people understand their neighbourhood, and Spot failed when the single Overpass server didn't answer.
- Validation: `npm test` passed (59 tests in 5 files, including new tests for Spot hints, the Overpass fallback and browser requests, and daily completion); `npm run typecheck` and `npm run build` passed; phone-size screenshots of the splash, onboarding, hub and all three games checked locally.
- Limitations: this build environment can't reach Overpass, so a live Spot round was checked only up to the error screen here and needs checking on the deployment; sample neighbours and counts are demo content.

## 2026-10-25T01:43:07+05:30 — 3D neighbourhood, night theme, Google sign-in, Next.js 16

- Changed: added `src/lib/geo/scene.ts` (H3 cells to local 3D geometry) and `src/components/app/Neighbourhood3D.tsx` (three.js scene on Today, Neighbourhood and Join); restyled the app as a friendly neighbourhood at night with comic-panel depth and a web motif (`globals.css`, `layout.tsx` fonts); added optional Google sign-in through Supabase Auth (`src/lib/supabase/browser.ts`, `src/lib/app/useGoogleAccount.ts`, `GoogleButton.tsx`, `linkAccount` in `state.ts`, Join and Me screens); upgraded Next.js 14.2 to 16.4.3 and React 18 to 19.2 (`package.json`, `tsconfig.json`, two type fixes in `KavalaApp.tsx`); README, SPEC and `.env.example` updated.
- Why: a more distinctive, depth-rich interface; a way to create a profile with Google; and Next.js 14 had open security advisories, including critical ones, that are fixed in 16.
- Validation: `npm test` passed (57 tests in 6 files, including new tests for scene geometry and account linking); `npm run typecheck` passed; `npm run build` passed on Next.js 16; `npm audit --omit=dev` reported 0 vulnerabilities; local server returned 200 for all pages, the beacon API refused coordinates and a handshake verified.
- Limitations: Google sign-in is untested end to end here because it needs the Supabase and Google OAuth setup in the README; the profile is kept in the browser and Supabase Auth, not yet in the `users` table; the 3D view was not checked visually in this environment and falls back to a message when WebGL is unavailable.

## 2026-10-25T01:27:59+05:30 — App experience with a sample daily

- Changed: `/` is now the app experience (`src/components/app/`: KavalaApp, JoinView, TodayView, AskView, HoodView, MeView, Mask, SpotMap); the engine overview moved to `/engine`; added `src/lib/app/state.ts` (app state, sample content, streaks, demo timing) and `src/lib/daily/spotPlace.ts` (OpenStreetMap places via Overpass, deterministic daily pick); app styles in `globals.css`; README and SPEC updated.
- What it does: join with real location (hexagon only) or a demo Kochi location, choose a mask; Kavala Daily with Spot on a real nearby OpenStreetMap place, Help on a sample question, Small step with a location-verified check-in; result card with copy and WhatsApp share; Ask with a daily limit and widening to neighbouring areas; Thanks; neighbourhood map; trust ladder with demo verification and reveal controls.
- Why: show the full user experience on the deployed link, built on the tested engine.
- Validation: `npm test` passed (51 tests in 5 files, including new tests for streaks, day rollover, demo timing and Spot place picking); `npm run typecheck` passed; `npm run build` passed; local server returned 200 for `/`, `/engine` and the three debug pages.
- Limitations: sample neighbours, questions and counts are demo content and labelled as such; progress is saved only in the browser; Overpass requests were not exercised from this build environment and depend on the public service; not yet tested on a real phone.

## 2026-10-25T00:31:07+05:30 — Base version: location engine, neighbourhoods, handshake

- Changed: added the Next.js app (`package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.mts`, `.env.example`, `src/`, `scripts/synthetic.ts`), the database schema (`supabase/migrations/0001_init.sql`), the specification (`docs/SPEC.md`) and the project README.
- What it does: on-device location filtering, smoothing and adaptive H3 resolution; a beacon API that refuses raw coordinates; neighbourhood rebalancing (split above 150, pool below 30) and assignment; HMAC-signed handshake codes with 30-second expiry, single use and same-place checks; daily scoring, 6 AM IST day boundary and check-in rule; debug pages for location, neighbourhoods and handshakes with OpenStreetMap maps.
- Why: build the technically deep core first, so later phases add accounts and screens on top of tested logic.
- Validation: `npm test` passed (41 tests in 4 files); `npm run typecheck` passed; `npm run build` passed; local smoke test of `/api/beacon` (valid beacon accepted with stored false; request with lat/lng refused) and of the handshake APIs with a secret set (valid code accepted, replay refused as reused, distant cell refused as too far); all four pages returned 200.
- Limitations: database not connected yet, so nothing is stored; handshake nonces live in memory; handshake page simulates positions; GPS behaviour on real phones not yet tested (needs the HTTPS deployment); daily, Ask and Thanks screens not built.


## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
