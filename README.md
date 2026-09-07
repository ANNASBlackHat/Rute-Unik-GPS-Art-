# Rute Unik

> **GPS-Art Running Routes Directory & Live Navigation App (Web & Mobile)**  
> Discover, share, and run GPS-art routes — running tracks whose GPX trace forms recognizable shapes, animals, symbols, and typography.

---

## Overview

**Rute Unik** is a complete dual-client platform (Next.js 16 Web Application + Expo React Native Mobile App) that allows runners to explore curated GPS-art routes by city, upload their own GPX creations, and run them with turn-by-turn guidance and shape-tracking.

- **Web Platform**: Explore routes on an interactive MapLibre map, view elevation profiles, upload GPX files with automated similarity & anti-duplication detection, manage administrative reviews, and download Android APKs.
- **Mobile App (Android/iOS)**: Native running experience built with Expo SDK 52, featuring background GPS tracking (screen-off in pocket), turn-by-turn Indonesian voice cues, automatic music audio ducking, live shape progression tracking, and dual Paper / AMOLED themes.

---

## Tech Stack

### Web Application (`apps/web`)
- **Next.js 16** (App Router, React 19, TypeScript)
- **Tailwind CSS 4** — bespoke editorial cartography design tokens (`.specs/style-guide.md`)
- **MapLibre GL JS** — interactive vector maps powered by OpenFreeMap (no proprietary API keys required)
- **next-intl** — full internationalization support (Bahasa Indonesia & English)
- **Supabase SSR** (`@supabase/ssr`, `@supabase/supabase-js`) — authentication and database access

### Mobile Application (`apps/mobile`)
- **Expo SDK 52** & **React Native 0.76**
- **Expo Router 4** — file-based native routing
- **Expo Location & TaskManager** — persistent foreground & background GPS tracking
- **Expo Speech** — real-time turn-by-turn voice prompts in Indonesian
- **Native Audio Focus & Ducking** — automatically lowers background music (Spotify, YouTube Music, podcasts) during navigation cues
- **React Native SVG** — live vector shape renderer and dynamic directional turn arrows

### Shared Core (`packages/shared`)
- Pure TypeScript spatial mathematics and geometry processing
- GPX parsing & metadata extraction
- **Fréchet Distance & Discrete Hausdorff Distance** algorithms for shape similarity and anti-duplication
- **Douglas-Peucker Simplification** & bounding-box normalization
- Turn-cue heading calculations & automatic shape categorization

### Backend & Infrastructure
- **PostgreSQL 16 + PostGIS 3.4** — spatial storage, indexing, and GIS queries
- **Supabase** — authentication, row-level security (RLS), and database hosting
- **Turborepo** — fast monorepo builds and task orchestration

---

## Project Structure

```
.
├── apps/
│   ├── web/                    # Next.js 16 web application
│   │   ├── messages/           # i18n translation dictionaries (en.json, id.json)
│   │   ├── public/             # Static assets, logomark SVG, maplibre bundles
│   │   └── src/                # Pages, route directory, GPX upload, admin review, run view
│   └── mobile/                 # Expo React Native mobile application
│       ├── app/                # Expo Router screens (tabs, route details, run mode)
│       ├── assets/             # Brand icons (1024x1024), adaptive icon, splash screen
│       ├── components/         # Native UI, theme toggles, live shape tracker, turn arrows
│       ├── services/           # Background location, audio ducking, speech, runner engine
│       └── test/               # Mobile integration & theme conformance test suites
├── packages/
│   └── shared/                 # Shared spatial algorithms, types, and GPX parser
│       ├── src/                # Pure spatial math & navigation helpers
│       └── test/               # Shared spatial algorithm unit tests
├── examples/                   # Sample GPX routes (e.g. kucing-ugm.gpx)
├── scripts/                    # Utility scripts (db setup, i18n checks, spatial benchmarks)
├── supabase/                   # SQL migrations (PostGIS schema, tables, RLS policies)
└── .specs/                     # Design documentation, style guide & technical specifications
```

---

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** — for running the local PostGIS database via Docker Compose
- **Expo Go** or an Android/iOS emulator/device (for mobile app development)

---

## Setup & Installation

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/ANNASBlackHat/Rute-Unik-GPS-Art-.git
   cd Rute-Unik-GPS-Art-
   npm install
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` to match your local or remote Supabase credentials.

3. **Start the Local PostGIS Database:**
   ```bash
   docker compose up -d
   ```
   This boots PostgreSQL 16 + PostGIS 3.4 on `localhost:54322`.

4. **Initialize Database Schema & Seeds:**
   ```bash
   npm run db:test
   ```

---

## Environment Variables

| Variable | Required | Description | Default / Example |
| --- | :---: | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL | `http://127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase Anonymous Key | `your-anon-key-here` |
| `DATABASE_URL` | Yes | Direct PostgreSQL connection string | `postgresql://postgres:postgres@localhost:54322/postgres` |
| `DATABASE_POOLER_URL` | Optional | Supabase Connection Pooler (for serverless Vercel) | `postgresql://postgres.<ref>:<pass>@...pooler.supabase.com:5432/postgres` |
| `NEXT_PUBLIC_SITE_URL` | Optional | Production canonical URL | `https://rute-unik.annasblackhat.my.id` |
| `NEXT_PUBLIC_APK_DOWNLOAD_URL` | Optional | Android APK download link (EAS build artifact) | `https://expo.dev/artifacts/eas/rute-unik-latest.apk` |

---

## Development

### Run Web Application
```bash
npm run dev
# Web app accessible at http://localhost:3000
```

### Run Mobile Application
```bash
cd apps/mobile
npm run start
# Or launch directly on Android:
npm run android
# Or launch directly on iOS:
npm run ios
```

### Type Checking
```bash
# Typecheck web
cd apps/web && npx tsc --noEmit

# Typecheck mobile
cd apps/mobile && npm run typecheck

# Typecheck shared package
cd packages/shared && npm run typecheck
```

---

## Testing & Verification

The repository uses Node's native test runner (`node:test`) orchestrated via Turborepo:

```bash
# Run all test suites across the monorepo
npm test
```

### Utility Scripts
```bash
npm run db:test                          # Apply migrations and seed data to local DB
npx tsx scripts/check-i18n.ts            # Verify parity between en.json and id.json
npx tsx scripts/test-gpx-svg.ts          # Verify GPX parsing and SVG thumbnail rendering
npx tsx scripts/benchmark-spatial.ts     # Run EXPLAIN ANALYZE benchmarks on spatial queries
node scripts/generate-brand-assets.js    # Re-generate brand icons, adaptive icons, and splash
```

---

## Key Features & Highlights

### 🎨 Brand Identity & Style Guide
- **Logomark**: Continuous GPS Track "R" with trail-marker container, topographic contour backings, and start/finish beacons.
- **Design Tokens**: Strict adherence to `.specs/style-guide.md` palette:
  - **Paper** (`#EDE8DC`) & **Chalk** (`#F7F5EF`) for canvas and cards
  - **Deep Ink** (`#1F2A1E`) for text, borders, and dark elements
  - **Trail Orange** (`#E8562C`) for routes, badges, and accents
  - **Moss** (`#5C6E4F`) & **Contour Tan** (`#C9BFA6`) for hairline elevation curves and secondary indicators
  - **Dark / AMOLED Theme** (`#0A0D0A` / `#161C15`) on mobile for high-contrast sunlight visibility and battery savings.

### 🏃‍♂️ Turn-by-Turn Navigation Engine
- Computes turn headings (`LEFT`, `RIGHT`, `SLIGHT_LEFT`, `SLIGHT_RIGHT`, `STRAIGHT`, `UTURN`).
- Proximity-based triggers with audio voice cues in Indonesian (e.g., *"Belok kanan dalam 20 meter ke Jalan Kaliurang"*).
- Continuous off-route warning detection with instant vibration and chime if straying from the GPS art contour.
- Audio focus ducking ensures running music smoothly dips when turn instructions are vocalized.

### 📱 Android APK Distribution
- Single source of truth in `apps/web/src/config/appDownload.ts`.
- Non-intrusive home banner and run-mode pre-check modal advising users on mobile background tracking benefits with step-by-step manual APK installation guidance.

---

## Deployment

### Web Deployment (Vercel)
1. Import the repository in **Vercel**.
2. Set **Root Directory** to `apps/web`.
3. Check **"Include files outside the root directory in the Build Step"** (to allow access to `packages/shared`).
4. Set environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` / `DATABASE_POOLER_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APK_DOWNLOAD_URL`).

### Mobile App Build (Expo EAS)
```bash
cd apps/mobile
# Install EAS CLI if not already installed
npm install -g eas-cli

# Build Android standalone APK
eas build -p android --profile preview
```

---

## License

Private / Proprietary — All rights reserved.

