import { NextRequest, NextResponse } from 'next/server';
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
        city_id,
        parsed.wktLineString,
        gpx_raw,
        parsed.thumbnailSvg,
        parsed.distanceMeters,
        parsed.elevationGainMeters,
        user.id,
      ]);

      const newRouteId = insertRes.rows[0].id;

      // 3. Duplicate Route Detection check
      const dupCheckSql = `
        select * from public.detect_route_duplicates($1, 80);
      `;
      const dupRes = await pgClient.query(dupCheckSql, [newRouteId]);

      let isDuplicateFlagged = false;
      if (dupRes.rows.length > 0) {
        isDuplicateFlagged = true;
        for (const row of dupRes.rows) {
          await pgClient.query(
            `insert into public.route_duplicate_flags (route_id, candidate_route_id, similarity_score)
             values ($1, $2, $3);`,
            [newRouteId, row.candidate_id, row.similarity_meters]
          );
        }
      }

      return NextResponse.json({
        success: true,
        routeId: newRouteId,
        isDuplicateFlagged,
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
