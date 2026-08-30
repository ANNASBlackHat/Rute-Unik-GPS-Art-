import { NextResponse } from 'next/server';
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
    let res;
    try {
      res = await client.query(`
        select 
          r.id,
          r.name,
          r.city_id,
          c.name as city_name,
          r.status,
          r.distance_m,
          r.elevation_gain_m,
          r.thumbnail_svg,
          r.created_at,
          coalesce(p.email, 'Official') as contributor_email
        from public.routes r
        left join public.cities c on c.id = r.city_id
        left join public.profiles p on p.id = r.uploaded_by
        order by r.created_at desc;
      `);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('does not exist')) {
        res = await client.query(`
          select 
            r.id,
            r.name,
            r.city_id,
            c.name as city_name,
            r.status,
            r.distance_m,
            r.elevation_gain_m,
            r.thumbnail_svg,
            r.created_at,
            'Official' as contributor_email
          from public.routes r
          left join public.cities c on c.id = r.city_id
          order by r.created_at desc;
        `);
      } else throw e;
    }
    return NextResponse.json({ routes: res.rows });
  } finally {
    await client.end();
  }
}
