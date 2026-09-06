export type Coordinate = [number, number]; // [longitude, latitude]

export interface RouteSummary {
  id: string;
  name: string;
  distance_m: number;
  elevation_gain_m?: number | null;
  status: string;
}

export interface RouteDetail extends RouteSummary {
  city_id: string;
  gpx_raw: string;
  thumbnail_svg: string;
  cities?: {
    id: string;
    name: string;
    country: string;
  } | null;
}

export interface OffRouteResult {
  distanceMeters: number;
  closestPoint: Coordinate;
  isOffRoute: boolean;
}

export interface KilometerMark {
  km: number;
  position: Coordinate;
}
