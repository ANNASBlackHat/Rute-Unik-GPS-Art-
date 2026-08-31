# Rute Unik — Feature Ideas & UI Fixes

A working doc pulling ideas from the DM Fitness flyover app (kept intentionally simpler) plus a prioritized list of UI bugs/polish spotted during review.

---

## 1. Home Page

### 1.1 Distance filter, URL-synced
- Preset buckets rather than a free slider — easier to scan and to encode in a URL: `< 5km`, `5–10km`, `10–15km`, `15km+`.
- URL shape: `?city=solo&distance=10-15`
- On page load, read query params → set filter state → run the same filter function used on interaction. No separate "restore" logic needed if filtering is always driven off URL state rather than local state.
- Clearing a filter should remove its key from the URL (not just set to empty string) so URLs stay clean and shareable.

### 1.2 Shape/theme filter
- Filter by what the route looks like: Animal, Object, Symbol, Letter/Number, Abstract.
- Same URL-param pattern: `&shape=animal`
- This is arguably a stronger filter than distance for this product — it's the actual hook — so give it equal visual weight to the city chips, not a buried dropdown.

### 1.3 Search by name
- Simple text input, matches route title + city. Debounce ~300ms, also reflected in URL (`&q=gajah`) so a search is shareable/bookmarkable too.

### 1.4 Sort
- Options: Newest, Shortest → Longest, Longest → Shortest, Most Downloaded.
- `&sort=newest` in URL, same pattern as above.

### 1.5 "Surprise Me"
- One button, picks a random route (weighted toward official ones initially, if user-submitted quality is inconsistent early on) and navigates straight to its detail page.
- Cheap to build (random pick from the current filtered set, or the whole catalog if no filters are active), and gives people with no specific ask something fun to do.

### 1.6 Elevation squiggle on cards
- A tiny sparkline (just the shape of the elevation profile, no axis/labels) rendered under the shape thumbnail on each card.
- Lets someone tell "flat" vs "hilly" at a glance without opening the detail page — reuses elevation data you already store for the detail page's own chart.

---

## 2. Route Detail Page

### 2.1 Fix map-too-small — three options, pick one
| Option | Effort | Notes |
|---|---|---|
| Fullscreen expand icon (modal/overlay) | Low | Standard pattern, reuse the same map instance at larger size |
| Sticky map on scroll (mobile) | Medium | Map pins near top while stats scroll under it; nice on mobile specifically, doesn't need a modal |
| Both | Medium-High | Sticky by default, expand icon for the "really look closely" moment |

Recommend starting with the **expand icon** — smallest lift, solves the immediate problem, and doesn't conflict with anything else on the page.

### 2.2 Waypoint click-to-zoom
- Clicking a numbered waypoint (1, 2, 3…) on the map pans/zooms to it and simultaneously highlights the matching point on the elevation chart (and vice versa, if the elevation chart already shows km markers).
- Reuses existing waypoint + elevation data — no new data model needed, just wiring two components together via shared "active waypoint" state.

### 2.3 Elevation-follows-playback (the main ask)
This is the single most valuable thing to borrow from the DM Fitness app, simplified:

- **Moving dot on the elevation chart**, position driven by the same `%` / timestamp that drives the map preview animation. If the preview already emits a progress value (0–100% or elapsed seconds), the chart dot just consumes the same value — no new animation loop needed.
- **Bidirectional scrubbing**: dragging the dot on the elevation chart also moves the marker on the map. This lets someone jump to "what happens at km 8" without watching the whole playback — genuinely more useful than DM Fitness's one-directional flyover.
- **Small live readout** during playback: `Km 4.2 · 97m` as a single line near the chart. Skip DM Fitness's full stat-card treatment (Distance/Elevation/Remaining in three boxes) — one line is enough for a preview, not a live run.
- **Explicitly skip**: 3D flyover, Runner POV / Drone 3D / 2D Top-Down mode switcher, turn-by-turn cue cards during preview. These are what make DM Fitness feel complex, and they're solving a different problem (rehearsing a run) than what a catalog preview needs (help me picture the route quickly).

### 2.4 Optional stretch: playback speed
- A simple 1x / 2x / 4x toggle for the preview, same idea as DM Fitness — useful once routes get to 15–20km, since watching a full-speed animation of a 17km route is slow.

---

## 3. Start Run Page

### 3.1 Fix the off-route / distance-label bug (do this first)
- Don't show an off-route distance until GPS has a confirmed fix — show "Locating GPS…" in that slot instead of a raw (possibly null-derived) number.
- Relabel the bottom stat bar so "route length" and "distance covered so far" are visually distinct — e.g. `2.4 / 17.11 km` instead of a single `17.11 km` that reads as already-covered distance.

### 3.2 Pause / resume
- Add a pause button alongside Exit Run. Pausing should stop the elapsed-time clock and freeze the "off route" calculation so it doesn't accumulate false drift while someone's stopped at a light.

### 3.3 Progress toward the shape (the differentiator)
- Instead of (or alongside) a generic distance-covered stat, show **% of the shape traced** — e.g. a small outline of the elephant that fills in stroke-by-stroke as the runner's GPS trace covers each segment of the route.
- Implementation sketch: you already have the route as an ordered set of points/segments (used for the waypoint numbers). As the user's live GPS position matches/passes a segment (within some tolerance, similar to the existing off-route check), mark that segment "completed" and re-render the shape SVG with completed segments in a solid color, remaining in outline/dashed.
- This ties the live-run screen back to the actual "GPS art" pitch — nothing else in a typical running app does this, and you already have all the underlying data (route geometry) to build it.

### 3.4 Lightweight next-turn cue
- A single line, not a full card: "Turn right in 150m." Reuse the same turn-detection logic you'd need for a turn list on the detail page (see below) — don't build two separate systems.
- Optional: a subtle sound/vibration cue at the turn point, since most runners aren't staring at the phone.

### 3.5 Post-run summary
- After finishing, show the runner's **actual GPS trace overlaid on the target shape** — this is the payoff moment and doubles as shareable content.
- Reuse the existing "Card PNG" / "Export Video" machinery from the detail page for this — generate the same kind of shareable card, but with the real trace instead of (or alongside) the official route line.
- Basic stats: actual distance, actual time, avg pace, how closely the trace matched the target shape (even a rough "94% match" number is fun, doesn't need to be rigorous).

### 3.6 Clarify "Ghost Runner"
- Right now it's an unlabeled toggle on the tracking screen. Decide what it actually does (most likely: compare live pace/position against a target pace or a previous run) and surface that comparison somewhere visible — e.g. "+12s vs target pace" — so the button earns its place instead of being a mystery toggle.

---

## 4. UI Fixes — Prioritized Backlog

| # | Issue | Where | Priority | Why |
|---|---|---|---|---|
| 1 | No mobile hamburger menu — nav wraps and collides with page title | Home, Route Detail (mobile) | **P0** | Reads as broken, not stylistic; blocks basic usability on the primary device size |
| 2 | "OFF ROUTE: 47096M" shown before GPS lock | Start Run | **P0** | Actively misleading/alarming mid-run; core trust issue for a tracking feature |
| 3 | Distance stat ambiguous — route length vs. distance covered read as the same number | Start Run | **P0** | Directly misleads the runner about their own progress |
| 4 | No pause, only Exit | Start Run | **P1** | Real runs get interrupted; losing progress on exit is a bad experience |
| 5 | Waypoint numbers overlap/unreadable near dense clusters | Route Detail | **P1** | Undercuts the core "trace the shape" value prop |
| 6 | Six stacked action buttons (Download / Start / Share / Card PNG / Line Only / Export Video) | Route Detail | **P1** | Crowds the page; export options could collapse into one menu |
| 7 | "Official" badge, "Start Run" CTA, and off-route alert all share near-identical orange-red | Route Detail, Start Run | **P2** | Color no longer reliably signals meaning (status vs. action vs. warning) |
| 8 | Zero-count city filters (Jakarta (0), Semarang (0)) are clickable dead ends | Home | **P2** | Minor, but makes the catalog feel sparser than it is |
| 9 | Route shape preview (the emotional payoff) sits at the very bottom on mobile, after all stats/buttons | Route Detail | **P2** | Buries the most distinctive part of the product |
| 10 | "Ghost Runner" toggle has no explanation of what it does | Start Run | **P2** | Confusing affordance with no visible effect |

**Suggested order of attack:** P0 items first (they're closer to bugs than design choices), then the elevation-sync + fullscreen-map pair from Route Detail since that's the immediate ask, then the Start Run improvements (pause, progress-toward-shape) as the next milestone.
