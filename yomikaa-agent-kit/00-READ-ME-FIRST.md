# Yomikaa: build kit for a coding agent

You are going to build **Yomikaa**, a personal archive website, from scratch so that the result is **indistinguishable from the reference build**. This kit has one page per section of the site. This page is the master brief and the process guide. Read it fully before opening any other page.

## 1. What you are building (30-second version)

A single-page site with five views and one overlay:

| View | Purpose | Spec page |
|---|---|---|
| Home | Giant animated headline, search line, shelf marquee, recent notes, random-page band | `03-home.md` |
| Index | Full archive: search, kind and shelf filters, sorting, animated list | `04-index.md` |
| Reader (overlay) | A note, opened as a full-page reading sheet that expands from the click point | `05-note-reader.md` |
| Write | Create and edit notes, with autosave and a floating action dock | `06-write.md` |
| Journal | One page per day, split into Life (light half) and Work (dark half); each half is a list of timed entries (from, to, text); month browser | `07-journal.md` |
| Tickets | A log of tickets worked on, each with a status, notes and date; status filter | `10-tickets.md` |

Shared foundations: `01-design-system.md` (every token and text style), `02-shell-and-motion.md` (top bar, page curtain, cursor, scroll reveals, keyboard), `08-data-and-storage.md` (data shapes, sample content, storage keys, production plan), `09-responsive-a11y-qa.md` (breakpoints, accessibility, test matrix, acceptance checklist). `11-stack-and-backend.md` (the production stack: monorepo, Prisma schema, NestJS API, Supabase auth, Tailwind rules, deployment; read it right after this page). `10-tickets.md` is numbered last because it was added after the first release; build it right after the Journal.

The aesthetic in one line: **an editorial magazine that happens to be your archive**. Warm bone paper, near-black ink, one vermilion accent, huge serif type, mono labels, slow expo-out motion.

## 2. The ground truth

`reference/yomikaa-reference.html` is a complete, working, single-file build of the exact site. It is the **source of truth**. Where any page in this kit and the reference disagree on a value, **the reference wins**. Open it in a browser first and use every feature for ten minutes before you write code: type in the search, open a note, write and file a note, write a journal entry, resize the window.

Your job is to reproduce it, not to improve it. Do not change fonts, colors, spacing, easing, durations, copy, or placement. If you believe something is a bug, record it in `DEVIATIONS.md` and keep the reference behavior unless the owner tells you otherwise. The reference's known quirks are listed in `09-responsive-a11y-qa.md` section 6.

## 3. Rules of engagement

1. **Fidelity over taste.** Match first. Taste never.
2. **Light theme only.** No dark mode, no theme toggle. (The dark Work half of the Journal and the black curtain are part of the design, not a theme.)
3. **Three typefaces, fixed roles.** Instrument Serif (display), Newsreader (reading text), DM Mono (labels). Nothing else.
4. **One accent.** Vermilion `#ff4a1c`. It is used for: the headline period, hover states, the selected-sort dot, today's calendar ring, filled journal dots, the reading progress line, margin notes, the caret, text selection, and the random band flood. Never for large backgrounds except the random band flood and the Write dock's primary button.
5. **No extra libraries for visuals.** Tailwind CSS is the styling method (`11`). No animation library, no component kit (no shadcn, Radix, Headless UI), no smooth-scroll library. Motion uses CSS transitions, CSS keyframes, the Web Animations API (`element.animate`), `IntersectionObserver` and one `requestAnimationFrame` loop.
6. **Every animation has a reduced-motion path** (see `02-shell-and-motion.md`).
7. **No dark patterns, no analytics, no external requests** except Google Fonts, your own API and Supabase.
8. **Do not add features.** Not listed in this kit means not built. Ideas go in `IDEAS.md`.

## 4. Recommended stack and architecture

The owner's stack is **Next.js (App Router) for the frontend, NestJS for the backend, Prisma as the ORM, Supabase (Postgres and Auth) as the database, Tailwind CSS for styling**, all TypeScript, in a pnpm workspace. **`11-stack-and-backend.md` is the authority for architecture, database schema, API, authentication, Tailwind rules and deployment.** It overrides any statement in this kit about localStorage, a verbatim stylesheet, or hash routing. What the user sees must still match the reference exactly.

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS + Prisma), `packages/shared` (Zod schemas and pure helpers used by both).
- `apps/web/app/layout.tsx`: fonts via `next/font/google` (Instrument Serif regular and italic; Newsreader variable with optical size, weights 300 to 500, normal and italic; DM Mono 400 and 500), Tailwind stylesheet with the design tokens, and the persistent shell (grain, curtain, cursor, peek card, top bar).
- Views are client components. Implement a **view state machine** in the shell (`home | search | write | journal | tickets`) plus the reader overlay state, mirrored in real URL paths as described in `11` section 5. Navigation must run the same curtain as in the reference.
- Styling is Tailwind with the exact tokens from `01`; patterns that utilities cannot express (grain, blend-mode top bar, curtain, cursor, hero keyframes, marquee, parent-hover dimming, reader clip-path) live in a small components layer using the reference class names. See `11` section 7. Visual output must be pixel-identical to the reference.
- Logic lives in `packages/shared` (pure, unit-tested: `slug`, `matchQ`, excerpt, date helpers, journal time math, ticket rules) and in the NestJS modules (notes, tags, journal, tickets, draft, stats). The web app talks to the API through a typed client and TanStack Query.
- Hooks: `useCursor`, `useReveal`, `useCurtainRouter`, `useAutosave`.
- Persistence is the database through the API (`11`, `08`). `localStorage` is not used for data.

The reference is a single static HTML file that keeps everything in `localStorage`; it exists only as the visual and behavioral specification.

### Reference function to module map

| Reference (in `<script>`) | Module or component |
|---|---|
| `store`, `D`, `SEED`, `X`, `J` (data and persistence) | NestJS modules and Prisma (`apps/api`), `lib/api.ts` and TanStack Query (`apps/web`); `SEED`/`X` become `prisma/seed.ts` |
| `key`, `today`, `fmt`, `pad2`, `slug`, `allTags`, `matchQ`, `match`, `toMin`, `spanMin`, `fmtDur`, `used` | `packages/shared` |
| `io`, `revealAll` | `useReveal` |
| `buildHero`, `playHero`, `buildHome` | `Home.tsx` |
| `swap`, `go`, `LABEL`, `busy`, `cur` | `useCurtainRouter` and `Shell.tsx` |
| cursor, peek, orb loop (inside `if(FX)`) | `useCursor`, `PeekCard.tsx`, `Orb.tsx` |
| `nodes`, `addNode`, `filters`, `render`, `tween`, `hl` | `Index.tsx` |
| `fillReader`, `openNote`, `closeNote`, `closeInstant`, `rOrigin`, `radius` | `Reader.tsx` |
| `W`, `fillWrite`, `drawChips`, `placeKnob`, `draftSave`, `draftNote`, `fileIt`, `editNote`, `msg`, `flash`, `grow` | `Write.tsx` |
| `jd`, `jm`, `jOpen`, `renderBrowse`, `renderJournal`, `stepDay`, `stepMonth`, `pickDay`, `E`, `PART`, `toMin`, `spanMin`, `fmtDur`, `sortPart`, `loadDay`, `drawPart`, `addEntry`, `saveDay` | `Journal.tsx`, `journal.ts` |
| `TS`, `T`, `tf`, `normT`, `usedT`, `drawTFil`, `drawTList`, `renderTickets`, `addTicket`, `saveT` | `Tickets.tsx`, `tickets.ts` |
| the single `document` click and keydown listeners | `useGlobalShortcuts` and per-component handlers |

A faithful port keeps the **imperative parts imperative**: the result-list FLIP animation, the reader clip-path animation, the curtain, the cursor loop and the textarea auto-grow should use refs and direct DOM or Web Animations calls, not React state, or the motion will not match.

## 5. Process

Work in this order. After every numbered step, run the **checkpoint** before moving on. Commit after each step.

1. **Scaffold** the project, fonts, global CSS shell, grain, vignette, SVG-free (no SVG filters are used in this build).
   - Checkpoint: blank bone-colored page with grain; fonts load; no layout shift.
2. **Top bar, nav, view switching, curtain** (`02`).
   - Checkpoint: clicking nav items runs the curtain exactly: cover 560ms, swap, 140ms hold, uncover 680ms.
3. **Home** (`03`): hero letters, finder with live match count, marquee, recent rows, peek card, random band, footer.
   - Checkpoint: side-by-side with the reference at 1440x900; letter-rise timing identical.
4. **Backend and data layer** (`11`, `08`): pnpm workspace, `packages/shared` with unit tests (see `09` section 5), Prisma schema, migration and seed (the 12 samples), NestJS modules with the owner guard, typed web client, autosave hook.
   - Checkpoint: `pnpm db:migrate && pnpm db:seed` works on a fresh database; `GET /api/v1/notes` returns the 12 samples; owner routes return 401 without a token; API tests pass.
5. **Index** (`04`): count numeral, rail, sort, list, matching, FLIP.
   - Checkpoint: type "design", toggle chips, sort; rows glide, count tweens.
6. **Reader** (`05`): overlay, clip-path expansion, side column, prev/next, progress.
   - Checkpoint: opens from the click point; closes back to the close button.
7. **Write** (`06`): fields, segmented knob, chips, autosave, dock, file, preview, edit.
   - Checkpoint: file a note, see it in Home, Index and the Reader; reload keeps it.
8. **Journal** (`07`): header, steps, split halves, timed entries, autosave, month browser.
   - Checkpoint: add two timed entries to Work (the second should start where the first ended), see the duration and total, reload, find the day by month chip, calendar and list.
9. **Tickets** (`10`): header, status filter, editable rows, autosave, two-step remove.
   - Checkpoint: add a ticket, change its status, filter by it, reload, remove it.
10. **Responsive, accessibility, QA** (`09`): all breakpoints, keyboard, reduced motion, the full test matrix and acceptance checklist.
11. **Visual diff pass**: screenshot every view and state at every matrix size from both builds and diff them. Fix until differences are only anti-aliasing noise.

### How to verify (do not skip)

- Serve both builds locally. Use Playwright (or similar) to capture screenshots at the sizes in `09`. Use `reducedMotion: "reduce"` for static state comparisons and normal motion for timing checks.
- For animation timing, record `performance.now()` deltas around `animationstart` and `animationend`/`finished` events and compare with the tables in each page.
- Check computed styles on key elements against the numbers in each page: `getComputedStyle(el).fontSize`, `fontFamily`, `letterSpacing`, `lineHeight`, `color`, `padding`.
- Keep a `DEVIATIONS.md` listing every intentional difference (should be empty or tiny).

## 6. Definition of done

All items in the acceptance checklist in `09-responsive-a11y-qa.md` section 7 pass, `DEVIATIONS.md` is empty or justified, lint and type checks pass, and a fresh clone runs with `pnpm install`, the `.env` files filled from `.env.example`, `pnpm db:migrate`, `pnpm db:seed` and `pnpm dev`.

## 7. First message to paste into the coding agent

> Use `PROMPT.md` in this kit as the first message for the coding agent.
