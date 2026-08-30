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
    const connectionString = process.env.DATABASE_URL;
    const isRemote = connectionString?.includes('supabase.co');
    const pgClient = new Client({
      connectionString,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });

    await pgClient.connect();

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
