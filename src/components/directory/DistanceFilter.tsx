'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export type DistanceBucket = '<5' | '5-10' | '10-15' | '15+';

interface DistanceFilterProps {
  selectedBucket: DistanceBucket | null;
  onSelectBucket: (bucket: DistanceBucket | null) => void;
}

export function DistanceFilter({
  selectedBucket,
  onSelectBucket,
}: DistanceFilterProps) {
  const t = useTranslations('home');

  const buckets = [
    { id: '<5' as const, labelKey: 'distanceUnder5' as const },
    { id: '5-10' as const, labelKey: 'distance5to10' as const },
    { id: '10-15' as const, labelKey: 'distance10to15' as const },
    { id: '15+' as const, labelKey: 'distanceOver15' as const },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={t('distanceLabel')}
    >
      <button
        type="button"
        id="filter-distance-all"
        onClick={() => onSelectBucket(null)}
        aria-pressed={selectedBucket === null}
        className={`min-h-8 px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
          selectedBucket === null
            ? 'bg-ink text-chalk border-ink font-bold'
            : 'bg-chalk text-ink border-contour-tan hover:border-ink'
        }`}
      >
        {t('distanceAll')}
      </button>

      {buckets.map((b) => {
        const isSelected = selectedBucket === b.id;
        return (
          <button
            key={b.id}
            type="button"
            id={`filter-distance-${b.id}`}
            onClick={() => onSelectBucket(isSelected ? null : b.id)}
            aria-pressed={isSelected}
            className={`min-h-8 px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
              isSelected
                ? 'bg-ink text-chalk border-ink font-bold'
                : 'bg-chalk text-ink border-contour-tan hover:border-ink'
            }`}
          >
            {t(b.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
