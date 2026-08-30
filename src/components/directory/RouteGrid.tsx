'use client';

import React, { useState, useMemo } from 'react';
import { RouteItem, RouteCard } from './RouteCard';
import { CityFilter, CityOption } from './CityFilter';
import { useTranslations } from 'next-intl';

interface RouteGridProps {
  initialRoutes: RouteItem[];
  cities: CityOption[];
}

export function RouteGrid({ initialRoutes, cities }: RouteGridProps) {
  const t = useTranslations('home');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  // Compute route count per city
  const citiesWithCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const r of initialRoutes) {
      countMap.set(r.city_id, (countMap.get(r.city_id) || 0) + 1);
    }
    return cities.map((c) => ({
      ...c,
      count: countMap.get(c.id) || 0,
    }));
  }, [cities, initialRoutes]);

  const filteredRoutes = useMemo(() => {
    if (!selectedCityId) return initialRoutes;
    return initialRoutes.filter((r) => r.city_id === selectedCityId);
  }, [initialRoutes, selectedCityId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-contour-tan pb-4">
        <div className="min-w-0 flex-1">
          <CityFilter
            cities={citiesWithCounts}
            selectedCityId={selectedCityId}
            onSelectCity={setSelectedCityId}
            totalCount={initialRoutes.length}
          />
        </div>

        <span className="font-data text-xs text-ink/70 shrink-0">
          {filteredRoutes.length} {t('routesCount')}
        </span>
      </div>

      {filteredRoutes.length === 0 ? (
        <div className="paper-card p-12 text-center space-y-2">
          <p className="font-display text-base text-ink uppercase">
            {t('noRoutesFound')}
          </p>
          <p className="font-body text-xs text-ink/60">
            {t('noRoutesSubtitle')}
          </p>
        </div>
      ) : (
        <div
          id="routes-grid"
          data-testid="routes-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredRoutes.map((route) => (
            <RouteCard key={route.id} route={route} />
          ))}
        </div>
      )}
    </div>
  );
}
