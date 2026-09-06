import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getDbClient } from '@/lib/db';
import { CityManager, AdminCityItem } from '@/components/admin/CityManager';

export const dynamic = 'force-dynamic';

export default async function AdminCitiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  

  let cities: AdminCityItem[] = [];
  const client = await getDbClient();
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
    cities = res.rows.map((row) => ({
      ...row,
      center_lat: Number(row.center_lat),
      center_lon: Number(row.center_lon),
      routes_count: Number(row.routes_count),
    }));
  } catch (err) {
    console.error('AdminCitiesPage DB error (build will fallback to empty):', err);
  } finally {
    try {
      await client.end();
    } catch {}
  }

  return <CityManager initialCities={cities} />;
}
