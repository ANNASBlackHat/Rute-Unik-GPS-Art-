import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { Client } from 'pg';
import { CatalogManager, CatalogRouteItem } from '@/components/admin/CatalogManager';

export const dynamic = 'force-dynamic';

export default async function AdminRoutesPage({
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

  let routes: CatalogRouteItem[] = [];
  try {
    await client.connect();
    const query = `
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
    `;

    const res = await client.query(query);
    routes = res.rows.map((row) => ({
      ...row,
      distance_m: Number(row.distance_m),
      elevation_gain_m: row.elevation_gain_m ? Number(row.elevation_gain_m) : null,
    }));
  } catch (err) {
    console.error('AdminRoutesPage DB error (fallback to empty):', err);
  } finally {
    try {
      await client.end();
    } catch {}
  }

  return <CatalogManager initialRoutes={routes} />;
}
