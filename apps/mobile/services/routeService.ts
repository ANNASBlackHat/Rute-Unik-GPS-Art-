import {
  parseGpxCoordinates,
  extractTurnCues,
  TurnCue,
  ShapeCategory,
  inferShapeCategory,
  generateThumbnailSvg,
} from '@rute-unik/shared';
import { supabase } from './supabase';

export interface MobileRouteItem {
  id: string;
  name: string;
  city: string;
  distanceMeters: number;
  elevationGainMeters: number | null;
  shapeCategory: ShapeCategory;
  thumbnailSvg?: string;
  status: 'official' | 'community';
}

export interface MobileRouteDetail extends MobileRouteItem {
  coordinates: [number, number][]; // [lon, lat]
  turnCues: TurnCue[];
  totalTurns: number;
}

export interface RouteFilterParams {
  query?: string;
  city?: string;
  maxDistanceKm?: number;
  shapeCategory?: ShapeCategory | 'all';
}

// Built-in offline fallback routes for instant testing or when offline
export const FALLBACK_ROUTES: MobileRouteItem[] = [
  {
    id: 'kucing-ugm',
    name: 'Kucing UGM',
    city: 'Yogyakarta',
    distanceMeters: 6540,
    elevationGainMeters: 45,
    shapeCategory: 'animal',
    thumbnailSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none"><polyline points="37.8,106.9 29.9,133.9 26,132.7 35.6,100.1 71.9,111.1 91.3,109.6 94.5,106.7 99.5,98.2 110.6,60.7 115.3,50.7 118.5,45.9 124,40.9 130.1,39.2 156.8,39.5 165.1,38.5 169.3,41.5 172.3,47.5 173.5,58.2 175,61.4 173.5,58.2 172.5,47.5 169.3,41.5 165.1,38.5 156.8,39.5 130.1,39.2 122.2,42.7 118.5,46.6 111.1,60.9 103,88.5 105.4,97 104.7,100.6 96.5,103.8 91.3,109.6 76.8,110.9 75.6,114.9 75.6,132 72.3,161.5 62.8,160.7 68.4,123.5 59.5,122.1 51.1,152.7 47.9,159.3 37.3,158 43,138.8 31.1,135.2 29.4,135.9 25.3,134.7 35.6,100.1 25,96.9 36.8,58.2 38.3,58.5 34.8,69.9 55.8,76.2 59.1,65 61.2,65.5 49.2,104.7 41.3,102.3 39.8,102.5 38.3,105.2" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    status: 'official',
  },
  {
    id: 'pistol-jogja',
    name: 'Pistol Jogja',
    city: 'Yogyakarta',
    distanceMeters: 4850,
    elevationGainMeters: 30,
    shapeCategory: 'object',
    thumbnailSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none"><polyline points="53.2,63.8 51.8,72 35.2,86.2 32.3,91.4 32,96.5 33.9,102.9 41.1,111.4 34.3,113.7 31.9,113.4 30.4,117.9 26.6,118.8 25,121.5 25.6,142.8 28.8,147.6 34.4,150.8 47.8,141 54.3,140.6 61.3,123 64.5,118.9 64.4,115.2 70,112.1 71.5,104.8 66.1,102 65.6,96.7 66.7,92.6 65.8,92.7 74.9,92.8 80.2,95.7 80.7,98.3 78,103.4 75.6,104.8 71.5,104.8 66.9,103 65.6,96.7 66.7,92.6 74.9,92.8 86.7,97.7 90.1,93.3 105.2,95.9 105.6,94 118.8,97.7 129.3,94.7 130.9,92.7 131.2,86.9 166.1,87.3 170.4,84.4 175,78.3 173.9,64.5 172.2,63.6 174.1,51.8 163,49.4 161.3,49.2 160.5,54.3 156.3,53.4 154.6,64.3 171.1,64.5 172.2,63.6 173.4,51.6 161.3,49.2 160.5,54.3 156.3,53.4 154.6,64.3 79.5,63.7 78.4,62.9 79.7,55.2 64.4,54.5 61.2,54.5 60.2,62.9 77.7,63.7 78.2,64.5 79.7,55.2 64.4,54.5 61.2,54.5 58.8,63.2 53.1,64.4" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    status: 'community',
  },
  {
    id: 'kucing-dago',
    name: 'Kucing Dago',
    city: 'Bandung',
    distanceMeters: 7200,
    elevationGainMeters: 110,
    shapeCategory: 'animal',
    thumbnailSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none"><polyline points="93.4,42.7 86.8,95 99.5,96 101,104.3 108.2,109.8 110.4,109.4 122.3,101 139.8,101.1 147.7,78.9 175,77.4 147.7,78.9 146.5,80.2 136.6,111.3 136,130 139.6,139.6 139.5,160.7 111.8,160.2 112.2,129.5 110.5,124.6 83.4,122.3 78.9,159.1 59.1,158.4 59.9,121.6 53.3,115.1 53.9,101.4 56.8,87.1 25,85.7 26.2,63 35,60.1 39.3,57 40.6,58.7 62.1,62.3 63.6,55.1 44,52.1 41.9,57.9 42.4,54.8 49.4,42.1 65.7,44.9 67,39.3 93,42.5" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    status: 'official',
  },
  {
    id: 'monas-star',
    name: 'Bintang Monas',
    city: 'Jakarta',
    distanceMeters: 5100,
    elevationGainMeters: 15,
    shapeCategory: 'symbol',
    thumbnailSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%" fill="none"><polygon points="100,25 122,78 178,80 133,118 149,173 100,140 51,173 67,118 22,80 78,78" fill="none" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    status: 'official',
  },
];

/**
 * Filter routes based on user criteria
 */
export function filterRoutes(
  routes: MobileRouteItem[],
  params: RouteFilterParams = {}
): MobileRouteItem[] {
  return routes.filter((route) => {
    // 1. Text search query
    if (params.query && params.query.trim().length > 0) {
      const q = params.query.toLowerCase().trim();
      const matchesName = route.name.toLowerCase().includes(q);
      const matchesCity = route.city.toLowerCase().includes(q);
      if (!matchesName && !matchesCity) return false;
    }

    // 2. City filter
    if (params.city && params.city !== 'all') {
      if (route.city.toLowerCase() !== params.city.toLowerCase()) {
        return false;
      }
    }

    // 3. Max distance in km
    if (params.maxDistanceKm && params.maxDistanceKm > 0) {
      const routeKm = route.distanceMeters / 1000;
      if (routeKm > params.maxDistanceKm) return false;
    }

    // 4. Shape category
    if (params.shapeCategory && params.shapeCategory !== 'all') {
      if (route.shapeCategory !== params.shapeCategory) return false;
    }

    return true;
  });
}

/**
 * Parses raw GPX content into a structured mobile route detail with coordinates and turn cues.
 */
export function processRouteGpx(
  routeItem: MobileRouteItem,
  gpxRaw: string
): MobileRouteDetail {
  const coordinates = parseGpxCoordinates(gpxRaw);
  const turnCues = extractTurnCues(coordinates, {
    minSegmentMeters: 15,
    minTurnAngleDegrees: 25,
  });

  return {
    ...routeItem,
    shapeCategory: routeItem.shapeCategory || inferShapeCategory(routeItem.name),
    thumbnailSvg:
      routeItem.thumbnailSvg ||
      generateThumbnailSvg(coordinates, {
        strokeColor: '#34d399',
        strokeWidth: 3.5,
      }),
    coordinates,
    turnCues,
    totalTurns: turnCues.length,
  };
}

/**
 * Retrieves route detail including coordinates and turn cues.
 */
export function getRouteDetailWithCoordinates(
  routeId: string
): MobileRouteDetail {
  const item =
    FALLBACK_ROUTES.find((r) => r.id === routeId) || FALLBACK_ROUTES[0];

  const baseLat =
    item.city === 'Jakarta'
      ? -6.1754
      : item.city === 'Bandung'
        ? -6.885
        : -7.7713;
  const baseLon =
    item.city === 'Jakarta'
      ? 106.8272
      : item.city === 'Bandung'
        ? 107.613
        : 110.3778;

  const sampleCoords: [number, number][] = [
    [baseLon, baseLat],
    [baseLon + 0.002, baseLat + 0.001],
    [baseLon + 0.003, baseLat + 0.003],
    [baseLon + 0.002, baseLat + 0.005],
    [baseLon - 0.001, baseLat + 0.006],
    [baseLon - 0.003, baseLat + 0.004],
    [baseLon - 0.002, baseLat + 0.001],
    [baseLon, baseLat],
  ];

  const turnCues = extractTurnCues(sampleCoords, {
    minSegmentMeters: 10,
    minTurnAngleDegrees: 20,
  });

  return {
    ...item,
    thumbnailSvg:
      item.thumbnailSvg ||
      generateThumbnailSvg(sampleCoords, {
        strokeColor: '#34d399',
        strokeWidth: 3.5,
      }),
    coordinates: sampleCoords,
    turnCues,
    totalTurns: turnCues.length,
  };
}

/**
 * Formats distance in meters into localized km string (e.g. 6.5 km)
 */
export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

/**
 * Formats time in seconds into mm:ss or hh:mm:ss string
 */
export function formatRunDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;

  if (hrs > 0) {
    return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  }
  return `${remMins < 10 ? '0' : ''}${remMins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
}

/**
 * Fetches all official & community routes from the Supabase database.
 * Falls back to FALLBACK_ROUTES if offline or on network failure.
 */
export async function fetchLiveRoutes(): Promise<MobileRouteItem[]> {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select(
        'id, name, distance_m, elevation_gain_m, status, thumbnail_svg, cities(name)'
      )
      .in('status', ['official', 'community'])
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return FALLBACK_ROUTES;
    }

    return data.map((r: any) => {
      const cityName =
        (Array.isArray(r.cities) ? r.cities[0]?.name : r.cities?.name) ||
        'Indonesia';
      return {
        id: r.id,
        name: r.name,
        city: cityName,
        distanceMeters: r.distance_m || 5000,
        elevationGainMeters: r.elevation_gain_m,
        shapeCategory: inferShapeCategory(r.name),
        thumbnailSvg: r.thumbnail_svg,
        status: r.status,
      };
    });
  } catch {
    return FALLBACK_ROUTES;
  }
}

/**
 * Fetches detailed route information including GPX coordinates and turn cues.
 */
export async function fetchLiveRouteDetail(
  routeId: string
): Promise<MobileRouteDetail> {
  try {
    const { data, error } = await supabase
      .from('routes')
      .select(
        'id, name, distance_m, elevation_gain_m, status, thumbnail_svg, gpx_raw, cities(name)'
      )
      .eq('id', routeId)
      .single();

    if (error || !data) {
      return getRouteDetailWithCoordinates(routeId);
    }

    const rawData = data as any;
    const cityName =
      (Array.isArray(rawData.cities)
        ? rawData.cities[0]?.name
        : rawData.cities?.name) || 'Indonesia';

    const item: MobileRouteItem = {
      id: rawData.id,
      name: rawData.name,
      city: cityName,
      distanceMeters: rawData.distance_m || 5000,
      elevationGainMeters: rawData.elevation_gain_m,
      shapeCategory: inferShapeCategory(rawData.name),
      thumbnailSvg: rawData.thumbnail_svg,
      status: rawData.status,
    };

    if (data.gpx_raw && data.gpx_raw.trim().length > 0) {
      return processRouteGpx(item, data.gpx_raw);
    }

    return getRouteDetailWithCoordinates(routeId);
  } catch {
    return getRouteDetailWithCoordinates(routeId);
  }
}

/**
 * Fetches available cities with routes from Supabase.
 */
export async function fetchLiveCities(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('cities')
      .select('name')
      .order('name');

    if (error || !data || data.length === 0) {
      return ['Yogyakarta', 'Jakarta', 'Bandung'];
    }

    return data.map((c: any) => c.name);
  } catch {
    return ['Yogyakarta', 'Jakarta', 'Bandung'];
  }
}

