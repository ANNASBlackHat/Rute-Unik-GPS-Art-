'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

export interface CityOption {
  id: string;
  name: string;
  count?: number;
}

interface CityFilterProps {
  cities: CityOption[];
  selectedCityId: string | null;
  onSelectCity: (cityId: string | null) => void;
  totalCount: number;
}

export function CityFilter({
  cities,
  selectedCityId,
  onSelectCity,
  totalCount,
}: CityFilterProps) {
  const t = useTranslations('home');

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t('selectCity')}
    >
      <button
        type="button"
        id="filter-all-cities"
        data-city="all"
        onClick={() => onSelectCity(null)}
        className={`px-3 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
          selectedCityId === null
            ? 'bg-ink text-chalk border-ink font-bold'
            : 'bg-chalk text-ink border-contour-tan hover:border-ink'
        }`}
      >
        {t('allCities')} ({totalCount})
      </button>

      {cities.map((city) => {
        const isSelected = selectedCityId === city.id;
        return (
          <button
            key={city.id}
            type="button"
            id={`filter-city-${city.name.toLowerCase()}`}
            data-city={city.name.toLowerCase()}
            onClick={() => onSelectCity(city.id)}
            className={`px-3 py-1.5 rounded-[4px] font-data text-xs uppercase tracking-wider transition-colors border select-none cursor-pointer ${
              isSelected
                ? 'bg-ink text-chalk border-ink font-bold'
                : 'bg-chalk text-ink border-contour-tan hover:border-ink'
            }`}
          >
            {city.name} {city.count !== undefined ? `(${city.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}
