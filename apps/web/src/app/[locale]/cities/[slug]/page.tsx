import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { supabase } from '@/lib/supabase';
import { RouteGrid } from '@/components/directory/RouteGrid';
import type { RouteItem } from '@/components/directory/RouteCard';
import type { CityOption } from '@/components/directory/CityFilter';
import { inferShapeCategory, type ShapeCategory } from '@/lib/shape-category';
import { extractElevationSamples } from '@/lib/geo';
import { citySlug, resolveCityBySlug, type CityRow } from '@/lib/city';
import { localeUrl } from '@/lib/site';

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams() {
  const { data } = await supabase.from('cities').select('name');
  const cities = (data as { name: string }[]) || [];
  return routing.locales.flatMap((locale) =>
    cities.map((c) => ({ locale, slug: citySlug(c.name) })),
  );
}

interface CityPageData {
  city: CityRow;
  cities: CityOption[];
  routes: RouteItem[];
}

const STATUS_PUBLISHED = ['official', 'community'];

async function getCityPageData(slug: string): Promise<CityPageData | null> {
  const citiesRes = await supabase
    .from('cities')
    .select('id, name, country')
    .order('name');
  const cityRows = (citiesRes.data || []) as unknown as CityRow[];
  const city = resolveCityBySlug(cityRows, slug);
  if (!city) return null;

  const routesRes = await supabase
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
    `,
    )
    .in('status', STATUS_PUBLISHED)
    .order('created_at', { ascending: false });

  const cities: CityOption[] = cityRows.map((c) => ({ id: c.id, name: c.name }));

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

  const routes: RouteItem[] = (
    (routesRes.data as unknown as RawRouteRow[]) || []
  )
    .filter((r) => r.city_id === city.id)
    .map((r) => ({
      id: r.id,
      name: r.name,
      city_id: r.city_id,
      city_name: r.cities?.name || city.name,
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

  return { city, cities, routes };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getCityPageData(slug);
  if (!data) return {};

  const { city, routes } = data;
  const tCommon = await getTranslations('common');
  const tCities = await getTranslations('cities');

  const path = `/cities/${citySlug(city.name)}`;
  const canonicalUrl = localeUrl(locale, path);
  const languages = {
    id: localeUrl('id', path),
    en: localeUrl('en', path),
    'x-default': localeUrl('id', path),
  };

  const title = tCities('title', { city: city.name });
  const description = tCities('description', {
    city: city.name,
    count: String(routes.length),
  });

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl, languages },
    openGraph: {
      title: `${tCommon('appName')} — ${title}`,
      description,
      url: canonicalUrl,
    },
    twitter: { title, description },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('cities');
  const tCommon = await getTranslations('common');

  const data = await getCityPageData(slug);
  if (!data) notFound();

  const { city, cities, routes } = data;
  const citySlugValue = citySlug(city.name);

  return (
    <div className="space-y-8 pb-16">
      {/* Structured data: CollectionPage + breadcrumb */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: t('title', { city: city.name }),
              url: localeUrl(locale, `/cities/${citySlugValue}`),
              inLanguage: locale,
            },
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: tCommon('appName'),
                  item: localeUrl(locale, '/'),
                },
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: city.name,
                  item: localeUrl(locale, `/cities/${citySlugValue}`),
                },
              ],
            },
          ]),
        }}
      />

      <div className="space-y-2 pt-4">
        <span className="font-data text-xs text-ink/60 uppercase tracking-wider font-semibold">
          {city.country || 'GPS-Art Running'}
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-ink uppercase tracking-tight">
          {t('title', { city: city.name })}
        </h1>
        <p className="text-sm text-ink/70 font-body">
          {t('description', { city: city.name, count: String(routes.length) })}
        </p>
      </div>

      <Suspense
        fallback={
          <div className="font-data text-ink/50 p-12 text-center text-xs tracking-wider uppercase">
            Loading Directory...
          </div>
        }
      >
        <RouteGrid initialRoutes={routes} cities={cities} citySlug={citySlugValue} />
      </Suspense>
    </div>
  );
}