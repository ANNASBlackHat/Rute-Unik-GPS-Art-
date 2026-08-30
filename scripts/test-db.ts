import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function run() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:54322/postgres';

  const isRemote =
    connectionString.includes('supabase.co') ||
    (!connectionString.includes('localhost') &&
      !connectionString.includes('127.0.0.1'));

  const maskedUrl = connectionString.replace(/:[^:@]+@/, ':***@');
  console.log(`Connecting to Postgres (${isRemote ? 'Remote Supabase' : 'Local'}): ${maskedUrl}...`);

  const client = new Client({
    connectionString,
    ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    console.log('Connected successfully.');

    // 1. Run migrations
    const migrationPath = path.join(
      __dirname,
      '../supabase/migrations/20260830000000_init_schema.sql'
    );
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Applying migration...');
    await client.query(migrationSql);
    console.log('Migration applied successfully.');

    // 2. Run seed
    const seedPath = path.join(__dirname, '../supabase/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    console.log('Applying seed data...');
    await client.query(seedSql);
    console.log('Seed data applied successfully.');

    // 3. Verify PostGIS Version
    const postgisRes = await client.query('SELECT PostGIS_Version();');
    console.log(`PostGIS Version: ${postgisRes.rows[0].postgis_version}`);

    // 4. Verify Tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('cities', 'routes', 'route_duplicate_flags')
      ORDER BY table_name;
    `);
    console.log('Found tables:', tablesRes.rows.map((r) => r.table_name));
    if (tablesRes.rows.length !== 3) {
      throw new Error('Not all expected tables were created');
    }

    // 5. Verify Spatial Index
    const indexRes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE indexname = 'routes_geom_idx';
    `);
    if (indexRes.rows.length === 0) {
      throw new Error('Spatial index routes_geom_idx was not found');
    }
    console.log('Verified spatial index: routes_geom_idx');

    // 6. Verify Spatial Queries
    const spatialRes = await client.query(`
      SELECT 
        name, 
        ST_AsGeoJSON(geom) as geojson,
        ST_Distance(geom::geography, ST_SetSRID(ST_MakePoint(107.6100, -6.8900), 4326)::geography) as dist_to_start,
        ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(107.6100, -6.8900), 4326)::geography, 500) as within_500m
      FROM routes
      WHERE name = 'KUCING DAGO';
    `);

    const route = spatialRes.rows[0];
    console.log(`Route query test for ${route.name}:`);
    console.log(`- GeoJSON type: ${JSON.parse(route.geojson).type}`);
    console.log(`- Distance to start point: ${Math.round(route.dist_to_start)}m`);
    console.log(`- Within 500m: ${route.within_500m}`);

    if (!route.geojson || !route.within_500m) {
      throw new Error('Spatial query assertions failed');
    }

    console.log('\nAll PostGIS verification checks passed successfully against target database!');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PostGIS verification error:', message);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

run();
