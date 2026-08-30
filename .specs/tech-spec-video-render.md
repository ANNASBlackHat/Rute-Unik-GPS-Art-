# Tech Spec — Route Video Export

Status: draft, pre-build
Related docs: `tech-spec.md`, `style-guide.md`

## 1. Scope

v1 covers a single render style: the existing "ghost runner" 2D top-down animation (route line + moving marker + stat overlay), exported as either a full route video or a short muted preview loop.

Explicitly out of scope for v1, but the architecture below is written so it doesn't block adding these later: 3D perspective renders, alternate camera angles/styles. See §6.

## 2. Two render paths

| | Client-side (primary) | Server-side (fallback) |
|---|---|---|
| Trigger | Default, when browser supports it | When client capability check fails, or for guaranteed/high-quality output |
| Tech | Mediabunny + WebCodecs `VideoEncoder` | Python (Pillow) frame generation + ffmpeg encode |
| Cost | Free — runs on user's device | Server compute, needs a job queue |
| Output | MP4, generated in seconds regardless of route length | MP4, same visual result |

Both paths share one thing conceptually: a **renderer function** that, given `(route geometry, progress 0–1, viewport size)`, draws a single frame. Client-side draws it to a `<canvas>`; server-side draws it with Pillow. Keeping this logic simple and mirrored between the two is what makes the fallback safe to maintain — see §6.

## 3. Client-side pipeline (primary)

1. **Capability check** — before offering export, check `VideoEncoder.isConfigSupported(...)` for a target codec (e.g. `avc1` / H.264). If unsupported, fall back to server-side (§4) instead of failing silently.
2. **Frame generation loop** — do *not* use `captureStream()` / real-time playback. Manually step progress from 0 to 1 in fixed increments (e.g. 1/fps per frame), drawing each frame to an offscreen canvas. This decouples render time from animation duration — a route that "plays" for 8 seconds renders in a fraction of a second.
3. **Encode** — feed each canvas frame into a WebCodecs `VideoEncoder` configured for the target resolution/bitrate/fps.
4. **Mux** — pass encoded chunks into Mediabunny's `Output` with an MP4 target; finalize to get a downloadable `Blob`.
5. **Deliver** — trigger a browser download / share sheet directly from the blob. No upload to the server required for this path.

```
progress 0→1 (stepped, not real-time)
   → draw frame to canvas
   → VideoEncoder.encode(frame)
   → Mediabunny Output (MP4 mux)
   → Blob → download
```

### Preview loop variant
Same pipeline, different parameters: shorter duration (~2–3s), lower resolution, muted. Presented in the UI as the "GIF preview" but is actually a small MP4/WebM loop (`autoplay loop muted playsinline`) — smaller file size and better decode performance than a real GIF, visually indistinguishable to the user.

## 4. Server-side pipeline (fallback / guaranteed quality)

Used when client capability check fails, or later if a "high quality / branded" export tier is added.

1. `POST /routes/:id/render-video` — enqueues a job, returns a job id immediately (this must be async — video encoding is real CPU time, not a request/response operation).
2. Worker picks up the job:
   - Generate frames with Pillow using the same drawing logic as the client renderer (route line, progress marker, stat overlay).
   - Encode with ffmpeg: `ffmpeg -framerate 30 -i frame_%04d.png ... output.mp4` — same muxing/overlay approach already used for other pipelines (subtitle burning, watermarking).
3. Output is stored (see §5) and the job record updated to `done` with a URL.
4. Client polls or subscribes (`GET /jobs/:id`) for status, then presents a download/share link once ready.

## 5. Storage note

Unlike GPX files and SVG thumbnails (small enough to live as DB text columns — see `tech-spec.md` §9), rendered videos are large enough (multi-MB) that **this is the one place object storage is actually justified**. Server-rendered outputs go to Supabase Storage (or R2/S3-compatible) rather than a DB column; client-rendered exports never touch the server at all, so they don't need storage unless the user explicitly chooses to save/share it back to the platform.

## 6. Extensibility for future render styles (3D, alternate views)

Not building this now — just noting the seam so v1 doesn't have to be redone:

- Keep the renderer function's input/output contract simple: `(route geometry, progress, params) → frame`. A future 3D renderer is a different implementation of the same contract, not a rework of the encode/mux pipeline (Mediabunny client-side, ffmpeg server-side) — that plumbing stays identical regardless of how a frame is drawn.
- A 3D render style would likely need to be server-side only at first (WebGL-to-frame capture in-browser is a meaningfully bigger lift than the current 2D canvas approach) — worth treating as a separate spec when it's actually prioritized, not designed speculatively now.

## 7. Open questions

- Target resolution/bitrate defaults for v1 — needs a couple of test exports to tune, not a spec decision.
- Whether the "high quality" server-rendered tier is user-facing (a choice) or purely an automatic fallback — depends on whether device capability gaps turn out to be common enough to matter.
- Branding/watermark overlay on exported video — not yet scoped; if wanted, straightforward to add as another draw step in the same renderer function.
