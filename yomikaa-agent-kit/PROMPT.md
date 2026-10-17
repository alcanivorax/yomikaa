You are building "Yomikaa", a personal archive website, as a production app that is an exact visual and behavioral replica of an existing reference build. The result must be indistinguishable from the reference: same fonts, colors, spacing, animations, timings, behavior and responsive layout.

Everything you need is in the folder `yomikaa-agent-kit/`:
- `reference/yomikaa-reference.html` is a complete working single-file build (it stores data in localStorage). It is the source of truth for everything the user sees and does. If any page and the reference disagree on a value, the reference wins.
- `00-READ-ME-FIRST.md` is the master brief, module map and build order. Read it fully first.
- `01` to `10` are one page per area: design system, shell and motion, home, index, reader, write, journal (timed entries), data and storage, responsive/a11y/QA, tickets.
- `11-stack-and-backend.md` defines the production stack, repository layout, Prisma schema, API contract, authentication, Tailwind rules, env vars, testing and deployment. It overrides any statement in the other pages about localStorage, a verbatim stylesheet or hash routing.

Stack (all TypeScript, pnpm workspace): Next.js (App Router) frontend, NestJS backend, Prisma ORM, Supabase (Postgres and Auth) as the database, Tailwind CSS for styling, Zod for shared validation, TanStack Query on the client. Use the latest stable versions and pin them. Do not add other libraries (no component kits, no animation libraries).

Rules:
1. Match the reference exactly. Do not redesign, "improve" or add features. The only allowed deviations are listed in `11` section 12; log every deviation in `DEVIATIONS.md`.
2. Light theme only, three fonts only, one accent (#ff4a1c), breakpoints only at 900px and 600px. Declare the design tokens in Tailwind's `@theme` with the exact values from `01`; use utilities and arbitrary values for exact numbers, never Tailwind's default scale or palette. Keep the reference class names for the few patterns utilities cannot express (grain, blend-mode top bar, curtain, cursor, hero keyframes, marquee, parent-hover dimming, reader clip-path).
3. Keep the imperative parts imperative (list FLIP animation, reader clip-path, curtain, cursor loop, textarea auto-grow): refs and direct DOM or Web Animations calls, not React state. Keep ids, roles, aria attributes and data-* hooks from the pages.
4. Only the API touches the database. Never expose the database URL or a service role key to the browser. Enable row level security with no policies on every table. Journal, tickets and drafts are owner-only and must never be returned to visitors.
5. Autosave keeps the reference debounces (Write draft 700ms, Journal 600ms, Tickets 500ms), one request in flight per resource, "Saved" on success, "Not saved" with retry on failure.

Process: follow the build order in `00` section 5 (scaffold, shell and curtain, Home, backend and data layer, Index, Reader, Write, Journal, Tickets, responsive/a11y, visual diff). After each step run its checkpoint and commit.

Verification (required): run the full stack against a seeded database; use Playwright to screenshot every view and state at the sizes in `09` (360x740 up to 1920x1080) with reducedMotion "reduce" and diff them against the reference; measure animation timings with performance.now() against the tables (curtain 560/140/680ms, reader 900/700ms, FLIP 700/800ms, count tween 600ms); compare computed styles on key elements; check the five-item nav fits at 360px; run the shared, API and end-to-end tests described in `11` section 10.

Done when every item in the acceptance checklist in `09` section 7 passes (including the backend and data items), lint, type checks and tests pass, and a fresh clone works with `pnpm install`, the `.env` files filled from `.env.example`, `pnpm db:migrate`, `pnpm db:seed` and `pnpm dev`. Finish with a short report: what you built, DEVIATIONS.md contents, and any checklist item you could not verify.
