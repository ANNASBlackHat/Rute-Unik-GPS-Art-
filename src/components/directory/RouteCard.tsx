import React from 'react';
import { Link } from '@/i18n/routing';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTranslations, useLocale } from 'next-intl';
import { Download } from 'lucide-react';
import { ElevationSparkline } from './ElevationSparkline';
import { type ShapeCategory } from '@/lib/shape-category';

export interface RouteItem {
  id: string;
  name: string;
  city_id: string;
  city_name?: string;
  distance_m: number;
  elevation_gain_m?: number | null;
  status: 'official' | 'community' | 'pending' | 'rejected';
  thumbnail_svg: string;
  shape_category?: ShapeCategory;
  elevation_points?: number[];
  download_count?: number;
  view_count?: number;
  share_count?: number;
  start_count?: number;
  created_at?: string;
}

interface RouteCardProps {
  route: RouteItem;
}

export function RouteCard({ route }: RouteCardProps) {
  const t = useTranslations('home');
  const locale = useLocale();

  const distanceKm = (route.distance_m / 1000).toLocaleString(
    locale === 'id' ? 'id-ID' : 'en-US',
    { minimumFractionDigits: 1, maximumFractionDigits: 1 }
  );
  const elevation = route.elevation_gain_m ? `+${Math.round(route.elevation_gain_m)} m` : '--';
  const isPending = route.status === 'pending';

  return (
    <Link
      href={`/routes/${route.id}`}
      className={`block group no-underline text-inherit ${isPending ? 'opacity-60 grayscale-[0.3]' : ''}`}
    >
      <Card
        className={`h-full flex flex-col justify-between transition-colors cursor-pointer ${
          isPending ? 'border-dashed bg-chalk/60 hover:border-ink/30' : 'hover:border-ink'
        }`}
      >
        <div>
          {/* Top meta row */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-data text-ink/70 uppercase tracking-wider font-semibold">
              {route.city_name || 'CITY'}
            </span>
            <Badge variant={isPending ? 'pending' : route.status}>
              {isPending
                ? locale === 'id'
                  ? 'Menunggu'
                  : 'Pending'
                : route.status === 'official'
                  ? t('official')
                  : t('community')}
            </Badge>
          </div>

          {/* Predominant inline SVG linework preview (square aspect ratio) */}
          <div
            className="w-full aspect-square bg-paper/60 rounded-[8px] p-6 border border-contour-tan/50 flex items-center justify-center mb-4 group-hover:bg-paper/80 transition-colors"
            role="img"
            aria-label={`${route.name} — ${route.city_name} shape preview, ${distanceKm} km`}
          >
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:stroke-ink"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
            />
          </div>

          {/* Miniature elevation profile sparkline (flat vs hilly at a glance) */}
          <ElevationSparkline points={route.elevation_points} className="mb-3" />

          {/* Route Name in Archivo Black uppercase */}
          <h2 className="font-display text-lg tracking-tight uppercase text-ink group-hover:text-trail-orange-text transition-colors">
            {route.name}
          </h2>
        </div>

        {/* Hairline divider & bottom stat row in JetBrains Mono */}
        <div className="mt-4 pt-3 border-t border-contour-tan flex items-center justify-between text-xs font-data text-ink">
          <div>
            <span className="text-ink/70 text-[11px] block uppercase tracking-wider">
              {t('distance')}
            </span>
            <span className="font-bold">{distanceKm} km</span>
          </div>

          <div className="text-center">
            <span className="text-ink/70 text-[11px] block uppercase tracking-wider">
              {t('downloads')}
            </span>
            <span className="font-bold inline-flex items-center gap-1">
              <Download size={11} strokeWidth={2.5} className="text-forest-moss" aria-hidden="true" />
              {route.download_count ?? 0}
            </span>
          </div>

          <div className="text-right">
            <span className="text-ink/70 text-[11px] block uppercase tracking-wider">
              {t('elevation')}
            </span>
            <span className="font-bold">{elevation}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
