import React from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { getRoute } from '@/lib/route-data';
import { RouteViewerSection } from '@/components/map/RouteViewerSection';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Link } from '@/i18n/routing';
import { RouteActionsMenu } from '@/components/routes/RouteActionsMenu';
import { ViewTracker } from '@/components/routes/ShareButton';
import { localeUrl } from '@/lib/site';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const route = await getRoute(id);
  if (!route) return {};

  const cityName = route.cities?.name || '';
  const distanceKm = (Number(route.distance_m) / 1000).toLocaleString(
    locale === 'id' ? 'id-ID' : 'en-US',
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  );
  const elevation = route.elevation_gain_m
    ? `+${Math.round(route.elevation_gain_m)} m`
    : '';

  const path = `/routes/${route.id}`;
  const canonicalUrl = localeUrl(locale, path);
  const languages = {
    id: localeUrl('id', path),
    en: localeUrl('en', path),
    'x-default': localeUrl('id', path),
  };

  const cityPart = cityName ? `, ${cityName}` : '';
  const title = `${route.name}${cityPart} — GPS-Art Running Route`;
  const description = route.gpx_raw
    ? `GPS-art running route "${route.name}"${cityPart} — ${distanceKm} km${elevation ? `, elevation ${elevation}` : ''}. Browse the map, elevation profile, and download the GPX to run it yourself.`
    : title;

  const robots =
    route.status === 'pending' || route.status === 'rejected'
      ? { index: false, follow: false }
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
    robots,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('routeDetail');
  const tHome = await getTranslations('home');

  const route = await getRoute(id);

  if (!route) {
    notFound();
  }

  // Rejected routes are hidden from search and public discovery entirely.
  if (route.status === 'rejected') {
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
      ? hours > 0
        ? `${hours}j ${mins}m`
        : `${mins}m`
      : hours > 0
        ? `${hours}h ${mins}m`
        : `${mins}m`;

  return (
    <div className="space-y-8 pb-16">
      <ViewTracker routeId={route.id} />

      {/* Structured data: route as a CreativeWork + breadcrumb trail */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'CreativeWork',
              name: route.name,
              description: cityName
                ? `GPS-art running route ${route.name} in ${cityName}${countryName ? `, ${countryName}` : ''}.`
                : `GPS-art running route ${route.name}.`,
              url: localeUrl(locale, `/routes/${route.id}`),
              image: localeUrl(locale, `/routes/${route.id}/opengraph-image`),
              isAccessibleForFree: true,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Rute Unik',
                  item: localeUrl(locale, '/'),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: cityName || 'Routes',
                  item: localeUrl(locale, '/'),
                },
                {
                  '@type': 'ListItem',
                  position: 3,
                  name: route.name,
                  item: localeUrl(locale, `/routes/${route.id}`),
                },
              ],
            },
          ]),
        }}
      />

      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-ink/70 hover:text-ink inline-flex items-center gap-1 text-xs tracking-wider uppercase transition-colors"
        >
          ← {t('backToDirectory')}
        </Link>

        <Badge
          variant={
            route.status as 'official' | 'community' | 'pending' | 'rejected'
          }
        >
          {route.status === 'official' ? tHome('official') : tHome('community')}
        </Badge>
      </div>

      {/* Header Info */}
      <div className="space-y-1">
        <span className="font-data text-ink/60 text-xs font-semibold tracking-wider uppercase">
          {cityName}
          {countryName ? `, ${countryName}` : ''}
        </span>
        <h1 className="font-display text-ink text-3xl tracking-tight uppercase sm:text-4xl">
          {route.name}
        </h1>
      </div>

      {/* Main Content Grid: Map + Stats */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Interactive Route Map & Elevation Profile with Synchronized Playback */}
        <div className="space-y-6 lg:col-span-2">
          <RouteViewerSection
            coordinates={coordinates}
            gpxRaw={route.gpx_raw}
            distanceMeters={route.distance_m}
          />
        </div>

        {/* Right 1 Col: GPX Artwork Preview Box & Comprehensive Stats */}
        <div className="space-y-6">
          {/* GPX Artwork Preview Box (Prominent preview above stats) */}
          <Card className="space-y-3">
            <h3 className="font-display text-ink/70 text-xs tracking-wider uppercase">
              {t('shapePreview')}
            </h3>
            <div className="bg-paper/60 border-contour-tan/50 flex aspect-square w-full items-center justify-center rounded-[8px] border p-6">
              <div
                className="[&>svg]:stroke-ink flex h-full w-full items-center justify-center [&>svg]:h-full [&>svg]:max-h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
              />
            </div>
          </Card>

          <Card className="space-y-6">
            <h2 className="font-display text-ink border-contour-tan border-b pb-2 text-sm tracking-wider uppercase">
              {t('routeStats')}
            </h2>

            <div className="font-data grid grid-cols-2 gap-4">
              <div className="bg-paper/40 border-contour-tan/50 rounded-[6px] border p-3">
                <span className="text-ink/70 block text-[11px] tracking-wider uppercase">
                  {tHome('distance')}
                </span>
                <span className="font-display text-ink text-xl">
                  {distanceKm}
                </span>
                <span className="text-ink/70 ml-1 text-xs">km</span>
              </div>

              <div className="bg-paper/40 border-contour-tan/50 rounded-[6px] border p-3">
                <span className="text-ink/70 block text-[11px] tracking-wider uppercase">
                  {tHome('elevation')}
                </span>
                <span className="font-display text-ink text-xl">
                  {elevation}
                </span>
              </div>

              <div className="bg-paper/40 border-contour-tan/50 rounded-[6px] border p-3">
                <span className="text-ink/70 block text-[11px] tracking-wider uppercase">
                  {t('estPace')}
                </span>
                <span className="font-display text-ink text-xl">05:30</span>
                <span className="text-ink/70 ml-1 text-xs">/km</span>
              </div>

              <div className="bg-paper/40 border-contour-tan/50 rounded-[6px] border p-3">
                <span className="text-ink/70 block text-[11px] tracking-wider uppercase">
                  {t('estDuration')}
                </span>
                <span className="font-display text-ink text-xl">
                  ~{timeFormatted}
                </span>
              </div>
            </div>

            {/* Actions Menu */}
            <RouteActionsMenu
              routeId={route.id}
              routeName={route.name}
              cityName={cityName}
              distanceKm={distanceKm}
              elevationGain={elevation}
              thumbnailSvg={route.thumbnail_svg}
              coordinates={coordinates}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
