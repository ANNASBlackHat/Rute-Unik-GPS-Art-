import {
  parseGpxCoordinates,
  extractTurnCues,
  TurnCue,
  ShapeCategory,
  inferShapeCategory,
} from '@rute-unik/shared';

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
    status: 'official',
  },
  {
    id: 'pistol-jogja',
    name: 'Pistol Jogja',
    city: 'Yogyakarta',
    distanceMeters: 4850,
    elevationGainMeters: 30,
    shapeCategory: 'object',
    status: 'community',
  },
  {
    id: 'kucing-dago',
    name: 'Kucing Dago',
    city: 'Bandung',
    distanceMeters: 7200,
    elevationGainMeters: 110,
    shapeCategory: 'animal',
    status: 'official',
  },
  {
    id: 'monas-star',
    name: 'Bintang Monas',
    city: 'Jakarta',
    distanceMeters: 5100,
    elevationGainMeters: 15,
    shapeCategory: 'symbol',
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
    coordinates,
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
