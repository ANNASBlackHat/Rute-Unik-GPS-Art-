'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown } from 'lucide-react';

export type RouteSortOption = 'newest' | 'shortest' | 'longest' | 'popular';

interface RouteSortSelectProps {
  value: RouteSortOption;
  onChange: (option: RouteSortOption) => void;
  className?: string;
}

export function RouteSortSelect({
  value,
  onChange,
  className = '',
}: RouteSortSelectProps) {
  const t = useTranslations('home');

  return (
    <div className={`inline-flex items-center gap-1.5 font-data text-xs ${className}`}>
      <span className="text-ink/60 uppercase tracking-wider hidden sm:inline flex items-center gap-1">
        <ArrowUpDown size={12} strokeWidth={2} aria-hidden="true" />
        {t('sortBy')}:
      </span>
      <select
        id="route-sort-select"
        data-testid="route-sort-select"
        value={value}
        onChange={(e) => onChange(e.target.value as RouteSortOption)}
        className="px-2.5 py-1.5 bg-chalk border border-contour-tan rounded-[4px] font-data text-xs text-ink uppercase tracking-wider focus:outline-none focus:border-ink cursor-pointer transition-colors"
      >
        <option value="newest">{t('sortNewest')}</option>
        <option value="shortest">{t('sortShortest')}</option>
        <option value="longest">{t('sortLongest')}</option>
        <option value="popular">{t('sortPopular')}</option>
      </select>
    </div>
  );
}
