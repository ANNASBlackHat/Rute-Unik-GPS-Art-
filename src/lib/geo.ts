/**
 * Geodesic calculation utility for GPS coordinates [lon, lat]
 */

const EARTH_RADIUS_METERS = 6371008.8;

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates distance in meters between two [lon, lat] points using Haversine
 */
export function haversineDistance(
  coord1: [number, number],
  coord2: [number, number]
): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates shortest distance in meters from point P to line segment AB
 */
export function pointToSegmentDistance(
  p: [number, number],
  a: [number, number],
  b: [number, number]
): { distance: number; closestPoint: [number, number] } {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;

  // Approximate local projected flat-earth conversion around point A
  const cosLat = Math.cos(toRad((ay + by) / 2));
  const metersPerDegLat = 111132.954;
  const metersPerDegLon = 111132.954 * cosLat;

  // Convert A, B, P to local meter offsets from A
  const Ax = 0;
  const Ay = 0;
  const Bx = (bx - ax) * metersPerDegLon;
  const By = (by - ay) * metersPerDegLat;
  const Px = (px - ax) * metersPerDegLon;
  const Py = (py - ay) * metersPerDegLat;

  const dx = Bx - Ax;
  const dy = By - Ay;
  const segLenSq = dx * dx + dy * dy;

  let t = 0;
  if (segLenSq > 0) {
    t = ((Px - Ax) * dx + (Py - Ay) * dy) / segLenSq;
    t = Math.max(0, Math.min(1, t));
  }

  // Closest point in local coordinates
  const nearestLocalX = Ax + t * dx;
  const nearestLocalY = Ay + t * dy;

  // Convert back to [lon, lat]
  const nearestLon = ax + nearestLocalX / metersPerDegLon;
  const nearestLat = ay + nearestLocalY / metersPerDegLat;
  const closestPoint: [number, number] = [nearestLon, nearestLat];

  const distMeters = Math.hypot(Px - nearestLocalX, Py - nearestLocalY);

  return {
    distance: distMeters,
    closestPoint,
  };
}

/**
 * Calculates shortest distance from runner position to route coordinates
 */
export function calculateOffRoute(
  currentPos: [number, number], // [lon, lat]
  routeCoords: [number, number][],
  thresholdMeters = 30
): {
  distanceMeters: number;
  closestPoint: [number, number];
  isOffRoute: boolean;
} {
  if (routeCoords.length === 0) {
    return {
      distanceMeters: 0,
      closestPoint: currentPos,
      isOffRoute: false,
    };
  }

  if (routeCoords.length === 1) {
    const d = haversineDistance(currentPos, routeCoords[0]);
    return {
      distanceMeters: d,
      closestPoint: routeCoords[0],
      isOffRoute: d > thresholdMeters,
    };
  }

  let minDistance = Infinity;
  let bestPoint = routeCoords[0];

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const { distance, closestPoint } = pointToSegmentDistance(
      currentPos,
      routeCoords[i],
      routeCoords[i + 1]
    );

    if (distance < minDistance) {
      minDistance = distance;
      bestPoint = closestPoint;
    }
  }

  return {
    distanceMeters: Math.round(minDistance * 10) / 10,
    closestPoint: bestPoint,
    isOffRoute: minDistance > thresholdMeters,
  };
}

/**
 * Computes marker positions at every whole kilometer along the route.
 * Returns a list of { km, position } for km 1, 2, 3, ... up to the last
 * full kilometer within the route length (a partial final km gets no marker).
 */
export function getKilometerMarks(
  routeCoords: [number, number][]
): { km: number; position: [number, number] }[] {
  if (routeCoords.length < 2) return [];

  // Cumulative distance (meters) at each vertex
  const cumulative: number[] = [0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = haversineDistance(routeCoords[i], routeCoords[i + 1]);
    cumulative.push(cumulative[i] + d);
  }

  const totalMeters = cumulative[cumulative.length - 1];
  const totalKm = Math.floor(totalMeters / 1000);
  if (totalKm === 0) return [];

  const marks: { km: number; position: [number, number] }[] = [];

  for (let km = 1; km <= totalKm; km++) {
    const target = km * 1000;
    // Find the segment containing the target distance
    for (let i = 0; i < cumulative.length - 1; i++) {
      if (target <= cumulative[i + 1]) {
        const segStart = cumulative[i];
        const segLen = cumulative[i + 1] - segStart;
        const t = segLen > 0 ? (target - segStart) / segLen : 0;
        const p1 = routeCoords[i];
        const p2 = routeCoords[i + 1];
        marks.push({
          km,
          position: [p1[0] + (p2[0] - p1[0]) * t, p1[1] + (p2[1] - p1[1]) * t],
        });
        break;
      }
    }
  }

  return marks;
}

/**
 * Interpolates point along polyline at fraction t [0, 1]
 */
export function interpolatePolyline(
  routeCoords: [number, number][],
  t: number
): [number, number] {
  if (routeCoords.length === 0) return [0, 0];
  if (routeCoords.length === 1 || t <= 0) return routeCoords[0];
  if (t >= 1) return routeCoords[routeCoords.length - 1];

  // Calculate cumulative distances
  const distances: number[] = [0];
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = haversineDistance(routeCoords[i], routeCoords[i + 1]);
    distances.push(distances[i] + d);
  }

  const totalDist = distances[distances.length - 1];
  const targetDist = t * totalDist;

  // Find active segment
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDist <= distances[i + 1]) {
      const segStart = distances[i];
      const segEnd = distances[i + 1];
      const segLen = segEnd - segStart;
      const segT = segLen > 0 ? (targetDist - segStart) / segLen : 0;

      const p1 = routeCoords[i];
      const p2 = routeCoords[i + 1];
      const lon = p1[0] + segT * (p2[0] - p1[0]);
      const lat = p1[1] + segT * (p2[1] - p1[1]);
      return [lon, lat];
    }
  }

  return routeCoords[routeCoords.length - 1];
}

/**
 * Extracts a compact array of sampled elevation numbers from raw GPX XML.
 */
export function extractElevationSamples(
  gpxRaw?: string | null,
  numSamples = 20
): number[] {
  if (!gpxRaw) return [];
  const matches = Array.from(gpxRaw.matchAll(/<ele>([\d.-]+)<\/ele>/g));
  if (matches.length === 0) return [];
  const all = matches.map((m) => parseFloat(m[1])).filter((n) => !isNaN(n));
  if (all.length <= numSamples) return all;
  const step = (all.length - 1) / (numSamples - 1);
  return Array.from({ length: numSamples }, (_, i) => all[Math.round(i * step)]);
}

/**
 * Robustly parses [longitude, latitude] coordinates from any GPX XML string.
 * Handles both lat/lon attribute ordering, rtept/trkpt/wpt tags, and multiline spacing.
 */
export function parseGpxCoordinates(gpxRaw: string): [number, number][] {
  if (!gpxRaw) return [];
  const coords: [number, number][] = [];

  const pointRegex = /<(?:trkpt|rtept|wpt)\b([^>]*)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = pointRegex.exec(gpxRaw)) !== null) {
    const attrs = match[1];
    const latMatch = attrs.match(/lat="([^"]+)"/i);
    const lonMatch = attrs.match(/lon="([^"]+)"/i);
    if (latMatch && lonMatch) {
      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);
      if (!isNaN(lat) && !isNaN(lon)) {
        coords.push([lon, lat]);
      }
    }
  }

  return coords;
}
