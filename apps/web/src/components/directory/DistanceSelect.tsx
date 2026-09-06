'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Ruler } from 'lucide-react';
import { DistanceBucket } from './DistanceFilter';

interface DistanceSelectProps {
  value: DistanceBucket | null;
  onChange: (bucket: DistanceBucket | null) => void;
  className?: string;
}

export function DistanceSelect({
  value,
  onChange,
  className = '',
}: DistanceSelectProps) {
  const t = useTranslations('home');

  const buckets = [
    { id: '<5' as const, labelKey: 'distanceUnder5' as const },
    { id: '5-10' as const, labelKey: 'distance5to10' as const },
    { id: '10-15' as const, labelKey: 'distance10to15' as const },
    { id: '15+' as const, labelKey: 'distanceOver15' as const },
  ];

  return (
    <div className={`inline-flex items-center gap-1.5 font-data text-xs ${className}`}>
      <span className="text-ink/60 uppercase tracking-wider hidden lg:inline flex items-center gap-1">
        <Ruler size={12} strokeWidth={2} aria-hidden="true" />
        {t('distanceLabel')}:
      </span>
      <select
        id="route-distance-select"
        data-testid="route-distance-select"
        value={value || 'all'}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'all' ? null : (val as DistanceBucket));
        }}
        className={`px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider focus:outline-none focus:border-ink cursor-pointer transition-colors border ${
          value
            ? 'bg-ink text-chalk border-ink font-bold'
            : 'bg-chalk text-ink border-contour-tan hover:border-ink'
        }`}
      >
        <option value="all">{t('distanceAll')}</option>
        {buckets.map((b) => (
          <option key={b.id} value={b.id}>
            {t(b.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}
