# User Stories — Rute Unik

## Personas

- **Runner** — browses and follows routes, may or may not have an account
- **Contributor** — a runner who also uploads their own GPX routes
- **Admin** — reviews uploads, manages cities, curates the official catalog

---

## Phase 1 — Directory (no auth required)

### Browsing

- As a Runner, I want to pick a city, so that I only see routes near where I actually run.
  - *AC:* City picker on the homepage; route list filters immediately on selection.

- As a Runner, I want to see each route's shape as a small preview, so that I can spot the "cat" or "unicorn" routes at a glance without opening each one.
  - *AC:* Every route card shows a line-art thumbnail generated from its GPX.

- As a Runner, I want to open a route and see its start point, finish point, and total distance, so that I know what I'm committing to before I go.
  - *AC:* Route detail page shows a map with start/finish markers and distance in km.

- As a Runner, I want to see the elevation profile of a route, so that I know if it's hilly before I run it.
  - *AC:* Elevation chart rendered from the GPX elevation data (or backfilled via an elevation API if missing).

- As a Runner, I want to tell the difference between an Official route and a Community-uploaded one, so that I know which ones have been verified.
  - *AC:* Visible badge ("Official" / "Community") on both the card and detail page.

### Download

- As a Runner, I want to download the GPX file for a route, so that I can load it into my own running watch or app.
  - *AC:* "Download GPX" button on the route detail page; serves the original file.

---

## Phase 2 — Run mode (still web-only)

- As a Runner, I want to see my current position on the map relative to the route, so that I can follow it while I'm actually running.
  - *AC:* Browser geolocation renders a live dot on the route map while the page is open.

- As a Runner, I want to know if I've drifted off the route, so that I can course-correct without needing full turn-by-turn navigation.
  - *AC:* UI shows a distance-off-route indicator that updates as position updates.

- As a Runner, I want to see a preview animation of the route being "run" by an icon, so that I understand the shape and flow of the route before I start.
  - *AC:* A route-preview animation plays on the detail page, independent of live GPS (pure playback).

- As a Runner, I want to be warned that run mode needs my browser tab open and screen on, so that I'm not surprised when tracking stops if my phone locks.
  - *AC:* A one-time notice shown before starting run mode.

---

## Phase 3 — Community uploads

- As a Runner, I want to create an account, so that I can upload routes and have my contributions tracked.
  - *AC:* Basic auth (email or OAuth) gates upload and profile features only — browsing stays open.

- As a Contributor, I want to upload a GPX file for a route I've mapped out, so that other runners can discover and run it too.
  - *AC:* Upload form accepts a `.gpx` file, parses it, and generates stats + thumbnail automatically.

- As a Contributor, I want to name my route and pick which city it belongs to, so that it shows up correctly in the directory.
  - *AC:* Required fields on the upload form: name, city.

- As a Contributor, I want to know if my route looks like a near-duplicate of an existing one before I submit, so that I'm not wasting my time or cluttering the catalog.
  - *AC:* On upload, the system runs a similarity check against existing routes and flags likely duplicates for admin review (not an automatic rejection).

- As a Contributor, I want to see the status of my submitted route (pending, published, rejected), so that I know whether it's live.
  - *AC:* "My uploads" view on the contributor's profile shows status per route.

---

## Phase 4 — Admin dashboard

- As an Admin, I want to see a queue of pending route submissions, so that I can review and approve or reject them.
  - *AC:* Dashboard list view of pending routes with map preview, stats, and uploader info.

- As an Admin, I want to see routes flagged as possible duplicates side-by-side on a map, so that I can decide quickly whether to merge, reject, or approve them.
  - *AC:* Duplicate-flag queue shows the candidate route overlaid against its closest match(es).

- As an Admin, I want to mark a route as Official, so that curated/verified routes are visually distinguished from community submissions.
  - *AC:* Toggle on the route record; reflected immediately in the public badge.

- As an Admin, I want to add and manage cities, so that the platform can expand beyond the initial launch city without needing a code change.
  - *AC:* CRUD interface for the cities list, used by the city picker.

- As an Admin, I want to edit or remove a published route, so that I can fix errors or take down routes that turn out to be inappropriate or unsafe.
  - *AC:* Edit/unpublish actions available from the route management view.

---

## Later / not yet scoped

- As a Runner, I want to "collect" routes I've completed (e.g. all the animal shapes in a city), so that I have a reason to keep coming back.
- As a Runner, I want to import an activity from Strava, so that I don't have to record inside the web app.
- As a Runner, I want spoken turn-by-turn directions while running a route, so that I don't have to keep glancing at my phone.

*(These are intentionally out of Phase 1–4 scope — flagged in earlier discussion as needing either a native app, a third-party integration, or road-network routing data.)*
