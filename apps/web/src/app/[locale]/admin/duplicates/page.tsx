import React from 'react';
import { setRequestLocale } from 'next-intl/server';
import { getDbClient } from '@/lib/db';
import { DuplicatesList } from '@/components/admin/DuplicatesList';
import type { DuplicateFlagItem } from '@/components/admin/DuplicateCompareMap';

export const dynamic = 'force-dynamic';

export default async function AdminDuplicatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  

  let duplicates: DuplicateFlagItem[] = [];
  const client = await getDbClient();
  try {
    const query = `
      select 
        f.id as flag_id,
        f.similarity_score,
        f.created_at,
        r1.id as route_id,
        r1.name as route_name,
        r1.status as route_status,
        r1.distance_m as route_distance_m,
        ST_AsGeoJSON(r1.geom) as route_geojson,
        c1.name as route_city,
        r2.id as candidate_id,
        r2.name as candidate_name,
        r2.status as candidate_status,
        r2.distance_m as candidate_distance_m,
        ST_AsGeoJSON(r2.geom) as candidate_geojson,
        c2.name as candidate_city
      from public.route_duplicate_flags f
      join public.routes r1 on r1.id = f.route_id
      left join public.cities c1 on c1.id = r1.city_id
      join public.routes r2 on r2.id = f.candidate_route_id
      left join public.cities c2 on c2.id = r2.city_id
      order by f.created_at desc;
    `;

    const res = await client.query(query);
    duplicates = res.rows;
  } catch (err) {
    console.error('AdminDuplicatesPage DB error (fallback to empty):', err);
  } finally {
    try {
      await client.end();
    } catch {}
  }

  return <DuplicatesList initialDuplicates={duplicates} />;
}
