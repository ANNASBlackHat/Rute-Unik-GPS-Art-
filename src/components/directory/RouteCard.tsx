import React from 'react';
import { Link } from '@/i18n/routing';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useTranslations, useLocale } from 'next-intl';

export interface RouteItem {
  id: string;
  name: string;
  city_id: string;
  city_name?: string;
  distance_m: number;
  elevation_gain_m?: number | null;
  status: 'official' | 'community' | 'pending' | 'rejected';
  thumbnail_svg: string;
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

  return (
    <Link
      href={`/routes/${route.id}`}
      className="block group no-underline text-inherit"
    >
      <Card className="h-full flex flex-col justify-between hover:border-ink transition-colors cursor-pointer">
        <div>
          {/* Top meta row */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-data text-ink/70 uppercase tracking-wider font-semibold">
              {route.city_name || 'CITY'}
            </span>
            <Badge variant={route.status}>
              {route.status === 'official' ? t('official') : t('community')}
            </Badge>
          </div>

          {/* Predominant inline SVG linework preview (square aspect ratio) */}
          <div className="w-full aspect-square bg-paper/60 rounded-[8px] p-6 border border-contour-tan/50 flex items-center justify-center mb-4 group-hover:bg-paper/80 transition-colors">
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:stroke-ink"
              dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
            />
          </div>

          {/* Route Name in Archivo Black uppercase */}
          <h3 className="font-display text-lg tracking-tight uppercase text-ink group-hover:text-trail-orange transition-colors">
            {route.name}
          </h3>
        </div>

        {/* Hairline divider & bottom stat row in JetBrains Mono */}
        <div className="mt-4 pt-3 border-t border-contour-tan flex items-center justify-between text-[11px] font-data text-ink/80">
          <div>
            <span className="text-ink/50 text-[9px] block uppercase tracking-wider">
              {t('distance')}
            </span>
            <span className="font-bold">{distanceKm} km</span>
          </div>

          <div className="text-right">
            <span className="text-ink/50 text-[9px] block uppercase tracking-wider">
              {t('elevation')}
            </span>
            <span className="font-bold">{elevation}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
