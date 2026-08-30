import React from 'react';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { RunTracker } from '@/components/run/RunTracker';

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
  const matches = Array.from(
    route.gpx_raw.matchAll(/<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"/g)
  ) as RegExpExecArray[];

  const coordinates: [number, number][] = matches.map((m) => [
    parseFloat(m[2]),
    parseFloat(m[1]),
  ]);

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
