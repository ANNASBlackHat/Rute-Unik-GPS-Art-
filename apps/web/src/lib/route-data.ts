import { supabase } from '@/lib/supabase';
import { getDbClient } from '@/lib/db';

export interface RouteData {
  id: string;
  name: string;
  city_id: string;
  distance_m: number;
  elevation_gain_m: number | null;
  status: string;
  gpx_raw: string;
  thumbnail_svg: string;
  cities: { id: string; name: string; country: string } | null;
}

/**
 * Fetch a route by id — try Supabase first, fallback to direct PG if Supabase
 * unreachable (e.g. ENETUNREACH on remote).
 */
export async function getRoute(id: string): Promise<RouteData | null> {
  let route: RouteData | null = null;

  try {
    const { data, error } = await supabase
      .from('routes')
      .select(
        `
      id,
      name,
      city_id,
      distance_m,
      elevation_gain_m,
      status,
      gpx_raw,
      thumbnail_svg,
      cities (
        id,
        name,
        country
      )
    `
      )
      .eq('id', id)
      .single();
    if (!error && data) route = data as unknown as RouteData;
  } catch {
    // ignore, will fallback to PG
  }

  if (!route) {
    // Fallback to direct PG (local postgis) — keeps dev working when Supabase network is down
    try {
      const client = await getDbClient();
      try {
        const res = await client.query(
          `select r.id, r.name, r.city_id, r.distance_m, r.elevation_gain_m, r.status, r.gpx_raw, r.thumbnail_svg,
                  c.id as city_id2, c.name as city_name, c.country as city_country
           from public.routes r left join public.cities c on c.id = r.city_id where r.id = $1 limit 1`,
          [id]
        );
        if (res.rows.length > 0) {
          const row = res.rows[0];
          route = {
            id: row.id,
            name: row.name,
            city_id: row.city_id,
            distance_m: Number(row.distance_m),
            elevation_gain_m: row.elevation_gain_m
              ? Number(row.elevation_gain_m)
              : null,
            status: row.status,
            gpx_raw: row.gpx_raw,
            thumbnail_svg: row.thumbnail_svg,
            cities: row.city_name
              ? {
                  id: row.city_id2,
                  name: row.city_name,
                  country: row.city_country,
                }
              : null,
          };
        }
      } finally {
        await client.end().catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  return route;
}
