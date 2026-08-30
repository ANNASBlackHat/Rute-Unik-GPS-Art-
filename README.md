# Rute Unik

A directory of GPS-art running routes — routes whose GPX trace forms a shape (a cat, a dog, a unicorn, etc.) — browsable by city, with community uploads, an admin review flow, and a live run-tracking mode.

## Tech Stack

- **Next.js 16** (App Router, TypeScript) — frontend & API routes
- **React 19**
- **Tailwind CSS 4** — styling
- **MapLibre GL JS** — interactive maps (tiles from OpenFreeMap, no API key)
- **Supabase** — auth (`@supabase/ssr`, `@supabase/supabase-js`) and Postgres hosting
- **PostgreSQL 16 + PostGIS 3.4** — spatial storage & queries (via `docker-compose.yml` locally)
- **next-intl** — i18n (English & Bahasa Indonesia)
- **ESLint 9 + Prettier** — linting/formatting

## Project Structure

```
.
├── messages/            # i18n translation files (en.json, id.json)
├── examples/            # Sample GPX route files (e.g. kucing-ugm.gpx)
├── scripts/             # Utility/test scripts run with tsx (db setup, benchmarks, checks)
├── src/
│   ├── app/             # Next.js App Router: [locale] pages, API routes
│   ├── components/      # UI components (map, run tracker, upload, admin, etc.)
│   ├── i18n/            # next-intl configuration
│   ├── lib/             # Core logic: GPX parsing, geo math, SVG thumbnails, Supabase clients
│   └── middleware.ts    # Locale detection/routing middleware
├── supabase/            # SQL migrations and seed data
└── .specs/              # Design docs: tech spec, user stories, task list
```

## Prerequisites

- **Node.js** 20+ (dev dependencies target `@types/node` ^20)
- **npm** (a `package-lock.json` is committed)
- **Docker** — to run the local PostGIS database via `docker-compose.yml`

## Setup / Installation

```bash
npm install
cp .env.example .env.local   # then fill in the values
docker compose up -d         # start local PostGIS on port 54322
npm run db:test              # apply migrations + seed data to the local database
```

## Environment Variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (local default: `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `DATABASE_URL` | Direct Postgres/PostGIS connection string (local default: `postgresql://postgres:postgres@localhost:54322/postgres`) |

## Running the Project

```bash
npm run dev        # start the dev server (http://localhost:3000)
npm run build      # production build
npm run start      # start the production server
npm run lint       # run ESLint
npm run format     # format with Prettier
```

## Scripts & Checks

There is no unit test framework (e.g. Jest/Vitest) configured; verification is done via `tsx` utility scripts:

```bash
npm run db:test                          # connect to DB, apply migrations, run seed
npx tsx scripts/check-i18n.ts            # verify en/id translation key parity
npx tsx scripts/test-gpx-svg.ts          # exercise GPX parsing / SVG thumbnail logic
npx tsx scripts/benchmark-spatial.ts     # EXPLAIN ANALYZE key spatial queries
```

## Deployment

<!-- TODO: no CI/CD config (.github/workflows, .gitlab-ci.yml) or deployment config exists in the repo. Deployment target is not verifiable — the scaffolding README mentions Vercel, but nothing is set up. -->
Not configured in this repository.
