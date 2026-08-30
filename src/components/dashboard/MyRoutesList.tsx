'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Link } from '@/i18n/routing';

export interface MyRouteItem {
  id: string;
  name: string;
  city_name: string;
  distance_m: number;
  elevation_gain_m: number | null;
  status: 'pending' | 'community' | 'official' | 'rejected';
  thumbnail_svg: string;
  created_at: string;
}

export function MyRoutesList({ routes }: { routes: MyRouteItem[] }) {
  const t = useTranslations('dashboard');

  const getStatusBadge = (status: MyRouteItem['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span
            data-testid="status-badge-pending"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-contour-tan bg-paper text-ink font-data text-[10px] font-bold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-contour-tan inline-block animate-pulse" />
            {t('statusPending')}
          </span>
        );
      case 'official':
        return <Badge variant="official">{t('statusOfficial')}</Badge>;
      case 'community':
        return <Badge variant="community">{t('statusCommunity')}</Badge>;
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[3px] border border-red-400/40 text-red-700 font-data text-[10px] font-bold uppercase tracking-wider">
            {t('statusRejected')}
          </span>
        );
      default:
        return null;
    }
  };

  if (routes.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-12 h-12 mx-auto rounded-[4px] bg-paper border border-contour-tan flex items-center justify-center text-xl">
          🏃
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-lg uppercase text-ink">
            {t('noUploadsYet')}
          </h2>
          <p className="font-body text-xs text-ink/70">
            {t('noUploadsSubtitle')}
          </p>
        </div>
        <div>
          <Link
            href="/upload"
            className="inline-block px-5 py-2 bg-trail-orange text-chalk rounded-[4px] font-display text-xs uppercase tracking-wider hover:bg-trail-orange/90 transition-colors"
          >
            {t('uploadFirstRouteCta')}
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {routes.map((route) => {
        const distanceKm = (route.distance_m / 1000).toFixed(2);
        const elevation = route.elevation_gain_m
          ? `+${Math.round(route.elevation_gain_m)} m`
          : '—';

        return (
          <Card
            key={route.id}
            data-testid="my-route-card"
            className="p-4 space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Header: City & Status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-data text-[11px] text-ink/60 uppercase tracking-wider font-semibold truncate">
                  {route.city_name}
                </span>
                {getStatusBadge(route.status)}
              </div>

              {/* Square Thumbnail SVG */}
              <div className="aspect-square bg-paper border border-contour-tan rounded-[6px] p-4 flex items-center justify-center overflow-hidden">
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: route.thumbnail_svg }}
                />
              </div>

              {/* Route Name */}
              <h3 className="font-display text-base text-ink uppercase tracking-tight line-clamp-1">
                {route.name}
              </h3>
            </div>

            {/* Bottom Stats */}
            <div className="pt-2 border-t border-contour-tan flex items-center justify-between font-data text-xs text-ink">
              <div>
                <span className="text-[9px] text-ink/50 block uppercase">
                  {distanceKm} km
                </span>
              </div>
              <div>
                <span className="text-[9px] text-ink/50 block uppercase">
                  {elevation}
                </span>
              </div>
              <div>
                <Link
                  href={`/routes/${route.id}`}
                  className="text-xs text-trail-orange font-bold uppercase hover:underline"
                >
                  {t('view')} →
                </Link>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
