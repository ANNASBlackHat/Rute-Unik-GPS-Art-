/**
 * Douglas-Peucker algorithm and aspect-ratio preserving SVG thumbnail generator
 */

export function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number]
): number {
  let dx = lineEnd[0] - lineStart[0];
  let dy = lineEnd[1] - lineStart[1];

  const mag = Math.hypot(dx, dy);
  if (mag === 0) {
    return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
  }

  dx /= mag;
  dy /= mag;

  const pvx = point[0] - lineStart[0];
  const pvy = point[1] - lineStart[1];

  const pvdot = dx * pvx + dy * pvy;
  const ax = pvx - pvdot * dx;
  const ay = pvy - pvdot * dy;

  return Math.hypot(ax, ay);
}

/**
 * Douglas-Peucker line simplification
 */
export function douglasPeucker(
  points: [number, number][],
  epsilon: number
): [number, number][] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (d > maxDist) {
      index = i;
      maxDist = d;
    }
  }

  if (maxDist > epsilon) {
    const left = douglasPeucker(points.slice(0, index + 1), epsilon);
    const right = douglasPeucker(points.slice(index), epsilon);
    return left.slice(0, left.length - 1).concat(right);
  } else {
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Simplifies points targetting roughly 50 to 120 points
 */
export function autoSimplifyCoordinates(
  coordinates: [number, number][]
): [number, number][] {
  if (coordinates.length <= 100) return coordinates;

  // Adaptive epsilon based on bounding box
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of coordinates) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const span = Math.max(maxX - minX, maxY - minY);
  let epsilon = span * 0.005; // 0.5% of span
  let simplified = douglasPeucker(coordinates, epsilon);

  // If still too many points, double epsilon
  if (simplified.length > 150) {
    epsilon *= 2;
    simplified = douglasPeucker(coordinates, epsilon);
  }

  return simplified;
}

interface SvgOptions {
  size?: number;
  padding?: number;
  strokeWidth?: number;
  strokeColor?: string;
}

/**
 * Generates an SVG polyline string fitted to a square viewBox
 * Preserves exact geometric aspect ratio (no oval distortion) and inverts Y-axis.
 */
export function generateThumbnailSvg(
  coordinates: [number, number][], // [lon, lat]
  options: SvgOptions = {}
): string {
  if (coordinates.length < 2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%"></svg>`;
  }

  const size = options.size ?? 200;
  const padding = options.padding ?? 25; // 25px margin inside 200x200
  const strokeWidth = options.strokeWidth ?? 3.5;
  const strokeColor = options.strokeColor ?? '#1F2A1E';

  const simplified = autoSimplifyCoordinates(coordinates);

  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of simplified) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const widthDeg = maxLon - minLon;
  const heightDeg = maxLat - minLat;

  // Account for latitude distortion in meters
  const midLatRad = ((minLat + maxLat) / 2 * Math.PI) / 180;
  const lonScaleFactor = Math.cos(midLatRad);

  const projectedWidth = widthDeg * lonScaleFactor;
  const projectedHeight = heightDeg;

  const maxDimension = Math.max(projectedWidth, projectedHeight, 0.000001);
  const availableSpan = size - 2 * padding;
  const scale = availableSpan / maxDimension;

  const centerLon = (minLon + maxLon) / 2;
  const centerLat = (minLat + maxLat) / 2;

  // Map each coordinate to [svgX, svgY]
  // Invert Y-axis: high latitude = top of SVG (small Y)
  const points = simplified.map(([lon, lat]) => {
    const x = size / 2 + (lon - centerLon) * lonScaleFactor * scale;
    const y = size / 2 - (lat - centerLat) * scale;
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  });

  const pointsStr = points.join(' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" fill="none"><polyline points="${pointsStr}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
