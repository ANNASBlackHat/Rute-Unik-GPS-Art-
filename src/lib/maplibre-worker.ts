import * as maplibregl from 'maplibre-gl';

/**
 * MapLibre GL v6 infers its worker script location from `import.meta.url`
 * (`new URL('./maplibre-gl-worker.mjs', import.meta.url)`). Under Turbopack
 * that inference resolves to the page URL, so the module worker request
 * returns HTML and silently fails — vector layers (GeoJSON route lines)
 * never render, even though raster tiles still draw.
 *
 * Fix: serve the worker from `public/` and point MapLibre at it explicitly.
 * The file must be kept in sync with the installed maplibre-gl version.
 * Both files are required (worker imports shared):
 *   cp node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs public/
 *   cp node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs public/
 */
export function ensureMaplibreWorker(): void {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
}
