import { NextRequest, NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/admin';
import { Client } from 'pg';

export async function GET() {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    const query = `
      select 
        c.id, 
        c.name, 
        c.country, 
        coalesce(ST_Y(c.center_point::geometry), -6.2088) as center_lat,
        coalesce(ST_X(c.center_point::geometry), 106.8456) as center_lon,
        count(r.id)::int as routes_count
      from public.cities c
      left join public.routes r on r.city_id = c.id
      group by c.id, c.center_point
      order by c.name;
    `;

    const res = await client.query(query);
    return NextResponse.json({ cities: res.rows });
  } finally {
    await client.end();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminUser();
  if (!auth.authorized) return auth.response;

  const body = await request.json();
  const { name, country, center_lat, center_lon } = body;

  if (!name) {
    return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  try {
    const lat = center_lat ?? -6.2088;
    const lon = center_lon ?? 106.8456;

    const query = `
      insert into public.cities (name, country, center_point)
      values ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326))
      returning id, name, country;
    `;

    const res = await client.query(query, [
      name,
      country || 'Indonesia',
      lon,
      lat,
    ]);

    return NextResponse.json({ success: true, city: res.rows[0] });
  } finally {
    await client.end();
  }
}
