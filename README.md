# Yomikaa

A quiet place to write, journal, and keep your notes — fast, minimal, and yours.

<!-- screenshot: hero -->
![Yomikaa](docs/screenshots/hero.png)

## Overview

Yomikaa is a small personal workspace with a handful of views:

- **Write** — a calm editor that autosaves as you go
- **Journal** — one entry a day, no friction
- **Index** — every note, one clean list
- **Tickets** — loose ends and someday-maybes
- **Reader** — a distraction-free reading view

<!-- screenshot: write / reader / index -->
![Write view](docs/screenshots/write.png)
![Reader view](docs/screenshots/reader.png)
![Index view](docs/screenshots/index.png)

## Getting started

```bash
pnpm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Fill in the values you need (local defaults work out of the box), then:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000 — you're in.

## Authentication

Yomikaa is a private, single-owner app. Sign-in uses **Supabase Auth**
(email + password). The browser never talks to Supabase directly — the Next.js
app is a thin backend-for-frontend that stores the session in httpOnly cookies
and forwards API calls same-origin, while the NestJS API verifies access tokens
locally. To enable owner sign-in:

1. Create a Supabase project and add an owner user (Auth → Users).
2. In `apps/api/.env`, set:
   - `SUPABASE_URL` — the project URL (Settings → API).
   - `SUPABASE_ANON_KEY` — the public anon / publishable key (Settings → API).
   - `SUPABASE_JWT_SECRET` — the project JWT secret (Settings → API), used to
     verify HS256 access tokens. (RS256 projects are verified against the JWKS
     at `$SUPABASE_URL/auth/v1/.well-known/jwks.json` instead.)
   - `SUPABASE_OWNER_USER_ID` — the owner's Supabase Auth user uuid (the only
     subject granted owner access).
   - `OWNER_USER_ID` — the data-scoping id written to rows. For an existing
     deployment keep the id already in your database; for a fresh install set
     it equal to `SUPABASE_OWNER_USER_ID`.

No service-role key is required (or used) anywhere.

## Scripts

| Command          | What it does              |
| ---------------- | ------------------------- |
| `pnpm dev`       | run web + api in watch    |
| `pnpm build`     | build everything          |
| `pnpm test`      | run unit tests            |
| `pnpm lint`      | lint all packages         |
| `pnpm typecheck` | typecheck all packages    |

## Stack

Next.js · NestJS · Prisma · PostgreSQL · Tailwind — a pnpm monorepo with
`apps/web`, `apps/api`, and `packages/shared`.

<!-- screenshot: dark mode / mobile, if you have one -->
![Mobile](docs/screenshots/mobile.png)

## License

MIT
