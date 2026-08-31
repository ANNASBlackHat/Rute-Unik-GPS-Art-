import React from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { RunTracker } from '@/components/run/RunTracker';

import { parseGpxCoordinates } from '@/lib/geo';

export default async function RunModePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Fetch route data
  const { data: route, error } = await supabase
    .from('routes')
    .select('id, name, distance_m, elevation_gain_m, status, gpx_raw')
    .eq('id', id)
    .single();

  if (error || !route) {
    notFound();
  }

  // Extract coordinates [lon, lat] from GPX
  const coordinates: [number, number][] = parseGpxCoordinates(route.gpx_raw);

  return (
    <div className="space-y-4">
      <RunTracker
        route={{
          id: route.id,
          name: route.name,
          distance_m: Number(route.distance_m),
          elevation_gain_m: route.elevation_gain_m
            ? Number(route.elevation_gain_m)
            : null,
          status: route.status,
        }}
        coordinates={coordinates}
      />
    </div>
  );
}
