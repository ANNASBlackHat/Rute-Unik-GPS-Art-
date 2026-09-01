'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Shapes } from 'lucide-react';
import { SHAPE_CATEGORIES, type ShapeCategory } from '@/lib/shape-category';

interface ShapeSelectProps {
  value: ShapeCategory | null;
  onChange: (shape: ShapeCategory | null) => void;
  categoryCounts?: Record<ShapeCategory, number>;
  className?: string;
}

export function ShapeSelect({
  value,
  onChange,
  categoryCounts,
  className = '',
}: ShapeSelectProps) {
  const t = useTranslations('home');

  return (
    <div className={`inline-flex items-center gap-1.5 font-data text-xs ${className}`}>
      <span className="text-ink/60 uppercase tracking-wider hidden lg:inline flex items-center gap-1">
        <Shapes size={12} strokeWidth={2} aria-hidden="true" />
        {t('shapeLabel')}:
      </span>
      <select
        id="route-shape-select"
        data-testid="route-shape-select"
        value={value || 'all'}
        onChange={(e) => {
          const val = e.target.value;
          onChange(val === 'all' ? null : (val as ShapeCategory));
        }}
        className={`px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider focus:outline-none focus:border-ink cursor-pointer transition-colors border ${
          value
            ? 'bg-ink text-chalk border-ink font-bold'
            : 'bg-chalk text-ink border-contour-tan hover:border-ink'
        }`}
      >
        <option value="all">{t('shapeAll')}</option>
        {SHAPE_CATEGORIES.map((cat) => {
          const count = categoryCounts ? categoryCounts[cat.id] : undefined;
          return (
            <option key={cat.id} value={cat.id}>
              {t(cat.labelKey)} {count !== undefined ? `(${count})` : ''}
            </option>
          );
        })}
      </select>
    </div>
  );
}
