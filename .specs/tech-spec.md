# Tech Spec — Rute Unik

Status: draft, pre-build
Related docs: `user-stories.md`

## 1. Overview

Rute Unik is a directory of GPS-art running routes (routes whose GPX trace forms a shape — a cat, a unicorn, etc.), browsable by city, with community uploads reviewed against an official catalog. See `user-stories.md` for the phased feature scope this spec implements.

## 2. Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│  Next.js     │◄────►│  API layer   │◄────►│  Supabase Postgres │
│  (frontend)  │      │  (Go/FastAPI)│      │  + PostGIS         │
└─────────────┘      └──────────────┘      └────────────────────┘
      │
      ▼
┌─────────────┐
│  MapLibre GL │  ← tiles from tiles.openfreemap.org (no API key)
│  JS          │
└─────────────┘
```

No object storage in MVP — GPX files and generated thumbnails are stored as columns in Postgres (see §4). Revisit only if DB size or backup time becomes a real bottleneck.

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js / TypeScript | matches existing tooling background |
| Backend API | Go or Python/FastAPI | either works; pick per team speed |
| Database | Supabase (Postgres + PostGIS) | spatial queries (dedup, distance) come free with PostGIS |
| Maps | MapLibre GL JS + OpenFreeMap tiles | no API key, no usage cap, open-source, styleable |
| GPX parsing | `gpxpy` (Python) or `@tmcw/togeojson` (JS) | standard, well-maintained |
| Auth | Supabase Auth (email or OAuth) | bundled with the DB choice, gates upload only — browsing stays open |

## 4. Data model

```sql
create extension if not exists postgis;

create table cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city_id uuid references cities(id),
  geom geometry(LineString, 4326) not null,
  gpx_raw text not null,              -- original file content
  thumbnail_svg text not null,        -- pre-rendered at upload time
  distance_m numeric not null,
  elevation_gain_m numeric,
  status text not null check (status in ('official', 'community', 'pending', 'rejected')),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);
create index routes_geom_idx on routes using gist(geom);

create table route_duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  route_id uuid references routes(id),
  candidate_route_id uuid references routes(id),
  similarity_score numeric not null,
  resolved boolean default false,
  created_at timestamptz default now()
);
```

## 5. Key algorithms

### 5.1 Shape thumbnail generation (on upload)

1. Parse GPX → array of `{lat, lon}` points.
2. Simplify with Douglas-Peucker (tolerance tuned per route length) to cut point count for a clean line.
3. Fit to a square viewbox **preserving aspect ratio** — scale by the larger of width/height so the shape isn't stretched into an oval.
4. Flip the Y axis (SVG y grows downward, latitude grows upward).
5. Store the resulting `<svg><polyline>` as text in `thumbnail_svg`.

Known gotcha: stray GPS points at the very start/end (drift before/after the actual run) can throw off the bounding box — trim outlier points before fitting.

### 5.2 Duplicate detection (on upload)

Two-stage, DB-native:

1. **Cheap prefilter** — `ST_DWithin` against the spatial index to shortlist nearby routes only.
2. **Shape comparison** — `ST_FrechetDistance` between the new route and each shortlisted candidate. Fréchet is used over Hausdorff because it accounts for point *order* along the path, which matters for "is this the same route run start-to-finish," not just "do these paths occupy the same area."

Anything under the similarity threshold is written to `route_duplicate_flags` for **admin review**, never auto-rejected — two legitimate routes can legitimately share street segments.

Known limitation: a route recorded in reverse, or a loop started from a different point, will score as dissimilar even though it's the same physical route. Mitigate by also comparing against `ST_Reverse(geom)` and keeping the better score. Not solving the rotated-loop-start case in v1 — flag as a known gap.

## 6. API surface (sketch)

```
GET  /cities
GET  /routes?city_id=&status=
GET  /routes/:id
GET  /routes/:id/gpx              -- download
POST /routes                      -- upload (auth required)
GET  /me/routes                   -- contributor's own uploads + status

-- admin (auth + role required)
GET  /admin/routes/pending
GET  /admin/routes/duplicate-flags
POST /admin/routes/:id/approve
POST /admin/routes/:id/reject
PATCH /admin/routes/:id            -- edit, set official, unpublish
POST /admin/cities
```

## 7. Frontend structure (Next.js)

```
/                       city picker + route list
/routes/[id]            route detail: map, stats, elevation chart, download
/routes/[id]/run        run mode: live position, off-route indicator
/upload                 GPX upload form (auth required)
/me                      contributor's upload history + status
/admin                  pending queue, duplicate-flag review, city CRUD
```

## 8. Run mode implementation notes

- Uses the browser Geolocation API (`watchPosition`), no native app in v1.
- Known limitation: unreliable once the tab backgrounds or the screen locks (especially iOS Safari) — show a one-time notice before starting (per user story).
- Off-route distance = shortest distance from current position to the route `LineString`, computed client-side against the already-loaded geometry (no need to round-trip to the server per position update).
- The "ghost runner" preview animation is a separate, GPS-independent feature: pure client-side playback of a marker moving along the polyline at constant speed, for browsing/preview only.

## 9. Non-functional / deferred

- **Object storage**: not needed at MVP scale (GPX files are 20–200 KB); revisit if DB backup size or bandwidth becomes a real issue.
- **Turn-by-turn navigation**: out of scope — would require a road-network routing engine (e.g. OSRM) matched against the GPX; flagged in user stories as a later item.
- **Native app / background tracking**: deferred; web-only geolocation is the deliberate MVP scope.
- **Map styling**: OpenFreeMap's default "Liberty" style ships first; a custom style matching the paper/topo palette (`Paper` / `Ink` / `Trail orange` / `Moss` / `Contour tan`) can be authored later via Maputnik without an infra change.

## 10. Open questions

- Go vs. Python/FastAPI for the API layer — pick based on team throughput, not a hard technical requirement either way.
- Threshold value for the duplicate-similarity flag — needs tuning against real uploaded data once there's a corpus to test against.
- Role model for admin access (single admin vs. multi-admin with permissions) — not yet specified.
