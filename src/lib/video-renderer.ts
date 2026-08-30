import { autoSimplifyCoordinates } from '@/lib/svg-thumbnail';
import { interpolatePolyline, haversineDistance } from '@/lib/geo';

/**
 * Shared canvas renderer for Route Video Export (§6).
 * Contract: (geometry, progress 0–1, viewport) => frame
 * Mirrored in Python Pillow for server fallback — keep math identical.
 */

export interface VideoRenderParams {
  routeName: string;
  cityName?: string;
  distanceKm: string; // e.g. "5.20"
  elevationGain: string; // e.g. "+85 m"
  progress: number; // 0–1
}

export interface VideoRenderOptions {
  width: number;
  height: number;
  backgroundColor?: string;
  padding?: number;
}

const COLORS = {
  paper: '#EDE8DC',
  ink: '#1F2A1E',
  chalk: '#F7F5EF',
  trailOrange: '#E8562C',
  contourTan: '#C9BFA6',
  moss: '#5C6E4F',
} as const;

function getBounds(coords: [number, number][]) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLon, maxLon, minLat, maxLat };
}

/**
 * Project [lon,lat] to canvas [x,y] using same square-fit logic as thumbnail.
 * Preserves aspect ratio, compensates for lon scale at mid-lat.
 */
export function projectToCanvas(
  lon: number,
  lat: number,
  bounds: ReturnType<typeof getBounds>,
  size: number,
  padding: number,
): [number, number] {
  const { minLon, maxLon, minLat, maxLat } = bounds;
  const widthDeg = maxLon - minLon;
  const heightDeg = maxLat - minLat;
  const midLatRad = ((minLat + maxLat) / 2 * Math.PI) / 180;
  const lonScaleFactor = Math.cos(midLatRad);
  const projectedWidth = widthDeg * lonScaleFactor;
  const projectedHeight = heightDeg;
  const maxDimension = Math.max(projectedWidth, projectedHeight, 0.000001);
  const availableSpan = size - 2 * padding;
  const scale = availableSpan / maxDimension;
  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;
  const x = size / 2 + (lon - centerLon) * lonScaleFactor * scale;
  const y = size / 2 - (lat - centerLat) * scale;
  return [x, y];
}

/**
 * Draw a single video frame to a 2D canvas context.
 * This is the renderer function referenced in tech-spec-video-render.md §6.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  coords: [number, number][],
  params: VideoRenderParams,
  options: VideoRenderOptions,
): void {
  const { width, height, backgroundColor = COLORS.paper, padding = 48 } = options;
  const size = Math.min(width, height);
  // Background — paper
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Hairline border to match card style
  ctx.strokeStyle = COLORS.contourTan;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  if (coords.length < 2) return;

  const simplified = autoSimplifyCoordinates(coords);
  const bounds = getBounds(simplified);
  const projected = simplified.map(([lon, lat]) => projectToCanvas(lon, lat, bounds, size, padding));
  // Center the square canvas area within the rectangular viewport
  const offsetX = (width - size) / 2;
  const offsetY = (height - size) / 2;

  const toCanvas = ([x, y]: [number, number]): [number, number] => [x + offsetX, y + offsetY];
  const projectedOffset = projected.map(toCanvas);

  // Draw faint full route (contour tan) as track background
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COLORS.contourTan;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  projectedOffset.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  // Compute progress split — draw traversed segment in ink with halo
  const t = Math.max(0, Math.min(1, params.progress));
  // Find split index by cumulative distance (same as interpolatePolyline)
  const cumulative: number[] = [0];
  for (let i = 0; i < simplified.length - 1; i++) {
    cumulative.push(cumulative[i] + haversineDistance(simplified[i], simplified[i + 1]));
  }
  const total = cumulative[cumulative.length - 1] || 1;
  const target = t * total;
  let splitIdx = 0;
  let splitT = 0;
  for (let i = 0; i < cumulative.length - 1; i++) {
    if (target <= cumulative[i + 1]) {
      splitIdx = i;
      const segLen = cumulative[i + 1] - cumulative[i];
      splitT = segLen > 0 ? (target - cumulative[i]) / segLen : 0;
      break;
    }
    if (i === cumulative.length - 2) splitIdx = i;
  }
  const p1 = simplified[splitIdx];
  const p2 = simplified[Math.min(splitIdx + 1, simplified.length - 1)];
  const splitLon = p1[0] + (p2[0] - p1[0]) * splitT;
  const splitLat = p1[1] + (p2[1] - p1[1]) * splitT;
  const splitCanvas = toCanvas(projectToCanvas(splitLon, splitLat, bounds, size, padding));

  // Build traversed polyline up to split point
  const traversed: [number, number][] = [];
  for (let i = 0; i <= splitIdx; i++) traversed.push(projectedOffset[i]);
  // Replace last point with exact split point (more accurate than vertex)
  if (traversed.length > 0) traversed[traversed.length - 1] = splitCanvas;
  // If t=0, still need at least start point; if t>0 ensure line visible
  if (t > 0 && traversed.length === 1) traversed.push(splitCanvas);

  // Halo (chalk) underneath
  if (traversed.length >= 2) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORS.chalk;
    ctx.lineWidth = 9;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    traversed.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // Ink line on top
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    traversed.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Ghost runner marker at progress
  const [mx, my] = splitCanvas;
  // Pulse ring (optional subtle)
  ctx.save();
  ctx.fillStyle = COLORS.trailOrange;
  ctx.globalAlpha = 0.22;
  ctx.beginPath();
  ctx.arc(mx, my, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = COLORS.trailOrange;
  ctx.strokeStyle = COLORS.chalk;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(mx, my, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Runner emoji centered (approx)
  ctx.fillStyle = COLORS.chalk;
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('●', mx, my + 0.5);
  ctx.restore();

  // Start / Finish dots (static, small)
  const [sx, sy] = projectedOffset[0];
  const [fx, fy] = projectedOffset[projectedOffset.length - 1];
  for (const [x, y, color] of [
    [sx, sy, COLORS.moss],
    [fx, fy, COLORS.trailOrange],
  ] as const) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = COLORS.chalk;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Overlay bar at bottom — stat readout in style-guide Data mono vibe
  const barH = 52;
  ctx.save();
  ctx.fillStyle = COLORS.chalk;
  ctx.strokeStyle = COLORS.contourTan;
  ctx.lineWidth = 1;
  ctx.fillRect(0, height - barH, width, barH);
  ctx.beginPath();
  ctx.moveTo(0, height - barH + 0.5);
  ctx.lineTo(width, height - barH + 0.5);
  ctx.stroke();

  // Route name (Archivo Black condensed feel — use bold sans)
  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 13px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // Truncate if needed
  const name = params.routeName.toUpperCase();
  ctx.fillText(name, 14, height - barH / 2 - 8, width - 28);

  // City + distance · elevation in mono
  ctx.fillStyle = 'rgba(31,42,30,0.7)';
  ctx.font = '500 10px "JetBrains Mono", monospace';
  const city = params.cityName ? `${params.cityName} · ` : '';
  const stats = `${city}${params.distanceKm} km · ${params.elevationGain}`;
  ctx.fillText(stats, 14, height - barH / 2 + 9);

  // Progress percent on right
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.ink;
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillText(`${Math.round(t * 100)}%`, width - 14, height - barH / 2);
  ctx.restore();
}
