import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthUser } from '@/lib/supabase/server';
import { parseGpx } from '@/lib/gpx';
import { Client } from 'pg';

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
    // Try primary DATABASE_URL, fallback to pooler if ENOTFOUND (common when direct db host not resolvable in prod)
    const primaryConn = process.env.DATABASE_URL;
    const fallbackConn =
      process.env.DATABASE_POOLER_URL ||
      process.env.POSTGRES_URL ||
      (() => {
        // Auto-derive pooler URL from direct host (e.g., db.<project>.supabase.co -> pooler)
        if (!primaryConn) return null;
        try {
          const url = new URL(primaryConn);
          const host = url.hostname;
          const m = host.match(/^db\.([^.]+)\.supabase\.co$/);
          if (!m) return null;
          const project = m[1];
          const password = url.password;
          const user = url.username;
          // Supabase pooler for ap-southeast-1 (most common for this project)
          // Try transaction mode 6543 with pgbouncer
          return `postgresql://${user}.${project}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
        } catch {
          return null;
        }
      })();

    const tryConnect = async (connStr: string | undefined | null) => {
      if (!connStr) throw new Error('DATABASE_URL is not set');
      const isRemote = connStr.includes('supabase.co') || connStr.includes('pooler.supabase.com');
      const client = new Client({
        connectionString: connStr,
        ssl: isRemote ? { rejectUnauthorized: false } : undefined,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      return client;
    };

    let pgClient: Client;
    try {
      pgClient = await tryConnect(primaryConn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isDnsError = msg.includes('ENOTFOUND') || msg.includes('getaddrinfo');
      if (isDnsError && fallbackConn) {
        console.warn('Primary DB connection failed with ENOTFOUND, trying fallback pooler', msg);
        pgClient = await tryConnect(fallbackConn);
      } else if (isDnsError) {
        console.error('DB ENOTFOUND - check DATABASE_URL and Supabase project host. Primary:', primaryConn?.replace(/:[^:@]*@/, ':***@'));
        throw new Error(
          `Database connection failed (ENOTFOUND ${primaryConn?.split('@')[1]?.split('/')[0] || 'unknown host'}). ` +
            `Check production DATABASE_URL and that Supabase project is not paused. ` +
            `Try using the pooler URL (aws-0-...pooler.supabase.com:6543) as DATABASE_POOLER_URL. Original: ${msg}`
        );
      } else {
        throw err;
      }
    }

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
          'pending',
          $8
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
      // Fire-and-forget: do not block response. Use new client, simplified geom, statement timeout 15s.
      const wktForBg = parsed.wktLineString;
      const primaryForBg = primaryConn;
      const fallbackForBg = fallbackConn;
      setImmediate(async () => {
        let bgClient: Client | null = null;
        const tryBgConnect = async (connStr: string | null | undefined) => {
          if (!connStr) throw new Error('No conn');
          const isRemote = connStr.includes('supabase.co') || connStr.includes('pooler.supabase.com');
          const c = new Client({
            connectionString: connStr,
            ssl: isRemote ? { rejectUnauthorized: false } : undefined,
            connectionTimeoutMillis: 5000,
            statement_timeout: 15000,
          });
          await c.connect();
          return c;
        };
        try {
          try {
            bgClient = await tryBgConnect(primaryForBg);
          } catch {
            if (fallbackForBg) bgClient = await tryBgConnect(fallbackForBg);
            else throw new Error('no fallback');
          }
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
