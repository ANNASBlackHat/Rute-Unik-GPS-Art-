import React from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { supabase } from '@/lib/supabase';
import { RouteGrid } from '@/components/directory/RouteGrid';

export const revalidate = 60;
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
      .select(`
        id,
        name,
        city_id,
        distance_m,
        elevation_gain_m,
        status,
        thumbnail_svg,
        gpx_raw,
        created_at,
        cities (
          name
        )
      `)
      .neq('status', 'rejected')
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
    created_at: r.created_at,
  }));

  // Sort: official/community first (by newest), pending at bottom (unverified)
  const statusOrder: Record<string, number> = { official: 0, community: 1, pending: 2 };
  const routes: RouteItem[] = [...rawRoutes].sort((a, b) => {
    const ao = statusOrder[a.status] ?? 2;
    const bo = statusOrder[b.status] ?? 2;
    return ao - bo;
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="text-center max-w-2xl mx-auto space-y-4 pt-4">
        <div className="inline-block px-3 py-1 bg-chalk border border-contour-tan rounded-[4px]">
          <span className="font-data text-[11px] uppercase tracking-wider text-moss font-bold">
            {tCommon('tagline')}
          </span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl tracking-tight text-ink uppercase leading-tight">
          {t('title')}
        </h1>
        <p className="text-base text-ink/80 font-body leading-relaxed">
          {t('subtitle')}
        </p>
      </section>

      {/* Directory & Catalog Grid */}
      <section className="space-y-4">
        <React.Suspense fallback={<div className="p-12 text-center text-xs font-data text-ink/50 uppercase tracking-wider">Loading Directory...</div>}>
          <RouteGrid initialRoutes={routes} cities={cities} />
        </React.Suspense>
      </section>

      {/* Design System Tokens — dev only (hidden in production) */}
      {process.env.NODE_ENV !== 'production' && (
        <section className="space-y-6 pt-10 border-t border-contour-tan">
          <h2 className="font-display text-xl uppercase tracking-tight text-ink">
            {tTokens('title')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <h3 className="font-display text-sm uppercase text-ink">
                {tTokens('paletteTitle')}
              </h3>
              <div className="space-y-2 font-data text-xs">
                <div className="flex items-center gap-3 p-2 bg-[#EDE8DC] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#EDE8DC] border border-ink/20 shrink-0" />
                  <span className="text-ink">{tTokens('colorPaper')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#F7F5EF] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#1F2A1E] shrink-0" />
                  <span className="text-ink">{tTokens('colorInk')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#F7F5EF] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#B83214] shrink-0" />
                  <span className="text-ink">{tTokens('colorTrailOrange')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#F7F5EF] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#5C6E4F] shrink-0" />
                  <span className="text-ink">{tTokens('colorMoss')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#F7F5EF] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#C9BFA6] shrink-0" />
                  <span className="text-ink">{tTokens('colorContourTan')}</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-[#F7F5EF] border border-contour-tan rounded-[4px]">
                  <div className="w-6 h-6 rounded bg-[#F7F5EF] border border-contour-tan shrink-0" />
                  <span className="text-ink">{tTokens('colorChalk')}</span>
                </div>
              </div>
            </Card>

            <Card className="space-y-4">
              <h3 className="font-display text-sm uppercase text-ink">
                {tTokens('typographyTitle')}
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-data text-ink/70 uppercase block">
                    Display (Archivo Black)
                  </span>
                  <p className="font-display text-lg uppercase">RUTE UNIK GPS ART</p>
                </div>
                <div>
                  <span className="text-xs font-data text-ink/70 uppercase block">
                    Data (JetBrains Mono)
                  </span>
                  <p className="font-data text-xs font-bold text-ink">{tTokens('sampleMetric')}</p>
                </div>
                <div>
                  <span className="text-xs font-data text-ink/70 uppercase block">Body (Inter)</span>
                  <p className="font-body text-sm text-ink">Flat paper surfaces, hairline borders, single orange accent.</p>
                </div>

                <div className="pt-2 border-t border-contour-tan space-y-2">
                  <span className="text-xs font-data text-ink/70 uppercase block">{tTokens('componentsTitle')}</span>
                  <div className="flex flex-wrap gap-2 items-center">
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
