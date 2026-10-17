# Deviations

All intentional differences from `reference/marginalia-reference.html` and the
spec. Everything else (fonts, colors, spacing, easing, durations, copy, layout,
behavior) matches the reference exactly.

## Allowed by the spec (`11` §12)

1. **Reduced visitor nav.** Visitors see only **Index** and **Random** (plus the
   wordmark); Write, Journal and Tickets are hidden and `/write`, `/journal`,
   `/tickets` redirect home. The footer `N days journaled` is owner-only.
2. **`/login`.** New unlinked page: a single `megain` email input (placeholder
   `your email`) and a `.steps`-style `Send link` button, messages in the Write
   toast style. No other new UI.
3. **`Not saved` state.** When an autosave request fails, the Write/Journal/
   Tickets save label reads `Not saved` (and retries with backoff) instead of
   silently staying on `saved`.
4. **Real URLs.** Client navigation uses `history.pushState` to `/`, `/index`,
   `/write`, `/journal`, `/tickets`; the reader deep-links to `/n/{id}`. The
   reference's hash-free reload-to-home behavior is replaced.
5. **Accessibility fixes** allowed in `09` (reader `aria-modal` focus handling).
   None change visuals.

## Implementation notes (non-visual)

These are engineering choices forced by the pinned toolchain, not UI changes.

- **Auth fallback for local development.** With no Supabase project configured
  (`NEXT_PUBLIC_SUPABASE_URL` empty) the browser cannot hold a Supabase session,
  so `/login`'s `Send link` calls a server-only route `POST /api/dev-login`,
  which exchanges `AUTH_DEV_SECRET` for the API's HS256 owner token and sets the
  `mg_dev_token` cookie. Owner detection prefers a Supabase session and falls
  back to that cookie. Production uses Supabase Auth (email magic link) and never
  touches this path. `SUPABASE_URL` unset in the API likewise makes `OwnerGuard`
  verify the same HS256 token instead of JWKS/RS256.
- **API tests spawn the compiled server.** NestJS 12 is ESM-only and Jest 30
  cannot load `@nestjs/testing` under Node 22, so `apps/api/test/app.e2e.spec.ts`
  launches `node dist/main.js` on a test port and drives it over HTTP with
  supertest. Coverage is equivalent to in-process supertest.
- **Prisma 7 driver adapter.** The runtime client is constructed with
  `@prisma/adapter-pg`; the datasource URL lives in `apps/api/prisma7.config.ts`
  (Prisma 7 removed `url`/`directUrl` from `schema.prisma`). `prisma generate`
  is run explicitly after migrate because Prisma 7 migrate does not.
- **Packages.** Only the pinned stack is used. The single extra runtime
  dependency is `express` (required by NestJS's HTTP platform), and `dotenv`
  moved to runtime dependencies so the API loads its `.env`.

## Reference-exactness fixes (Tailwind preflight vs. the reference)

The reference is a plain stylesheet; the app runs inside Tailwind v4 preflight.
Preflight changes a few UA defaults, so `styles/globals.css` restores the
reference's computed styles. These are invisible in the source but required for
pixel parity (verified by `e2e/visual.spec.ts`).

- **Fonts use `next/font/local`, not `next/font/google` (`11` §7.2).** Next
  16.4.2 fetches Google Fonts with a pinned
  `...Chrome/104.0.0.0...` user agent, so Google serves *hinted* builds whose
  advances round to whole pixels; the reference browser receives *unhinted*
  builds. At small sizes this wrapped e.g. the home tagline to an extra line.
  The exact latin-subset `.woff2` files the reference downloads are vendored in
  `apps/web/fonts/` and loaded via `next/font/local` (`app/layout.tsx`), keeping
  the same `--font-*` variables. No font files or glyphs differ.
- **`letter-spacing: normal` on form controls.** Preflight sets
  `letter-spacing: inherit` on `button`/`input`/…, leaking the nav's tracking
  into controls; the reference does not. Reset in `@layer base`.
- **`sub`/`sup` UA defaults.** Preflight flattens them (`line-height: 0`,
  `vertical-align: baseline`); the reference keeps `vertical-align: super`/`sub`
  and `line-height: normal`, which sets the line-box height of `.pill` counters
  (e.g. Ticket filters render 34px, not 32px). Reset in `@layer base`.
- **`#wurlrow` is always rendered.** The reference hides it with the `hidden`
  attribute, but its own `.wrow { display: flex }` overrides the UA
  `[hidden]` rule, so the URL row is always visible there. Preflight's
  `[hidden] { display: none !important }` would hide it in the app, so the app
  never sets `hidden`, reproducing the reference's rendered result.
- **Segmented-control knob re-measures on view entry.** Views stay mounted and
  toggle `.on`, so the active kind's width is `0` while hidden; the reference
  re-runs `placeKnob(true)` on every write render. `WriteView` re-measures when
  `cur` becomes `write` (`useLayoutEffect([cur])`).
