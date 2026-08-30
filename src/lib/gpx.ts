import { haversineDistance } from './geo';
import { generateThumbnailSvg } from './svg-thumbnail';

export interface ParsedGpx {
  coordinates: [number, number][]; // [lon, lat]
  elevationPoints: number[];
  distanceMeters: number;
  elevationGainMeters: number | null;
  wktLineString: string;
  thumbnailSvg: string;
}

export function parseGpx(xmlContent: string): ParsedGpx {
  // Regex extraction of trkpt with lat, lon (supports both self-closing <trkpt .../> and full <trkpt ...>...</trkpt>)
  const ptRegex = /<trkpt\s+([^>]*?)(\/>|>([\s\S]*?)<\/trkpt>)/gi;

  const coordinates: [number, number][] = [];
  const elevationPoints: number[] = [];

  let match: RegExpExecArray | null;

  while ((match = ptRegex.exec(xmlContent)) !== null) {
    const attrs = match[1];
    const inner = match[3] || '';

    const latMatch = /lat=["']([^"']+)["']/i.exec(attrs);
    const lonMatch = /lon=["']([^"']+)["']/i.exec(attrs);

    if (latMatch && lonMatch) {
      const lat = parseFloat(latMatch[1]);
      const lon = parseFloat(lonMatch[1]);

      if (!isNaN(lat) && !isNaN(lon)) {
        coordinates.push([lon, lat]);

        const eleMatch = /<ele>([\d.-]+)<\/ele>/i.exec(inner);
        if (eleMatch) {
          const ele = parseFloat(eleMatch[1]);
          if (!isNaN(ele)) {
            elevationPoints.push(ele);
          }
        }
      }
    }
  }

  if (coordinates.length < 2) {
    throw new Error('GPX must contain at least 2 valid trackpoints.');
  }

  // Calculate cumulative distance
  let totalDistanceMeters = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalDistanceMeters += haversineDistance(coordinates[i], coordinates[i + 1]);
  }

  // Calculate elevation gain
  let elevationGainMeters: number | null = null;
  if (elevationPoints.length > 1) {
    let gain = 0;
    for (let i = 0; i < elevationPoints.length - 1; i++) {
      const diff = elevationPoints[i + 1] - elevationPoints[i];
      if (diff > 0) {
        gain += diff;
      }
    }
    elevationGainMeters = Math.round(gain * 10) / 10;
  }

  // Build WKT LINESTRING(lon lat, ...)
  const wktPoints = coordinates.map(([lon, lat]) => `${lon} ${lat}`).join(', ');
  const wktLineString = `LINESTRING(${wktPoints})`;

  // Generate thumbnail SVG
  const thumbnailSvg = generateThumbnailSvg(coordinates);

  return {
    coordinates,
    elevationPoints,
    distanceMeters: Math.round(totalDistanceMeters),
    elevationGainMeters,
    wktLineString,
    thumbnailSvg,
  };
}
