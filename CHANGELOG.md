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
