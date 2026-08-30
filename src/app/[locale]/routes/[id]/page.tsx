import React from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { DetailMapSection } from '@/components/map/DetailMapSection';
import { ElevationChart } from '@/components/elevation/ElevationChart';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Link } from '@/i18n/routing';

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('routeDetail');
  const tHome = await getTranslations('home');

  // Fetch route data
  const { data: route, error } = await supabase
    .from('routes')
    .select(`
      id,
      name,
      city_id,
      distance_m,
      elevation_gain_m,
      status,
      gpx_raw,
      thumbnail_svg,
      cities (
        id,
        name,
        country
      )
    `)
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

  const cityObj = route.cities as unknown as {
    name?: string;
    country?: string;
  } | null;
  const cityName = cityObj?.name || 'Unknown';
  const countryName = cityObj?.country || '';
  const distanceKm = (route.distance_m / 1000).toLocaleString(
    locale === 'id' ? 'id-ID' : 'en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );
  const elevation = route.elevation_gain_m
    ? `+${Math.round(route.elevation_gain_m)} m`
    : '--';

  // Estimate pace at 5:30 min/km
  const estMinutes = Math.round((route.distance_m / 1000) * 5.5);
  const hours = Math.floor(estMinutes / 60);
  const mins = estMinutes % 60;
  const timeFormatted =
    locale === 'id'
      ? (hours > 0 ? `${hours}j ${mins}m` : `${mins}m`)
      : (hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);

  return (
    <div className="space-y-8 pb-16">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 font-display text-xs uppercase tracking-wider text-ink/70 hover:text-ink transition-colors"
        >
          ← {t('backToDirectory')}
        </Link>

        <Badge variant={route.status}>
          {route.status === 'official'
            ? tHome('official')
            : tHome('community')}
        </Badge>
      </div>

      {/* Header Info */}
      <div className="space-y-1">
        <span className="font-data text-xs text-ink/60 uppercase tracking-wider font-semibold">
          {cityName}{countryName ? `, ${countryName}` : ''}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-ink uppercase tracking-tight">
          {route.name}
        </h1>
      </div>

      {/* Main Content Grid: Map + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Interactive Route Map & Elevation Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-3 sm:p-4">
            <DetailMapSection coordinates={coordinates} />
          </Card>

          {/* Elevation Profile Chart */}
          <Card className="p-4 sm:p-6">
            <ElevationChart
              gpxRaw={route.gpx_raw}
              distanceMeters={route.distance_m}
            />
          </Card>
        </div>

        {/* Right 1 Col: Comprehensive Stats & Action Buttons */}
        <div className="space-y-6">
          <Card className="space-y-6">
            <h2 className="font-display text-sm uppercase tracking-wider text-ink border-b border-contour-tan pb-2">
              {t('routeStats')}
            </h2>

            <div className="grid grid-cols-2 gap-4 font-data">
              <div className="bg-paper/40 p-3 rounded-[6px] border border-contour-tan/50">
                <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
                  {tHome('distance')}
                </span>
                <span className="font-display text-xl text-ink">
                  {distanceKm}
                </span>
                <span className="text-xs text-ink/70 ml-1">km</span>
              </div>

              <div className="bg-paper/40 p-3 rounded-[6px] border border-contour-tan/50">
                <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
                  {tHome('elevation')}
                </span>
                <span className="font-display text-xl text-ink">
                  {elevation}
                </span>
              </div>

              <div className="bg-paper/40 p-3 rounded-[6px] border border-contour-tan/50">
                <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
                  {t('estPace')}
                </span>
                <span className="font-display text-xl text-ink">
                  05:30
                </span>
                <span className="text-xs text-ink/70 ml-1">/km</span>
              </div>

              <div className="bg-paper/40 p-3 rounded-[6px] border border-contour-tan/50">
                <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
                  {t('estDuration')}
                </span>
                <span className="font-display text-xl text-ink">
                  ~{timeFormatted}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-3">
              <a
                href={`/api/routes/${route.id}/gpx`}
                download
                className="w-full inline-flex items-center justify-center font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] border border-contour-tan text-ink hover:border-ink hover:bg-paper/40 transition-colors select-none"
              >
                📥 {t('downloadGpx')}
              </a>

              <Link
                href={`/routes/${route.id}/run`}
                className="w-full inline-flex items-center justify-center font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] bg-trail-orange text-chalk hover:bg-[#d44820] transition-colors select-none"
              >
                🏃 {t('startRun')}
              </Link>
            </div>
          </Card>

          {/* GPX Artwork Preview Box */}
          <Card className="space-y-3">
            <h3 className="font-display text-xs uppercase tracking-wider text-ink/70">
              {t('shapePreview')}
            </h3>
            <div className="w-full aspect-square bg-paper/60 rounded-[8px] p-6 border border-contour-tan/50 flex items-center justify-center">
              <div
                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:stroke-ink"
                dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
