'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { useCallback, useMemo } from 'react';
import { DistanceBucket } from '@/components/directory/DistanceFilter';
import { ShapeCategory } from '@/lib/shape-category';
import { RouteSortOption } from '@/components/directory/RouteSortSelect';

export interface RouteFilterState {
  city: string | null;
  distance: DistanceBucket | null;
  shape: ShapeCategory | null;
  q: string;
  sort: RouteSortOption;
}

export function useRouteFilters(options?: { cityInPath?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cityInPath = Boolean(options?.cityInPath);

  const filters: RouteFilterState = useMemo(() => {
    const city = searchParams.get('city') || null;
    const rawDist = searchParams.get('distance');
    let distance: DistanceBucket | null = null;
    if (rawDist) {
      const clean = rawDist.trim().replace(/plus$/i, '+').replace(/\s+/g, '+');
      if (['<5', '5-10', '10-15', '15+'].includes(clean)) {
        distance = clean as DistanceBucket;
      }
    }

    const shapeParam = searchParams.get('shape');
    const shape = (
      ['animal', 'object', 'symbol', 'letter_number', 'abstract'].includes(
        shapeParam || ''
      )
        ? shapeParam
        : null
    ) as ShapeCategory | null;

    const q = searchParams.get('q') || '';
    const sortParam = searchParams.get('sort');
    const sort = (
      ['newest', 'shortest', 'longest', 'popular'].includes(sortParam || '')
        ? sortParam
        : 'newest'
    ) as RouteSortOption;

    return { city, distance, shape, q, sort };
  }, [searchParams]);

  const updateFilters = useCallback(
    (updates: Partial<RouteFilterState>) => {
      const current = new URLSearchParams(searchParams.toString());

      const next = { ...filters, ...updates };

      // Update City (only when city is a query param; when the city lives in
      // the path, e.g. /cities/[slug], navigation to another city is handled
      // by RouteGrid via router.push, and no city= param is used).
      if (!cityInPath) {
        if (next.city) {
          current.set('city', next.city);
        } else {
          current.delete('city');
        }
      }

      // Update Distance
      if (next.distance) {
        current.set('distance', next.distance);
      } else {
        current.delete('distance');
      }

      // Update Shape
      if (next.shape) {
        current.set('shape', next.shape);
      } else {
        current.delete('shape');
      }

      // Update Search
      const trimmedQ = next.q.trim();
      if (trimmedQ) {
        current.set('q', trimmedQ);
      } else {
        current.delete('q');
      }

      // Update Sort
      if (next.sort && next.sort !== 'newest') {
        current.set('sort', next.sort);
      } else {
        current.delete('sort');
      }

      const queryString = current.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [filters, pathname, router, searchParams, cityInPath]
  );

  const clearAllFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters = Boolean(
    filters.city ||
      filters.distance ||
      filters.shape ||
      filters.q ||
      filters.sort !== 'newest'
  );

  return {
    filters,
    updateFilters,
    clearAllFilters,
    hasActiveFilters,
  };
}
