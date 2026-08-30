import { Client } from 'pg';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log('=== BENCHMARK 1: Spatial Proximity Query (ST_DWithin around Bandung) ===');
  const q1 = await client.query(`
    EXPLAIN ANALYZE
    SELECT id, name, distance_m, ST_AsGeoJSON(geom)
    FROM public.routes
    WHERE ST_DWithin(
      geom::geography,
      ST_SetSRID(ST_MakePoint(107.6191, -6.9175), 4326)::geography,
      25000
    );
  `);
  console.log(q1.rows.map((r) => r['QUERY PLAN']).join('\n'));

  console.log('\n=== BENCHMARK 2: City Routes Listing with Status Filter ===');
  const q2 = await client.query(`
    EXPLAIN ANALYZE
    SELECT r.id, r.name, r.distance_m, r.elevation_gain_m, r.thumbnail_svg, c.name as city_name
    FROM public.routes r
    JOIN public.cities c ON c.id = r.city_id
    WHERE r.status IN ('official', 'community')
    ORDER BY r.created_at DESC;
  `);
  console.log(q2.rows.map((r) => r['QUERY PLAN']).join('\n'));

  console.log('\n=== BENCHMARK 3: Duplicate Fréchet Distance Function ===');
  const q3 = await client.query(`
    EXPLAIN ANALYZE
    SELECT id, name, ST_FrechetDistance(
      geom,
      (SELECT geom FROM public.routes WHERE name = 'KUCING UGM' LIMIT 1)
    ) as similarity
    FROM public.routes
    WHERE name != 'KUCING UGM';
  `);
  console.log(q3.rows.map((r) => r['QUERY PLAN']).join('\n'));

  await client.end();
}

run();
