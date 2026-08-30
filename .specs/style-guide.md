# Frontend Style Guide — Rute Unik

Status: draft, pre-build
Related docs: `tech-spec.md`, `user-stories.md`

Direction: trail-marker / topographic-map aesthetic, built around the route's own linework as the visual centerpiece. Deliberately not the Strava orange-on-dark look — runners are already fluent in that ecosystem, but this should feel like its own trail-marker identity, not a copy.

## 1. Color tokens

```css
:root {
  --color-paper: #EDE8DC;        /* page background */
  --color-ink: #1F2A1E;          /* text, linework, borders on dark */
  --color-trail-orange: #E8562C; /* the one accent — CTAs, Official badge */
  --color-moss: #5C6E4F;         /* secondary / completed / success state */
  --color-contour-tan: #C9BFA6;  /* hairline borders, dividers */
  --color-chalk: #F7F5EF;        /* card surfaces sitting on paper */
}
```

**Usage rules:**
- `trail-orange` is the *only* saturated accent on any given screen — reserve it for the primary action and the Official badge. Using it on more than one element per view dilutes it back into decoration.
- `moss` carries secondary meaning (completed routes, success states) — never used for the primary CTA.
- Route linework itself is always `ink`, regardless of surrounding color — the shape must read the same on every card.
- Text on `trail-orange` or `moss` fills uses `chalk`, never `ink` or plain white — check contrast per instance.

## 2. Typography

| Role | Typeface | Used for |
|---|---|---|
| Display | Archivo Black (or similar heavy condensed grotesk) | route names, page headings — always caps, tight tracking |
| Data | JetBrains Mono | distance, elevation, pace, any numeric readout — tabular figures |
| Body | Inter | descriptions, form labels, general UI copy |

**Scale:**

```css
--text-display-lg: 28px; /* page titles */
--text-display-md: 18px; /* route card names */
--text-data: 11px;       /* stat rows — deliberately small, reads as a watch readout */
--text-body: 15px;       /* descriptions */
--text-caption: 13px;    /* metadata, timestamps */
```

Rule of thumb: if it's a number the runner would check mid-run (distance, elevation, pace), it's mono. Everything else is Inter.

## 3. Layout tokens

```css
--radius-card: 12px;
--radius-badge: 4px;
--border-hairline: 1px solid var(--color-contour-tan);
--space-card-padding: 16px;
```

- Cards: `chalk` background, `hairline` border, `radius-card`. No shadows — flat, paper-like, not screen-like.
- Badges: `radius-badge` only (not pill-shaped) — keeps them reading as stamped labels rather than app chrome.

## 4. Component patterns

### Route card
- Shape thumbnail (SVG linework, `ink` stroke) as the dominant visual element — largest thing on the card.
- Route name below in Display type, caps.
- Status badge (`Official` = `trail-orange` fill / `chalk` text, `Community` = outline only, no fill) top-right.
- Stat row along the bottom: distance · elevation gain · city, in Data type, separated by hairline divider above it.

### Buttons
- Primary (upload submit, start run mode): `trail-orange` fill, `chalk` text. One per screen, max.
- Secondary (everything else — filters, cancel, download): `ink` outline, transparent fill.

### Map
- Base style: MapLibre + OpenFreeMap `liberty` style at launch.
- Later pass: restyle via Maputnik to recolor roads/land/water toward `paper`/`contour-tan`/`moss` so the map itself matches the card system instead of looking like a generic web map dropped into a styled page.

## 5. What this deliberately avoids

- No gradients, drop shadows, or glassmorphism — flat surfaces only, consistent with the paper-map metaphor.
- No cycling through multiple accent colors per screen — color encodes one thing (official status / accent action), not decoration.
- No rounded pill badges — reads as generic SaaS chrome rather than a trail marker.

## 6. Open questions

- Dark mode: not yet scoped. If added, `ink`/`paper` would need to invert carefully since the palette is currently built around a light "paper" background as the core metaphor — this isn't a simple token flip.
- Icon set: not yet chosen — needs something that reads as trail/outdoor (not a generic UI icon font) for wayfinding elements like start/finish markers.
