# Tech Spec — Mobile App & Monorepo Architecture (Rute Unik)

**Status:** Proposed / Architectural Blueprint  
**Related Docs:** [`tech-spec.md`](file:///Users/annasblackhat/Documents/Experiment/rute-unik/.specs/tech-spec.md), [`tech-spec-video-render.md`](file:///Users/annasblackhat/Documents/Experiment/rute-unik/.specs/tech-spec-video-render.md)

---

## 1. Executive Summary & Objective

The primary objective for the mobile application (Android / iOS) is to deliver an active sports runner experience that mobile web browsers cannot provide:
1. **Background GPS Tracking**: Persistent tracking that continues when the phone screen is locked or tucked into a pocket/running belt.
2. **Turn-by-Turn Voice Audio Guide**: Automatic spoken turn directions (*"In 30 meters, turn right"*, *"Off route! Turn back"*, and milestone progress) via Android Text-To-Speech (TTS) with audio ducking over music/podcasts.
3. **Monorepo Architecture**: Unify the existing Next.js web application and the new Expo mobile application in a single repository using **Turborepo**, sharing 100% of spatial/GPS algorithms, GPX parsers, types, and database queries without affecting Vercel web deployments.

---

## 2. Why Mobile (Android) Over Web Browser for Run Mode

| Feature | Mobile Web Browser (Current) | Native Mobile / Expo (Proposed) |
| :--- | :--- | :--- |
| **Screen Lock Behavior** | Browser throttles or suspends `navigator.geolocation`. Tracking pauses. | Android Foreground Service (`FOREGROUND_SERVICE_LOCATION`) tracks continuously with lock screen notifications. |
| **Audio Guidance** | Web Speech API is unreliable when the browser tab is backgrounded. | Native OS Text-to-Speech (`expo-speech`) speaks reliably at exact proximity triggers. |
| **Audio Ducking** | Cannot duck third-party apps (Spotify, Apple Music). | Requests Android `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK` to temporarily lower music volume while speaking directions. |
| **Map Rendering Performance** | Browser WebGL canvas consumes heavy CPU/battery. | Native GPU-accelerated vector map rendering (`@maplibre/maplibre-react-native`). |
| **Offline Resilience** | Browser cache is subject to eviction. | Local SQLite/MMKV cache ensures the route line and guidance work even with zero cellular signal. |

---

## 3. Monorepo Structure (Turborepo)

The repository transitions to a standard Turborepo monorepo. The existing Next.js app is relocated into `apps/web/`, the new mobile app lives in `apps/mobile/`, and common logic lives in `packages/shared/`.

```
rute-unik/                                   # Repository Root
├── apps/
│   ├── web/                                 # Next.js 16 Web & Admin App (Migrated from root)
│   │   ├── src/
│   │   │   ├── app/                         # [locale] pages & /api routes
│   │   │   ├── components/                  # Web DOM components (Tailwind, Lucide, Web MapLibre)
│   │   │   └── i18n/                        # next-intl routing
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json                     # { "name": "web", "dependencies": { "@rute-unik/shared": "*" } }
│   │
│   └── mobile/                              # React Native / Expo Mobile App
│       ├── app/                             # Expo Router file-based screens
│       │   ├── _layout.tsx
│       │   ├── index.tsx                    # Route Directory / Search
│       │   ├── route/[id].tsx               # Route Detail & Overview
│       │   └── run/[id].tsx                 # Live Run Tracker with Audio Guidance
│       ├── services/                        # Background Location Task & TTS Manager
│       │   ├── locationTask.ts
│       │   └── voiceGuide.ts
│       ├── app.json                         # Expo configuration (permissions, plugins)
│       └── package.json                     # { "name": "mobile", "dependencies": { "@rute-unik/shared": "*" } }
│
├── packages/
│   └── shared/                              # Shared Business Logic & Spatial Math
│       ├── src/
│       │   ├── geo.ts                       # Haversine, off-route calculation, bearing math
│       │   ├── gpx.ts                       # GPX parser & coordinate extractor
│       │   ├── navigation.ts                # Turn angle detection & voice cue generator
│       │   ├── shape-category.ts            # GPS Art category inference
│       │   ├── supabase.ts                  # Shared Supabase client configuration
│       │   ├── types.ts                     # Route, Coordinate, TurnCue interfaces
│       │   └── index.ts
│       ├── package.json                     # { "name": "@rute-unik/shared", "main": "./src/index.ts" }
│       └── tsconfig.json
│
├── messages/                                # Translation strings (en.json, id.json)
├── supabase/                                # Database migrations, seed data, PostGIS schema
├── package.json                             # Workspaces root definition
├── turbo.json                               # Turborepo task pipeline
└── docker-compose.yml                       # Local PostGIS container (port 54322)
```

---

## 4. Code Sharing Strategy

### 4.1 What is 100% Shared via `@rute-unik/shared`
- **Spatial Geometry Math** (`packages/shared/src/geo.ts`):
  - `haversineDistance([lon1, lat1], [lon2, lat2])`
  - `pointToSegmentDistance(point, lineStart, lineEnd)`
  - `calculateOffRoute(currentPos, routeCoords, thresholdMeters)`
  - `interpolatePolyline(coords, progress)`
  - `getKilometerMarks(coords)`
- **GPX Parsing & Validation** (`packages/shared/src/gpx.ts`):
  - `parseGpx(xmlString)`
  - `parseGpxCoordinates(xmlString)`
- **Navigation Engine** (`packages/shared/src/navigation.ts`):
  - Turn angle computation, cue trigger thresholds, and instruction formatting.
- **Supabase Models & TypeScript Interfaces** (`packages/shared/src/types.ts`):
  - Shared definitions for `Route`, `City`, `TurnCue`, `RunProgress`.

### 4.2 What Stays Native to Each App
- **UI Primitives**: Web uses HTML/Tailwind (`<div>`, `<button>`, `Tailwind 4`); Mobile uses React Native (`<View>`, `<Pressable>`, `<Text>`, `NativeWind` or `StyleSheet`).
- **Map Drivers**: Web uses `maplibre-gl` (WebGL DOM canvas); Mobile uses `@maplibre/maplibre-react-native` (native Metal/Vulkan/OpenGL).
- **Location APIs**: Web uses `navigator.geolocation`; Mobile uses `expo-location` with a native Android Foreground Service.

---

## 5. Turn-by-Turn Voice Audio Navigation Engine

Because GPS art routes are custom-drawn shapes (not standard road-network routes computed by OSRM or Google Maps), navigation cues are derived directly from the **geometry of the route polyline**.

### 5.1 Geometry Turn-Angle Algorithm
For any three consecutive points $A$, $B$, $C$ along the simplified route polyline:

1. **Calculate Initial Bearing $\theta$ (in degrees $0^\circ \dots 360^\circ$):**
   $$\theta = \text{atan2}(\sin(\Delta\lambda)\cos(\phi_2), \; \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\Delta\lambda))$$
2. **Calculate Bearing Delta $\Delta\theta$:**
   $$\Delta\theta = (\text{bearing}(B \to C) - \text{bearing}(A \to B) + 540) \pmod{360} - 180$$
3. **Turn Classification Matrix:**

| Angle Range ($\Delta\theta$) | Direction Cue | Audio Phrase (EN) | Audio Phrase (ID) |
| :--- | :--- | :--- | :--- |
| **$-20^\circ$ to $+20^\circ$** | Straight | *"Continue straight"* | *"Lurus terus"* |
| **$+20^\circ$ to $+50^\circ$** | Slight Right | *"Bear slight right"* | *"Ambil serong kanan"* |
| **$+50^\circ$ to $+120^\circ$** | Right Turn | *"Turn right"* | *"Belok kanan"* |
| **$> +120^\circ$** | Sharp Right | *"Make a sharp right"* | *"Belok patah ke kanan"* |
| **$-20^\circ$ to $-50^\circ$** | Slight Left | *"Bear slight left"* | *"Ambil serong kiri"* |
| **$-50^\circ$ to $-120^\circ$** | Left Turn | *"Turn left"* | *"Belok kiri"* |
| **$< -120^\circ$** | Sharp Left | *"Make a sharp left"* | *"Belok patah ke kiri"* |

### 5.2 Dynamic Proximity Trigger Stages
As the runner moves towards a turn waypoint:
1. **Advance Notice (30–35 meters out):**
   *"In 30 meters, turn right."*
2. **Action Notice (5–8 meters out):**
   *"Turn right now."*
3. **Off-Route Detection (Deviation > 25–30m):**
   Evaluated on every GPS tick via `calculateOffRoute`. If off-route:
   > ⚠️ *"You are off route. Turn back towards the path."*
4. **Milestone Announcements:**
   Triggered at each whole kilometer or completion percentage milestone (e.g. 25%, 50%, 75% of shape completed).

### 5.3 Android Audio Management & Ducking
- **TTS Engine**: `expo-speech` (binds directly to Android native `TextToSpeech`, zero cloud latency, operates completely offline).
- **Audio Focus**: Configured to request transient audio focus with ducking (`AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`). Music apps (e.g. Spotify) automatically decrease volume while a voice cue is being spoken, and return to normal volume immediately afterwards.

---

## 6. Background Geolocation & Power Management

To ensure Android does not kill the run tracking when the screen locks:

1. **Foreground Service**:
   Declared in Android Manifest with `android.permission.FOREGROUND_SERVICE_LOCATION`.
2. **Sticky Notification**:
   Displays a live updating status on the Android lock screen:
   - Route Name & Target Shape (e.g. *"Running: Kucing UGM"*)
   - Distance Covered / Total Distance (e.g. *"3.2 km / 6.5 km"*)
   - Completion Percentage (e.g. *"48% complete"*)
3. **WakeLock**:
   Utilizes a CPU wake-lock during active runs to prevent device sleep while GPS updates are streaming.

---

## 7. Data Connectivity & Offline Strategy

```
┌──────────────────────────────────────┐
│          Expo Mobile App             │
└──────┬────────────────────────┬──────┘
       │ Direct Supabase SDK    │ Local Cache (Fallback)
       ▼                        ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│ Supabase Cloud          │  │ SQLite / MMKV           │
│ - Auth & Profiles       │  │ - Cached Route GeoJSON  │
│ - Routes & Geometries   │  │ - Offline Turn Cues     │
│ - PostGIS Duplicate RPC │  │ - Unsynced Breadcrumbs  │
└─────────────────────────┘  └─────────────────────────┘
```

1. **Direct Connection via `@supabase/supabase-js`**:
   The mobile app connects to the same Supabase project URL and anon key as the web app. Public routes and user profiles use the existing PostgreSQL Row Level Security (RLS) policies.
2. **Offline-First Pre-load**:
   When the user taps *"Start Run"*, the full coordinate array, precomputed turn cues, and elevation profile are persisted locally in SQLite or MMKV. If cellular signal drops during the run, navigation and audio cues continue without interruption.
3. **Post-Run Sync**:
   Recorded breadcrumbs, elapsed duration, and completion stats are queued and synchronized to Supabase once connectivity is restored.

---

## 8. Vercel Deployment Guarantees

Transitioning to a monorepo will **not** disrupt existing or future Vercel deployments.

### 8.1 Configuration on Vercel Dashboard
In **Vercel Project Settings $\to$ General**:
- **Root Directory**: `apps/web`
- **Include files outside root directory in Build Step**: **Checked** (Enabled)

### 8.2 Smart Build Skipping (Turborepo Integration)
Vercel natively inspects git commits against Turborepo task dependencies:
- A commit that only modifies `apps/mobile/**` will **automatically be skipped** by Vercel's build pipeline, consuming zero build minutes.
- A commit that modifies `apps/web/**` or `packages/shared/**` will automatically trigger a clean build and deployment of the web application.

---

## 9. Mobile Deployment & Build Pipeline

The mobile app has its own separate build pipeline using **Expo Application Services (EAS)**:

- **Local Development**:
  ```bash
  npx expo start
  ```
- **Android APK / Google Play App Bundle (.aab)**:
  ```bash
  eas build --platform android --profile production
  ```
- **Over-The-Air (OTA) Updates**:
  Critical bug fixes and turn-math improvements can be published instantly to users without waiting for Google Play Store review using `eas update`.

---

## 10. Phased Implementation Plan

### Phase 1: Shared Package & Monorepo Setup
- Initialize Turborepo configuration (`turbo.json`, root `package.json` workspaces).
- Relocate current web files to `apps/web`.
- Create `packages/shared` and extract [`geo.ts`](file:///Users/annasblackhat/Documents/Experiment/rute-unik/src/lib/geo.ts), [`gpx.ts`](file:///Users/annasblackhat/Documents/Experiment/rute-unik/src/lib/gpx.ts), and TypeScript types.
- Verify `apps/web` builds and passes `npm run build` and Vercel preview.

### Phase 2: Navigation Engine (`navigation.ts`)
- Implement bearing delta calculations and turn-classification algorithms in `packages/shared`.
- Add unit tests verifying turn cues against sample routes ([`examples/kucing-ugm.gpx`](file:///Users/annasblackhat/Documents/Experiment/rute-unik/examples/kucing-ugm.gpx)).

### Phase 3: Expo Mobile Scaffold & UI
- Scaffold `apps/mobile` with Expo Router and NativeWind.
- Build Route Directory and Route Detail screens consuming Supabase via `@rute-unik/shared`.
- Integrate `@maplibre/maplibre-react-native` for vector map rendering.

### Phase 4: Run Mode, Background Service & Audio
- Implement `expo-location` background tracking task with persistent notification.
- Implement `expo-speech` audio triggers with ducking for upcoming turns and off-route warnings.
- Test end-to-end run simulation and physical field test on an Android device.
