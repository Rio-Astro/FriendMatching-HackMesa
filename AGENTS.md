# AGENTS.md

## Project Overview

- This repo is a Next.js 16 app for the HackMESA college and friend matching prototype.
- The main user-facing app is served from `/`.
- The UI is a single client-side Mesa experience implemented in `HACKMESA/src/` and mounted by `app/page.jsx`.
- College matching now runs against a Neon Postgres database through `app/api/match/route.ts` and `lib/neon.ts`.
- `app/colleges.json` is no longer the live source for matching requests; it is the seed source used to populate Neon.
- Clerk is wired in for authentication, but saved schools and quiz persistence are not wired to the database yet.

## Important Structure

- `app/page.jsx`: Next.js page entry that renders the Mesa app.
- `app/layout.jsx`: root layout, fonts, and `ClerkProvider`.
- `app/globals.css`: global styling for the Mesa UI.
- `app/api/match/route.ts`: deterministic matching route backed by Neon.
- `proxy.ts`: Clerk middleware for the app.
- `lib/neon.ts`: shared Neon query helper for school reads.
- `app/colleges.json`: canonical local seed dataset for schools and image URLs.
- `scripts/init-neon-schema.mjs`: creates the initial Neon schema.
- `scripts/seed-schools.mjs`: upserts schools and tags from `app/colleges.json` into Neon.
- `HACKMESA/src/app.jsx`: top-level client app state and screen routing.
- `HACKMESA/src/auth.jsx`: current auth screen that launches Clerk sign-in/sign-up and still supports demo mode.
- `HACKMESA/src/results.jsx`: fetches `/api/match` results and renders school cards.
- `HACKMESA/src/selection.jsx`: renders the narrowed school selection cards.
- `HACKMESA/src/shared.jsx`: shared UI primitives, including `SchoolImage` placeholder fallback behavior.
- `HACKMESA/src/data.js`: fallback/static quiz, friend, and post data. Friend matching is still static.

## Run Commands

- Install deps: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`
- Production start: `npm run start`
- Initialize Neon schema: `npm run db:init`
- Seed or reseed schools into Neon: `npm run db:seed`

## Environment Variables

- `DATABASE_URL`: Neon Postgres connection string. Required for Neon-backed matching and DB scripts.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: required for Clerk in both local and deployed environments.
- `CLERK_SECRET_KEY`: required for Clerk server-side auth.
- Optional future key: `COLLEGE_SCORECARD_API_KEY`.

## Deployment Notes

- The repo is deployed on Vercel.
- Pushing to `main` should create a production deployment when the repo is connected to Vercel.
- Preview deployments are optional right now; production and development envs are the important ones currently configured.
- `friend-matching-hack-mesa.vercel.app` is the production deployment alias.
- `.vercelignore` exists so local `.env*`, `.vercel`, `.neon`, `node_modules`, and `.next` do not get uploaded during CLI deploys.

## Data Flow Notes

- `/api/match` reads active schools from Neon, not from the filesystem.
- `app/colleges.json` is the editable school source of truth in the repo.
- After changing school records in `app/colleges.json`, rerun `npm run db:seed` or Neon will still serve stale data.
- After changing the DB schema in `scripts/init-neon-schema.mjs`, rerun `npm run db:init`.
- The current seeded catalog size is 251 schools.

## Auth Notes

- Clerk is installed and the app is wrapped in `ClerkProvider`.
- `proxy.ts` uses `clerkMiddleware()`.
- The auth screen keeps demo mode available even with Clerk enabled.
- Real auth works today, but `saved_schools`, `user_profiles`, and `quiz_results` tables are not yet connected to client actions.

## Friend Matching Notes

- Friend matching in the UI is still static right now and reads from `FRIENDS` in `HACKMESA/src/data.js`.
- Planned launch direction is a hybrid feed: real signed-up users first, with clearly labeled `Demo` or `AI` profiles backfilling only when there are too few real matches.
- Demo/AI profiles should be pre-generated and stored ahead of time, not generated live during showcase requests.
- Launch target for the demo/AI profile pool is `30 to 50`, starting at the low end unless more variety is needed.
- Planned launch safety controls are `hide`, `block`, and `report`.
- Current launch direction for messaging is basic async messaging only after mutual interest, not realtime chat.
- Profile photos should default to avatars at launch; if uploads are added later, keep it to one profile photo per user.
- If Clerk provides a real user profile image, prefer reusing that URL before adding custom upload storage.

## Matching Notes

- Matching must stay deterministic for the same answer set.
- Do not add random score jitter back into `app/api/match/route.ts` unless explicitly asked.
- If changing quiz questions or answer keys, update the matcher logic in `app/api/match/route.ts` to stay in sync.
- If changing the school shape returned by `lib/neon.ts`, update the screens that render college cards.

## Image Notes

- School image URLs are stored in Neon as URL refs, not as uploaded binaries.
- The app currently uses external image URLs seeded from `app/colleges.json`.
- `SchoolImage` in `HACKMESA/src/shared.jsx` falls back to a placeholder when an image URL is missing or fails to load.
- Several brittle hotlinked image sources were replaced with more stable URLs, but image quality/control is still not perfect.
- If image reliability becomes important, prefer moving curated school images into Vercel Blob or another controlled storage layer.

## Working Conventions

- Keep changes minimal and local to the feature being touched.
- Prefer preserving the current Mesa UX over redesigning screens unless explicitly requested.
- Keep the app as a normal Next.js app. Do not reintroduce raw HTML entry files, browser Babel, or CDN-loaded React.
- Prefer passing state through React props/state over mutating globals on `window`.
- The `Results` screen can replace the active college list with API results; downstream screens should consume that state rather than hardcoded globals.
- Friend matching is still static for now and intentionally uses `FRIENDS` from `HACKMESA/src/data.js`.

## Files To Treat Carefully

- `package.json` / `package-lock.json`: only change when dependencies actually need to change.
- `next-env.d.ts`: generated by Next.js; avoid manual edits unless necessary.
- `app/colleges.json`: seed source for the live school catalog; reseed Neon after editing.
- `scripts/init-neon-schema.mjs`: schema source for the Neon database.
- `.env` / `.env.local`: local secrets, never commit.
- `.next/`, `node_modules/`, `.vercel/`, and `.neon/`: generated/local only, never commit.
- `prototype-plan.md` and files under `skills/`: local helper docs, intentionally ignored from Git.

## Merge Guidance

- This repo has had parallel work on the same Mesa files. Before large edits, check for overlapping changes in:
  - `HACKMESA/src/app.jsx`
  - `HACKMESA/src/results.jsx`
  - `HACKMESA/src/quiz.jsx`
  - `HACKMESA/src/selection.jsx`
  - `HACKMESA/src/auth.jsx`
  - `HACKMESA/src/shared.jsx`
  - `app/api/match/route.ts`
  - `app/colleges.json`
- After resolving conflicts or making non-trivial UI, auth, or data flow changes, run `npm run build`.
- After changing `app/colleges.json`, reseed Neon before considering the change complete.

## Good Agent Behavior Here

- Read the current component flow before refactoring.
- Verify imports/exports when editing files under `HACKMESA/src/`.
- Keep the root route working.
- Prefer fixing product regressions over adding more infrastructure.
- Check Vercel logs when production errors appear; the CLI is installed and authenticated here.
- Do not assume `app/colleges.json` changes affect production until `npm run db:seed` has been run.
