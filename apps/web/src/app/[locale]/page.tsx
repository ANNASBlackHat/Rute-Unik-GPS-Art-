import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import { RouteGrid } from '@/components/directory/RouteGrid';
import { localeUrl } from '@/lib/site';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tHome = await getTranslations('home');
  const tCommon = await getTranslations('common');

  const homeUrl = localeUrl(locale, '/');
  const languages = {
    id: localeUrl('id', '/'),
    en: localeUrl('en', '/'),
    'x-default': localeUrl('id', '/'),
  };

  return {
    title: `${tHome('title')}`,
    description: tHome('subtitle'),
    alternates: {
      canonical: homeUrl,
      languages,
    },
    openGraph: {
      title: `${tCommon('appName')} — ${tHome('title')}`,
      description: tHome('subtitle'),
      url: homeUrl,
    },
  };
}
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RouteItem } from '@/components/directory/RouteCard';
import { CityOption } from '@/components/directory/CityFilter';
import { inferShapeCategory, type ShapeCategory } from '@/lib/shape-category';
import { extractElevationSamples } from '@/lib/geo';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tCommon = await getTranslations('common');
  const tTokens = await getTranslations('designTokens');

  // Fetch cities and routes from Supabase - hide rejected, pending at bottom
  const [citiesRes, routesRes] = await Promise.all([
    supabase.from('cities').select('id, name, country').order('name'),
    supabase
      .from('routes')
      .select(
        `
        id,
        name,
        city_id,
        distance_m,
        elevation_gain_m,
        status,
        thumbnail_svg,
        gpx_raw,
        download_count,
        view_count,
        share_count,
        start_count,
        created_at,
        cities (
          name
        )
      `
      )
      .in('status', ['official', 'community'])
      .order('created_at', { ascending: false }),
  ]);

  const cities: CityOption[] = (citiesRes.data || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  interface RawRouteRow {
    id: string;
    name: string;
    city_id: string;
    distance_m: number;
    elevation_gain_m: number | null;
    status: RouteItem['status'];
    thumbnail_svg: string;
    gpx_raw?: string | null;
    download_count?: number | null;
    view_count?: number | null;
    share_count?: number | null;
    start_count?: number | null;
    shape_category?: ShapeCategory | null;
    created_at: string;
    cities: { name?: string } | null;
  }

  const rawRoutes: RouteItem[] = (
    (routesRes.data as unknown as RawRouteRow[]) || []
  ).map((r) => ({
    id: r.id,
    name: r.name,
    city_id: r.city_id,
    city_name: r.cities?.name || 'Unknown',
    distance_m: Number(r.distance_m),
    elevation_gain_m: r.elevation_gain_m ? Number(r.elevation_gain_m) : null,
    status: r.status,
    thumbnail_svg: r.thumbnail_svg,
    shape_category: r.shape_category || inferShapeCategory(r.name),
    elevation_points: extractElevationSamples(r.gpx_raw, 20),
    download_count: Number(r.download_count || 0),
    view_count: Number(r.view_count || 0),
    share_count: Number(r.share_count || 0),
    start_count: Number(r.start_count || 0),
    created_at: r.created_at,
  }));

  // Sort: official/community first (by newest), pending at bottom (unverified)
  const statusOrder: Record<string, number> = {
    official: 0,
    community: 1,
    pending: 2,
  };
  const routes: RouteItem[] = [...rawRoutes].sort((a, b) => {
    const ao = statusOrder[a.status] ?? 2;
    const bo = statusOrder[b.status] ?? 2;
    return ao - bo;
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Structured data: website */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Rute Unik',
            url: localeUrl(locale, '/'),
            description: t('subtitle'),
            inLanguage: locale,
          }),
        }}
      />

      {/* Hero Section */}
      <section className="mx-auto max-w-2xl space-y-4 pt-4 text-center">
        <div className="bg-chalk border-contour-tan inline-block rounded-[4px] border px-3 py-1">
          <span className="font-data text-moss text-[11px] font-bold tracking-wider uppercase">
            {tCommon('tagline')}
          </span>
        </div>

        <h1 className="font-display text-ink text-3xl leading-tight tracking-tight uppercase sm:text-4xl">
          {t('title')}
        </h1>
        <p className="text-ink/80 font-body text-base leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      {/* Directory & Catalog Grid */}
      <section className="space-y-4">
        <React.Suspense
          fallback={
            <div className="font-data text-ink/50 p-12 text-center text-xs tracking-wider uppercase">
              Loading Directory...
            </div>
          }
        >
          <RouteGrid initialRoutes={routes} cities={cities} />
        </React.Suspense>
      </section>

      {/* Design System Tokens — dev only (hidden in production) */}
      {process.env.NODE_ENV !== 'production' && (
        <section className="border-contour-tan space-y-6 border-t pt-10">
          <h2 className="font-display text-ink text-xl tracking-tight uppercase">
            {tTokens('title')}
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="space-y-4">
              <h3 className="font-display text-ink text-sm uppercase">
                {tTokens('paletteTitle')}
              </h3>
              <div className="font-data space-y-2 text-xs">
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#EDE8DC] p-2">
                  <div className="border-ink/20 h-6 w-6 shrink-0 rounded border bg-[#EDE8DC]" />
                  <span className="text-ink">{tTokens('colorPaper')}</span>
                </div>
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#F7F5EF] p-2">
                  <div className="h-6 w-6 shrink-0 rounded bg-[#1F2A1E]" />
                  <span className="text-ink">{tTokens('colorInk')}</span>
                </div>
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#F7F5EF] p-2">
                  <div className="h-6 w-6 shrink-0 rounded bg-[#B83214]" />
                  <span className="text-ink">
                    {tTokens('colorTrailOrange')}
                  </span>
                </div>
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#F7F5EF] p-2">
                  <div className="h-6 w-6 shrink-0 rounded bg-[#5C6E4F]" />
                  <span className="text-ink">{tTokens('colorMoss')}</span>
                </div>
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#F7F5EF] p-2">
                  <div className="h-6 w-6 shrink-0 rounded bg-[#C9BFA6]" />
                  <span className="text-ink">{tTokens('colorContourTan')}</span>
                </div>
                <div className="border-contour-tan flex items-center gap-3 rounded-[4px] border bg-[#F7F5EF] p-2">
                  <div className="border-contour-tan h-6 w-6 shrink-0 rounded border bg-[#F7F5EF]" />
                  <span className="text-ink">{tTokens('colorChalk')}</span>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="font-display text-ink text-sm uppercase">
                {tTokens('typographyTitle')}
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="font-data text-ink/70 block text-xs uppercase">
                    Display (Archivo Black)
                  </span>
                  <p className="font-display text-lg uppercase">
                    RUTE UNIK GPS ART
                  </p>
                </div>
                <div>
                  <span className="font-data text-ink/70 block text-xs uppercase">
                    Data (JetBrains Mono)
                  </span>
                  <p className="font-data text-ink text-xs font-bold">
                    {tTokens('sampleMetric')}
                  </p>
                </div>
                <div>
                  <span className="font-data text-ink/70 block text-xs uppercase">
                    Body (Inter)
                  </span>
                  <p className="font-body text-ink text-sm">
                    Flat paper surfaces, hairline borders, single orange accent.
                  </p>
                </div>

                <div className="border-contour-tan space-y-2 border-t pt-2">
                  <span className="font-data text-ink/70 block text-xs uppercase">
                    {tTokens('componentsTitle')}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="primary">Primary CTA</Button>
                    <Button variant="secondary">Secondary Button</Button>
                    <Badge variant="official">Official</Badge>
                    <Badge variant="community">Community</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
