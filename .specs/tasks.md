# Task List, Roadmap & Testing Protocol — Rute Unik

Status: draft, pre-build  
Related docs: `style-guide.md`, `tech-spec.md`, `user-stories.md`  
Supported Locales: English (`en`), Bahasa Indonesia (`id`)  
Primary Testing Harness: Automated unit/integration tests + `chrome-devtools-mcp` (browser emulation, visual verification, network & geolocation testing)

---

## Testing & Verification Standard

Before moving from one phase to the next, every phase must satisfy its **Definition of Done (DoD)** and pass explicit **Evaluation & Testing Criteria**.

### Standard Verification with `chrome-devtools-mcp`:
- **Console Inspection:** Check `list_console_messages` for zero unhandled exceptions, zero missing i18n translation warnings, and zero React hydration mismatches.
- **Visual Validation:** Use `take_screenshot` on mobile (e.g. iPhone 14 / Pixel 7) and desktop viewports to verify alignment with `style-guide.md` (colors, Archivo Black Display font, JetBrains Mono data readouts, flat paper cards, hairline borders).
- **Network Verification:** Inspect `list_network_requests` to ensure tile requests to `tiles.openfreemap.org` succeed with HTTP 200, API latency is within budget, and payloads are minimal.
- **Sensor Emulation:** Use `emulate` for geolocation overrides (coordinates, accuracy, mock movement along a polyline) and offline/throttling modes.
- **Accessibility & Auditing:** Run `lighthouse_audit` to ensure scores meet accessibility and performance targets.

---

## Phase 0: Project Setup, Design Tokens & i18n Infrastructure

### Implementation Tasks
- [x] **0.1 Repository & Project Scaffolding**
  - [x] Initialize Next.js with TypeScript and Tailwind CSS (configured with design tokens).
  - [x] Configure ESLint, Prettier, and environment variable schema (`.env.example`).
- [x] **0.2 Design Tokens & Typography Setup**
  - [x] Configure CSS color tokens in `:root` (`--color-paper`, `--color-ink`, `--color-trail-orange`, `--color-moss`, `--color-contour-tan`, `--color-chalk`).
  - [x] Load fonts: **Archivo Black** (Display), **JetBrains Mono** (Data), and **Inter** (Body).
  - [x] Create base card and button utilities matching flat, paper-like styling (no gradients, no drop shadows).
- [x] **0.3 Database & PostGIS Setup (Supabase)**
  - [x] Enable PostGIS extension: `create extension if not exists postgis;`.
  - [x] Apply SQL migration for `cities`, `routes` (with `gist(geom)` index), and `route_duplicate_flags`.
  - [x] Seed test cities (e.g., Bandung, Jakarta, Tokyo) and sample GPX route records.
- [x] **0.4 Internationalization (i18n) Foundation**
  - [x] Install and configure `next-intl` with subpath or cookie-based routing (`/en`, `/id`).
  - [x] Setup translation message files: `messages/en.json` and `messages/id.json`.
  - [x] Build `LanguageSwitcher` component (header/footer).
  - [x] Add locale detection middleware with fallback to `id`.

### Evaluation & Testing Protocol
1. **Automated & Build Check:**
   - Run `npm run build` / `pnpm build` to verify zero TypeScript errors and successful static generation.
   - Run a migration test script against local Supabase/PostgreSQL instance to verify PostGIS functions (`ST_AsGeoJSON`, `ST_Distance`, `ST_DWithin`).
2. **Verification with `chrome-devtools-mcp`:**
   - **Step 1:** Call `navigate_page` to `http://localhost:3000`.
   - **Step 2:** Call `list_console_messages` to ensure clean initial load without missing font warnings or CSS syntax issues.
   - **Step 3:** Call `click` on the `LanguageSwitcher` to toggle between Indonesian and English.
   - **Step 4:** Call `evaluate_script` to check `document.documentElement.lang` updates properly (`"id"` $\leftrightarrow$ `"en"`).
   - **Step 5:** Call `take_screenshot` to confirm background color matches `#EDE8DC` (`--color-paper`) and text renders in the designated typography.

### Phase 0 Exit Criteria (Gate)
- [x] Next.js app builds cleanly.
- [x] PostGIS tables & spatial indexes created and verified.
- [x] English and Indonesian routing/switching functions seamlessly without console warnings.
- [x] Style guide color and typography tokens render correctly in browser.

---

## Phase 1: Directory & Exploration (Public / No Auth)

### Implementation Tasks
- [x] **1.1 MapLibre & Tile Service Integration**
  - [x] Integrate MapLibre GL JS with OpenFreeMap `liberty` style (no API key).
  - [x] Implement responsive canvas handling, pan/zoom controls, and fit-bounds helper.
- [x] **1.2 City Selector & Filter Bar**
  - [x] Build city selector dropdown/chips on homepage with instant route list filtering.
  - [x] Localize labels, placeholders ("Pilih Kota" / "Select City"), and empty states in `id` and `en`.
- [x] **1.3 Route Card & Shape Thumbnail Renderer**
  - [x] Build `<RouteCard />` component adhering strictly to `style-guide.md`:
    - Predominant inline SVG linework preview (`ink` stroke, square aspect ratio).
    - Route name in Archivo Black uppercase.
    - Status badge: `Official` (`trail-orange` fill, `chalk` text) vs `Community` (outline only).
    - Stat row along bottom: distance (`km`), elevation gain (`m`), city in JetBrains Mono.
  - [x] Localize stat readouts and badge text.
- [x] **1.4 Route Detail Page (`/routes/[id]`)**
  - [x] Render interactive route geometry with custom Start (`moss`) and Finish (`trail-orange`) markers.
  - [x] Render Elevation Profile chart from GPX elevation points.
  - [x] Display comprehensive stats card (distance, elevation gain, estimated pace).
  - [x] Localize all action buttons and headings.
- [x] **1.5 GPX Download**
  - [x] Implement `GET /routes/:id/gpx` endpoint serving raw GPX file with content-disposition header.

### Evaluation & Testing Protocol
1. **Directory Browsing & Filter Test (`chrome-devtools-mcp`):**
   - **Step 1:** Call `navigate_page` to `/` with desktop viewport (`resize_page: 1280x800`).
   - **Step 2:** Select a city via `click` and verify that the route cards filter immediately.
   - **Step 3:** Use `take_screenshot` to confirm route card styling: flat cards, hairline borders, no drop shadows, SVG shape is visually dominant.
   - **Step 4:** Emulate mobile screen via `emulate` (`device: "iPhone 14"`) and verify responsive single-column card grid.
2. **Detail Page & Map Loading Test (`chrome-devtools-mcp`):**
   - **Step 1:** Click on a route card to navigate to `/routes/[id]`.
   - **Step 2:** Inspect `list_network_requests` to ensure MapLibre loads vector tiles from `tiles.openfreemap.org` without 404s/500s.
   - **Step 3:** Check that the Start and Finish markers are rendered at correct geographic coordinates.
   - **Step 4:** Verify the elevation profile chart renders SVG path points corresponding to elevation data.
3. **GPX Download Test:**
   - Trigger the download button via `click` and verify in network requests that the file payload is valid XML/GPX.
4. **i18n Completeness:**
   - Toggle language on both homepage and detail page; confirm 100% of headers, stat units, and buttons translate accurately.

### Phase 1 Exit Criteria (Gate)
- [x] Runners can browse routes by city without authentication.
- [x] Route cards display SVG thumbnails in correct proportions with accurate `JetBrains Mono` stat rows.
- [x] Detail page renders interactive MapLibre map and elevation chart.
- [x] GPX download works reliably.
- [x] Zero missing translation keys in both languages.

---

## Phase 2: Run Mode & Route Preview (Web Geolocation)

### Implementation Tasks
- [x] **2.1 Screen-Lock & Browser Warning Modal**
  - [x] Build pre-run warning modal explaining background tab sleep and screen-lock limitations.
  - [x] Provide localized disclaimer copy in `id` and `en`.
- [x] **2.2 Live GPS Tracking (`/routes/[id]/run`)**
  - [x] Implement `navigator.geolocation.watchPosition` handling with high accuracy mode.
  - [x] Render live runner position dot (`trail-orange` pulsing marker) and accuracy circle.
  - [x] Add "Re-center on Me" button.
- [x] **2.3 Client-Side Distance Off-Route Calculation**
  - [x] Compute shortest perpendicular distance from current position to route `LineString` (using Turf.js or client geospatial utility).
  - [x] Real-time off-route indicator:
    - On-route status (`moss` color, e.g. "Di rute / On route").
    - Off-route warning status (> 30m drift, `trail-orange` color, e.g. "Keluar rute: 45m / Off route: 45m").
- [x] **2.4 Ghost Runner Preview Animation**
  - [x] Implement client-side constant-speed runner animation along the route line for preview/scouting.
  - [x] Add Play/Pause/Restart playback controls.

### Evaluation & Testing Protocol
1. **Pre-run Warning Modal Verification (`chrome-devtools-mcp`):**
   - **Step 1:** Navigate to `/routes/[id]/run`.
   - **Step 2:** Verify modal appears before GPS activates. Use `take_screenshot` to confirm readability and button placement.
   - **Step 3:** Click "Mulai / Start" to dismiss modal and initiate tracking.
2. **GPS Sensor Emulation (`chrome-devtools-mcp`):**
   - **Step 1:** Call `emulate` with geolocation coordinates directly on the route line:
     - Example: `latitude: -6.9175, longitude: 107.6191, accuracy: 5`.
   - **Step 2:** Verify runner marker appears on the map and off-route indicator reads "Di rute / On route" (`moss` state).
   - **Step 3:** Call `emulate` with coordinates 60 meters away from the line:
     - Verify indicator turns `trail-orange` and reports off-route distance (~60m).
   - **Step 4:** Test geolocation permission denial scenario and assert friendly localized error dialog appears.
3. **Ghost Runner Playback Test:**
   - Click Play and use `evaluate_script` to check marker position coordinates updating smoothly over 3 seconds without stuttering or CPU spikes.

### Phase 2 Exit Criteria (Gate)
- [x] Disclaimer modal is displayed and acknowledged prior to starting GPS mode.
- [x] Geolocation tracking renders position dot accurately via simulated GPS coordinates.
- [x] Off-route calculation triggers correct visual state changes at defined thresholds.
- [x] Ghost runner animation plays smoothly on both desktop and mobile viewports.

---

## Phase 3: Community Uploads & Contributor Dashboard

### Implementation Tasks
- [x] **3.1 Authentication (Supabase Auth)**
  - [x] Setup Supabase email/password and OAuth auth providers.
  - [x] Build bilingual Auth modal / login pages.
  - [x] Protect `/upload` and `/me` routes with Next.js auth middleware.
- [x] **3.2 GPX Parsing & SVG Thumbnail Generation**
  - [x] Parse GPX file to extract coordinates, total distance, and elevation gain.
  - [x] Implement Douglas-Peucker point simplification algorithm.
  - [x] Fit bounding box to square viewbox preserving aspect ratio, invert Y-axis, and output `<svg><polyline>` text into `thumbnail_svg`.
- [x] **3.3 Duplicate Route Detection Algorithm**
  - [x] Execute two-stage PostGIS check:
    1. Filter candidates within bounding radius using `ST_DWithin`.
    2. Compute `ST_FrechetDistance(geom, candidate)` and compare with `ST_Reverse(geom)` to catch reverse runs.
  - [x] Insert records with score exceeding similarity threshold into `route_duplicate_flags`.
- [x] **3.4 Upload Form (`/upload`)**
  - [x] Drag-and-drop `.gpx` file uploader with instant client-side SVG shape preview.
  - [x] Fields: Route Name, City selection, optional description.
  - [x] Localized feedback messages, validation errors, and upload progress bar.
- [x] **3.5 Contributor Profile / "My Uploads" (`/me`)**
  - [x] Display list of user's uploaded routes with status badges (`pending`, `official`, `community`, `rejected`).
  - [x] Localize status descriptions in both languages.

### Evaluation & Testing Protocol
1. **Auth Flow & Route Protection (`chrome-devtools-mcp`):**
   - **Step 1:** Attempt to navigate to `/upload` as an unauthenticated user; assert redirection to login.
   - **Step 2:** Use `fill_form` to sign in with test credentials; assert successful redirect back to `/upload`.
2. **GPX Upload & Thumbnail Generation Test:**
   - **Step 1:** Use `upload_file` to attach a sample GPS-art GPX file (e.g. `cat-route.gpx`).
   - **Step 2:** Verify client-side SVG preview renders immediately in square proportions without distortion.
   - **Step 3:** Fill in name and select city, then click Submit.
   - **Step 4:** Query database to verify `thumbnail_svg`, `distance_m`, `elevation_gain_m`, and `status='pending'` are populated.
3. **Duplicate Detection Verification:**
   - **Step 1:** Upload the identical (or reversed) GPX route under a different name.
   - **Step 2:** Check database table `route_duplicate_flags` to confirm an entry is logged with similarity score and candidate ID.
   - **Step 3:** Check that the route is saved in `pending` status rather than auto-rejected.
4. **"My Uploads" View Test (`chrome-devtools-mcp`):**
   - Navigate to `/me` and verify the newly uploaded route appears with "Menunggu Tinjauan / Pending Review" badge.

### Phase 3 Exit Criteria (Gate)
- [x] Auth gates upload and profile views while keeping directory public.
- [x] GPX parsing accurately computes distance and elevation.
- [x] Generated SVG thumbnail retains aspect ratio without oval distortion.
- [x] Duplicate detection flags similar/reversed routes into `route_duplicate_flags`.
- [x] Contributor sees correct submission status on `/me`.

---

## Phase 4: Admin Dashboard & Curation

### Implementation Tasks
- [x] **4.1 Admin Authentication & RBAC**
  - [x] Establish admin role verification (Supabase role / claims).
  - [x] Guard `/admin` routes against non-admin users with 403 / redirect.
- [x] **4.2 Pending Submissions Review Queue (`/admin/pending`)**
  - [x] List all routes where `status = 'pending'`.
  - [x] Actions: Approve as Community, Approve as Official, or Reject (with note).
- [x] **4.3 Duplicate Route Comparison View (`/admin/duplicates`)**
  - [x] Side-by-side or overlaid map visualizer showing the candidate route vs. existing match.
  - [x] Display computed similarity score.
  - [x] Actions: Resolve flag, merge, reject, or mark both as valid.
- [x] **4.4 City Management (`/admin/cities`)**
  - [x] CRUD interface to add, edit, and deactivate cities for the city picker.
- [x] **4.5 Route Moderation & Catalog Editing**
  - [x] Ability to edit route names, change city assignments, toggle Official badge, or unpublish.

### Evaluation & Testing Protocol
1. **RBAC Security Test (`chrome-devtools-mcp`):**
   - **Step 1:** Log in with standard user account and attempt navigating to `/admin`; assert access denied (403 or redirect).
   - **Step 2:** Log in with admin credentials and verify dashboard loads with full administrative controls.
2. **Approval & Rejection Workflow Test (`chrome-devtools-mcp`):**
   - **Step 1:** Navigate to `/admin/pending`.
   - **Step 2:** Inspect a pending submission and click "Approve as Official".
   - **Step 3:** Navigate to public `/routes/[id]` and verify badge immediately shows "Official" (`trail-orange` badge).
   - **Step 4:** Test rejection action on another submission and confirm it moves to `rejected` status on the contributor's `/me` page.
3. **Duplicate Comparison Map Test:**
   - Open `/admin/duplicates`, verify both routes render on map with distinct contrasting strokes (e.g. `ink` vs `trail-orange`), allowing visual comparison of path overlap.
4. **City CRUD Test:**
   - Add a new city (e.g., "Surabaya, Indonesia") via admin form; verify it immediately appears in the public homepage city picker.

### Phase 4 Exit Criteria (Gate)
- [x] Non-admins cannot access `/admin`.
- [x] Admins can approve (as Community or Official) or reject routes with real-time public status updates.
- [x] Duplicate flag review inspector renders overlaid paths clearly with similarity scores.
- [x] City CRUD works dynamically without redeploying code.

---

## Phase 5: Quality Assurance, i18n Audit & Performance Launch

### Implementation Tasks
- [x] **5.1 Bilingual Completeness & Localization Polish**
  - [x] Audit `messages/id.json` and `messages/en.json` to guarantee 100% key parity.
  - [x] Verify localized number/date formatting (Indonesian `12,5 km` vs English `12.5 km`).
  - [x] Test language persistence across page reloads and deep links.
- [x] **5.2 Cross-Browser & Mobile Experience Testing**
  - [x] Validate layout and touch responsiveness on iOS Safari and Android Chrome viewports.
  - [x] Validate offline/poor connection handling when loading map tiles.
- [x] **5.3 Performance & Core Web Vitals**
  - [x] Optimize spatial index execution with `EXPLAIN ANALYZE` on `routes_geom_idx`.
  - [x] Audit bundle size and lazy-load MapLibre GL JS to preserve fast Initial Server Response.
  - [x] Run Lighthouse audit for performance, accessibility, and SEO.

### Evaluation & Testing Protocol (`chrome-devtools-mcp`)
1. **Lighthouse Audit:**
   - Run `lighthouse_audit` on `/` and `/routes/[id]`.
   - Ensure Accessibility $\ge 95$, Best Practices $\ge 95$, Performance $\ge 90$.
2. **i18n Key Parity Automated Script:**
   - Execute script comparing keys of `messages/id.json` and `messages/en.json` to ensure zero missing translation keys.
3. **Console & Error Audit:**
   - Navigate through every user journey (browse $\rightarrow$ view $\rightarrow$ run mode $\rightarrow$ upload $\rightarrow$ admin) while recording with `list_console_messages`.
   - Assert zero unhandled exceptions, zero network 500s, and zero React hydration warnings.
4. **Visual Regression & Polish Snapshot:**
   - Take full-page screenshots of all primary routes using `take_screenshot` and verify compliance with `style-guide.md` design principles (no unapproved accent colors, correct fonts, flat paper aesthetic).

### Phase 5 Exit Criteria (Final Launch Gate)
- [x] Lighthouse scores meet or exceed targets.
- [x] Complete bilingual coverage with zero missing translation keys.
- [x] Flawless responsive layout on mobile, tablet, and desktop.
- [x] All database spatial queries perform within < 50ms on sample dataset.
