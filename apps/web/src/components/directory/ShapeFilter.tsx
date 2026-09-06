'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { SHAPE_CATEGORIES, type ShapeCategory } from '@/lib/shape-category';

interface ShapeFilterProps {
  selectedShape: ShapeCategory | null;
  onSelectShape: (shape: ShapeCategory | null) => void;
  categoryCounts?: Record<ShapeCategory, number>;
}

export function ShapeFilter({
  selectedShape,
  onSelectShape,
  categoryCounts,
}: ShapeFilterProps) {
  const t = useTranslations('home');

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={t('shapeLabel')}
    >
      <button
        type="button"
        id="filter-shape-all"
        onClick={() => onSelectShape(null)}
        aria-pressed={selectedShape === null}
        className={`min-h-8 px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
          selectedShape === null
            ? 'bg-ink text-chalk border-ink font-bold'
            : 'bg-chalk text-ink border-contour-tan hover:border-ink'
        }`}
      >
        {t('shapeAll')}
      </button>

      {SHAPE_CATEGORIES.map((cat) => {
        const isSelected = selectedShape === cat.id;
        const count = categoryCounts ? categoryCounts[cat.id] : undefined;
        return (
          <button
            key={cat.id}
            type="button"
            id={`filter-shape-${cat.id}`}
            onClick={() => onSelectShape(isSelected ? null : cat.id)}
            aria-pressed={isSelected}
            className={`min-h-8 px-2.5 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
              isSelected
                ? 'bg-ink text-chalk border-ink font-bold'
                : 'bg-chalk text-ink border-contour-tan hover:border-ink'
            }`}
          >
            {t(cat.labelKey)} {count !== undefined ? `(${count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
