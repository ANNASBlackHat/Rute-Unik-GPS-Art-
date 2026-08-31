import { haversineDistance } from './geo';

export interface CityWithCenter {
  id: string;
  name: string;
  lon: number | null;
  lat: number | null;
}

/**
 * Decode EWKB hex string for Point with SRID 4326 (as returned by PostgREST for geometry)
 * Format: 0101000020E6100000 + 8 bytes little-endian double lon + 8 bytes lat
 */
export function decodeEwkbPoint(hex: string | null): { lon: number; lat: number } | null {
  if (!hex || typeof hex !== 'string') return null;
  // Remove 0x prefix if present
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length < 42) return null; // need at least header + 16 bytes
  try {
    // Header is 18 hex chars (9 bytes): 01 01 00 00 20 E6 10 00 00
    // Then 16 hex chars for lon, 16 for lat (little endian)
    const lonHex = clean.slice(18, 34);
    const latHex = clean.slice(34, 50);
    if (lonHex.length !== 16 || latHex.length !== 16) return null;

    const lonBytes = new Uint8Array(8);
    const latBytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
      lonBytes[i] = parseInt(lonHex.slice(i * 2, i * 2 + 2), 16);
      latBytes[i] = parseInt(latHex.slice(i * 2, i * 2 + 2), 16);
    }
    const lonView = new DataView(lonBytes.buffer);
    const latView = new DataView(latBytes.buffer);
    const lon = lonView.getFloat64(0, true); // little endian
    const lat = latView.getFloat64(0, true);
    if (isNaN(lon) || isNaN(lat)) return null;
    return { lon, lat };
  } catch {
    return null;
  }
}

export function parseCityWithCenter(raw: { id: string; name: string; center_point: string | null }): CityWithCenter {
  const decoded = decodeEwkbPoint(raw.center_point);
  return {
    id: raw.id,
    name: raw.name,
    lon: decoded?.lon ?? null,
    lat: decoded?.lat ?? null,
  };
}

/**
 * Find nearest city to a given [lon, lat] point using haversine distance.
 * Returns null if no city has center, or if distance exceeds threshold.
 */
export function findNearestCity(
  point: [number, number],
  cities: CityWithCenter[],
  maxDistanceMeters: number = 100_000
): { city: CityWithCenter; distanceMeters: number } | null {
  let best: CityWithCenter | null = null;
  let bestDist = Infinity;

  for (const city of cities) {
    if (city.lon === null || city.lat === null) continue;
    const dist = haversineDistance(point, [city.lon, city.lat]);
    if (dist < bestDist) {
      bestDist = dist;
      best = city;
    }
  }

  if (!best || bestDist > maxDistanceMeters) return null;
  return { city: best, distanceMeters: Math.round(bestDist) };
}

/**
 * Compute centroid of a set of [lon, lat] coordinates (simple average)
 */
export function centroidOfCoordinates(coords: [number, number][]): [number, number] | null {
  if (coords.length === 0) return null;
  let sumLon = 0;
  let sumLat = 0;
  for (const [lon, lat] of coords) {
    sumLon += lon;
    sumLat += lat;
  }
  return [sumLon / coords.length, sumLat / coords.length];
}
