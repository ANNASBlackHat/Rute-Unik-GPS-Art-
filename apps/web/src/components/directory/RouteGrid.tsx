'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { RouteItem, RouteCard } from './RouteCard';
import { CityFilter, CityOption } from './CityFilter';
import { ShapeSelect } from './ShapeSelect';
import { DistanceSelect } from './DistanceSelect';
import { RouteSearchBar } from './RouteSearchBar';
import { RouteSortSelect } from './RouteSortSelect';
import { SurpriseMeButton } from './SurpriseMeButton';
import { useRouteFilters } from '@/hooks/useRouteFilters';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { ShapeCategory } from '@/lib/shape-category';
import { citySlug } from '@/lib/city';

interface RouteGridProps {
  initialRoutes: RouteItem[];
  cities: CityOption[];
  /** When set, the city is part of the URL path (e.g. /cities/[slug]).
   *  City switching then navigates between path-based pages and the city is
   *  not written to a ?city= query param. */
  citySlug?: string;
}

export function RouteGrid({ initialRoutes, cities, citySlug: citySlugProp }: RouteGridProps) {
  const t = useTranslations('home');
  const router = useRouter();
  const cityInPath = Boolean(citySlugProp);
  const { filters, updateFilters, clearAllFilters, hasActiveFilters } =
    useRouteFilters({ cityInPath });

  const searchParams = useSearchParams();

  // Active cities with counts (> 0 only)
  const citiesWithCounts = useMemo(() => {
    const countMap = new Map<string, number>();
    for (const r of initialRoutes) {
      countMap.set(r.city_id, (countMap.get(r.city_id) || 0) + 1);
    }
    return cities
      .map((c) => ({
        ...c,
        count: countMap.get(c.id) || 0,
      }))
      .filter((c) => (c.count || 0) > 0);
  }, [cities, initialRoutes]);

  // Shape category counts across catalog
  const categoryCounts = useMemo(() => {
    const counts: Record<ShapeCategory, number> = {
      animal: 0,
      object: 0,
      symbol: 0,
      letter_number: 0,
      abstract: 0,
    };
    for (const r of initialRoutes) {
      if (r.shape_category && counts[r.shape_category] !== undefined) {
        counts[r.shape_category]++;
      }
    }
    return counts;
  }, [initialRoutes]);

  // Resolve selectedCityId. In path mode it comes from the citySlug prop;
  // otherwise from the URL ?city= param (supports both UUID and lowercase name).
  const selectedCityId = useMemo(() => {
    if (cityInPath && citySlugProp) {
      const matchBySlug = citiesWithCounts.find(
        (c) => citySlug(c.name) === citySlugProp.toLowerCase(),
      );
      if (matchBySlug) return matchBySlug.id;
      const matchByName = citiesWithCounts.find(
        (c) => c.name.toLowerCase() === citySlugProp.toLowerCase(),
      );
      return matchByName ? matchByName.id : citySlugProp;
    }

    if (!filters.city) return null;
    const matchById = citiesWithCounts.find((c) => c.id === filters.city);
    if (matchById) return matchById.id;
    const matchByName = citiesWithCounts.find(
      (c) => c.name.toLowerCase() === filters.city?.toLowerCase(),
    );
    return matchByName ? matchByName.id : filters.city;
  }, [filters.city, citiesWithCounts, cityInPath, citySlugProp]);

  const selectedCityObj = useMemo(() => {
    if (!selectedCityId) return null;
    return citiesWithCounts.find((c) => c.id === selectedCityId) || null;
  }, [selectedCityId, citiesWithCounts]);

  const handleSelectCity = (cityId: string | null) => {
    const city = cityId
      ? citiesWithCounts.find((c) => c.id === cityId) || null
      : null;

    // In path mode, switching city navigates between /cities/[slug] pages,
    // preserving any currently active query filters.
    if (cityInPath) {
      const current = new URLSearchParams(searchParams.toString());
      current.delete('city'); // city lives in the path, never in the query
      const qs = current.toString();
      const target = city ? `/cities/${citySlug(city.name)}` : '/';
      router.push(qs ? `${target}?${qs}` : target, { scroll: false });
      return;
    }

    if (!cityId) {
      updateFilters({ city: null });
      return;
    }
    updateFilters({ city: city ? city.name.toLowerCase() : cityId });
  };

  // Filtered & Sorted Routes
  const filteredRoutes = useMemo(() => {
    let result = initialRoutes;

    // 1. City Filter
    if (selectedCityId) {
      result = result.filter(
        (r) =>
          r.city_id === selectedCityId ||
          r.city_name?.toLowerCase() === filters.city?.toLowerCase()
      );
    }

    // 2. Distance Filter
    if (filters.distance) {
      switch (filters.distance) {
        case '<5':
          result = result.filter((r) => r.distance_m < 5000);
          break;
        case '5-10':
          result = result.filter(
            (r) => r.distance_m >= 5000 && r.distance_m <= 10000
          );
          break;
        case '10-15':
          result = result.filter(
            (r) => r.distance_m >= 10000 && r.distance_m <= 15000
          );
          break;
        case '15+':
          result = result.filter((r) => r.distance_m >= 15000);
          break;
      }
    }

    // 3. Shape Filter (null or 'all' matches all shapes)
    if (filters.shape) {
      result = result.filter((r) => r.shape_category === filters.shape);
    }

    // 4. Search Filter (by title or city)
    if (filters.q.trim()) {
      const q = filters.q.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.city_name?.toLowerCase().includes(q)
      );
    }

    // 5. Sorting
    const sorted = [...result];
    switch (filters.sort) {
      case 'shortest':
        sorted.sort((a, b) => a.distance_m - b.distance_m);
        break;
      case 'longest':
        sorted.sort((a, b) => b.distance_m - a.distance_m);
        break;
      case 'popular':
        sorted.sort((a, b) => {
          const scoreA =
            (a.download_count || 0) * 3 +
            (a.start_count || 0) * 4 +
            (a.share_count || 0) * 5 +
            (a.view_count || 0);
          const scoreB =
            (b.download_count || 0) * 3 +
            (b.start_count || 0) * 4 +
            (b.share_count || 0) * 5 +
            (b.view_count || 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          if ((b.download_count || 0) !== (a.download_count || 0)) {
            return (b.download_count || 0) - (a.download_count || 0);
          }
          return (b.view_count || 0) - (a.view_count || 0);
        });
        break;
      case 'newest':
      default: {
        const statusOrder: Record<string, number> = {
          official: 0,
          community: 1,
          pending: 2,
        };
        sorted.sort((a, b) => {
          const ao = statusOrder[a.status] ?? 2;
          const bo = statusOrder[b.status] ?? 2;
          if (ao !== bo) return ao - bo;
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
        });
        break;
      }
    }

    return sorted;
  }, [initialRoutes, selectedCityId, filters]);

  return (
    <div className="space-y-4">
      {/* 1. Search Bar & Dropdown Filters Row */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
        <div className="flex-1 max-w-lg">
          <RouteSearchBar
            value={filters.q}
            onChange={(q) => updateFilters({ q })}
          />
        </div>

        {/* Dropdowns + Action */}
        <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end">
          <ShapeSelect
            value={filters.shape}
            onChange={(shape) => updateFilters({ shape })}
            categoryCounts={categoryCounts}
          />
          <DistanceSelect
            value={filters.distance}
            onChange={(distance) => updateFilters({ distance })}
          />
          <RouteSortSelect
            value={filters.sort}
            onChange={(sort) => updateFilters({ sort })}
          />
          <SurpriseMeButton
            candidates={filteredRoutes}
            allRoutes={initialRoutes}
          />
        </div>
      </div>

      {/* 2. City Chips Row (Primary geographic scan with route counts) */}
      <div className="pt-1 pb-1">
        <CityFilter
          cities={citiesWithCounts}
          selectedCityId={selectedCityId}
          onSelectCity={handleSelectCity}
          totalCount={initialRoutes.length}
        />
      </div>

      {/* 3. Results Header & Active Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-contour-tan pb-2.5 text-xs font-data text-ink/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-ink text-sm">
            {filteredRoutes.length} {t('routesCount')}
          </span>

          {/* Active Filter Badges with 1-click removal (city pill only in query mode) */}
          {selectedCityObj && !cityInPath && (
            <button
              type="button"
              onClick={() => updateFilters({ city: null })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-paper border border-contour-tan text-ink text-[11px] hover:border-ink cursor-pointer transition-colors"
              title="Remove city filter"
            >
              <span>City: {selectedCityObj.name}</span>
              <X size={11} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {filters.shape && (
            <button
              type="button"
              onClick={() => updateFilters({ shape: null })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-paper border border-contour-tan text-ink text-[11px] hover:border-ink cursor-pointer transition-colors"
              title="Remove shape filter"
            >
              <span>
                Shape:{' '}
                {filters.shape === 'animal'
                  ? t('shapeAnimal')
                  : filters.shape === 'object'
                  ? t('shapeObject')
                  : filters.shape === 'symbol'
                  ? t('shapeSymbol')
                  : filters.shape === 'letter_number'
                  ? t('shapeLetterNumber')
                  : t('shapeAbstract')}
              </span>
              <X size={11} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {filters.distance && (
            <button
              type="button"
              onClick={() => updateFilters({ distance: null })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-paper border border-contour-tan text-ink text-[11px] hover:border-ink cursor-pointer transition-colors"
              title="Remove distance filter"
            >
              <span>Distance: {filters.distance} km</span>
              <X size={11} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {filters.q.trim() && (
            <button
              type="button"
              onClick={() => updateFilters({ q: '' })}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-paper border border-contour-tan text-ink text-[11px] hover:border-ink cursor-pointer transition-colors"
              title="Clear search query"
            >
              <span>&quot;{filters.q.trim()}&quot;</span>
              <X size={11} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              id="btn-clear-filters"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] bg-chalk border border-contour-tan text-ink/80 hover:text-ink hover:border-ink cursor-pointer transition-colors font-semibold"
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
              <span>{t('clearFilters')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Routes Grid Display */}
      {filteredRoutes.length === 0 ? (
        <div className="paper-card p-12 text-center space-y-3 bg-chalk rounded-[8px] border border-contour-tan">
          <p className="font-display text-base text-ink uppercase">
            {t('noRoutesFound')}
          </p>
          <p className="font-body text-xs text-ink/60">
            {t('noRoutesSubtitle')}
          </p>
          {hasActiveFilters && (
            <div className="pt-2">
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 bg-ink text-chalk rounded-[4px] font-display text-xs uppercase tracking-wider hover:bg-ink/80 transition-colors cursor-pointer"
              >
                {t('clearFilters')}
              </button>
            </div>
          )}
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
