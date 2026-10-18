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
