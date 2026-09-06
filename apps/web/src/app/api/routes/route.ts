import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/supabase/server';
import { parseGpx } from '@/lib/gpx';
import { getDbClient } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to submit routes.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, city_id, gpx_raw } = body;

    if (!name || !city_id || !gpx_raw) {
      return NextResponse.json(
        { error: 'Name, City, and GPX content are required.' },
        { status: 400 }
      );
    }

    // 1. Parse GPX content
    let parsed;
    try {
      parsed = parseGpx(gpx_raw);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to parse GPX file.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // 2. Insert into PostgreSQL via pg client to handle ST_GeomFromText directly
    const pgClient = await getDbClient();

    // Server-side auto-detect city from GPX centroid (authoritative, prevents client spoofing)
    let finalCityId = city_id;
    try {
      const centroidLon = parsed.coordinates.reduce((sum, [lon]) => sum + lon, 0) / parsed.coordinates.length;
      const centroidLat = parsed.coordinates.reduce((sum, [, lat]) => sum + lat, 0) / parsed.coordinates.length;
      const nearestRes = await pgClient.query(
        `
        select id, name, ST_Distance(center_point::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as dist
        from cities
        where center_point is not null
        order by center_point::geography <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        limit 1;
        `,
        [centroidLon, centroidLat]
      );
      if (nearestRes.rows.length > 0) {
        const nearest = nearestRes.rows[0];
        const dist = Number(nearest.dist);
        // Only auto-override if within 100km, otherwise keep client-provided (fallback for remote GPX)
        if (dist < 100_000) {
          if (nearest.id !== city_id) {
            console.log(`Auto-detected city override: ${nearest.name} (${(dist/1000).toFixed(1)}km) vs provided ${city_id}`);
          }
          finalCityId = nearest.id;
        } else {
          console.warn(`GPX centroid far from nearest city ${nearest.name} (${(dist/1000).toFixed(1)}km), keeping provided ${city_id}`);
        }
      }
    } catch (e) {
      console.warn('City auto-detect failed, keeping provided city_id', e);
    }

    try {
      // Auto-approve if uploader is admin, otherwise pending
      const initialStatus = user.role === 'admin' ? 'official' : 'pending';

      // Insert new route
      const insertSql = `
        insert into public.routes (
          name,
          city_id,
          geom,
          gpx_raw,
          thumbnail_svg,
          distance_m,
          elevation_gain_m,
          status,
          uploaded_by
        )
        values (
          $1,
          $2,
          ST_GeomFromText($3, 4326),
          $4,
          $5,
          $6,
          $7,
          $8,
          $9
        )
        returning id;
      `;

      const insertRes = await pgClient.query(insertSql, [
        name,
        finalCityId,
        parsed.wktLineString,
        gpx_raw,
        parsed.thumbnailSvg,
        parsed.distanceMeters,
        parsed.elevationGainMeters,
        initialStatus,
        user.id,
      ]);

      const newRouteId = insertRes.rows[0].id;

      // Revalidate homepage/caches so new route appears in prod without redeploy
      try {
        revalidatePath('/', 'layout');
        revalidatePath('/[locale]', 'page');
        revalidatePath('/id', 'page');
        revalidatePath('/en', 'page');
      } catch {}

      // 3. Duplicate check — run in background so upload returns fast (<2s) even for large GPX
      setImmediate(async () => {
        let bgClient: Awaited<ReturnType<typeof getDbClient>> | null = null;
        try {
          bgClient = await getDbClient();
          // Use simplified geometry for faster Frechet (tolerance ~5m) and limit candidates
          await bgClient.query('SET statement_timeout = 15000');
          const dupRes = await bgClient.query('select * from public.detect_route_duplicates($1, 80)', [newRouteId]);
          if (dupRes.rows.length > 0) {
            for (const row of dupRes.rows) {
              await bgClient.query(
                `insert into public.route_duplicate_flags (route_id, candidate_route_id, similarity_score)
                 values ($1, $2, $3) on conflict do nothing`,
                [newRouteId, row.candidate_id, row.similarity_meters]
              );
            }
            console.log(`Duplicate check done for ${newRouteId}: ${dupRes.rows.length} candidates`);
          }
        } catch (e) {
          console.warn(`Background duplicate check failed for ${newRouteId}`, e);
        } finally {
          if (bgClient) await bgClient.end().catch(() => {});
        }
      });

      return NextResponse.json({
        success: true,
        routeId: newRouteId,
        isDuplicateFlagged: false,
        distanceMeters: parsed.distanceMeters,
        elevationGainMeters: parsed.elevationGainMeters,
      });
    } finally {
      await pgClient.end();
    }
  } catch (err: unknown) {
    console.error('Error creating route:', err);
    const message =
      err instanceof Error ? err.message : 'Internal server error creating route.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
