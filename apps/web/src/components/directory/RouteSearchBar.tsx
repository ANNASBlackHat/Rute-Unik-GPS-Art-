'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

interface RouteSearchBarProps {
  value: string;
  onChange: (query: string) => void;
  className?: string;
}

export function RouteSearchBar({
  value,
  onChange,
  className = '',
}: RouteSearchBarProps) {
  const t = useTranslations('home');
  const [internalValue, setInternalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setInternalValue(value);
  }

  // 300ms debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [internalValue, value, onChange]);

  const handleClear = () => {
    setInternalValue('');
    onChange('');
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3 text-ink/50 pointer-events-none flex items-center">
        <Search size={15} strokeWidth={2} aria-hidden="true" />
      </div>

      <input
        type="text"
        id="route-search-input"
        data-testid="route-search-input"
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={t('searchPlaceholder')}
        className="w-full pl-9 pr-8 py-2 bg-chalk border border-contour-tan rounded-[4px] font-data text-xs text-ink placeholder:text-ink/40 focus:outline-none focus:border-ink transition-colors"
      />

      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search query"
          className="absolute right-2.5 text-ink/50 hover:text-ink transition-colors cursor-pointer p-0.5"
        >
          <X size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
