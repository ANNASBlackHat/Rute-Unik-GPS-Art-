import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Client } from 'pg';
import { PendingList, PendingRoute } from '@/components/admin/PendingList';

export default async function AdminPendingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();

  let routes: PendingRoute[] = [];
  try {
    const query = `
      select 
        r.id,
        r.name,
        r.distance_m,
        r.elevation_gain_m,
        r.thumbnail_svg,
        r.created_at,
        c.name as city_name,
        coalesce(p.email, 'Anonymous') as contributor_email,
        coalesce(p.full_name, 'Runner') as contributor_name,
        (select count(*) from public.route_duplicate_flags f where f.route_id = r.id) as duplicate_flag_count
      from public.routes r
      left join public.cities c on c.id = r.city_id
      left join public.profiles p on p.id = r.uploaded_by
      where r.status = 'pending'
      order by r.created_at desc;
    `;

    const res = await client.query(query);
    routes = res.rows.map((row) => ({
      ...row,
      distance_m: Number(row.distance_m),
      elevation_gain_m: row.elevation_gain_m ? Number(row.elevation_gain_m) : null,
    }));
  } finally {
    await client.end();
  }

  return <PendingList initialRoutes={routes} />;
}
