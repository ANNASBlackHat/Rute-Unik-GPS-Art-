'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { RouteItem } from './RouteCard';

interface SurpriseMeButtonProps {
  candidates: RouteItem[];
  allRoutes: RouteItem[];
  className?: string;
}

export function SurpriseMeButton({
  candidates,
  allRoutes,
  className = '',
}: SurpriseMeButtonProps) {
  const t = useTranslations('home');
  const router = useRouter();

  const handleSurpriseMe = () => {
    // Prefer filtered candidate set; fallback to allRoutes if candidates empty
    const pool = candidates.length > 0 ? candidates : allRoutes;
    if (pool.length === 0) return;

    // Prefer official routes if available in pool, otherwise pick any
    const officialPool = pool.filter((r) => r.status === 'official');
    const targetPool = officialPool.length > 0 && Math.random() < 0.7 ? officialPool : pool;

    const randomIndex = Math.floor(Math.random() * targetPool.length);
    const chosen = targetPool[randomIndex];
    router.push(`/routes/${chosen.id}`);
  };

  return (
    <button
      type="button"
      id="btn-surprise-me"
      data-testid="btn-surprise-me"
      onClick={handleSurpriseMe}
      className={`min-h-9 px-3.5 py-1.5 bg-chalk text-ink border border-contour-tan rounded-[4px] font-display text-xs uppercase tracking-wider hover:border-ink hover:text-trail-orange-text transition-colors select-none cursor-pointer inline-flex items-center gap-1.5 shadow-sm ${className}`}
      title={t('surpriseMe')}
    >
      <Sparkles size={14} strokeWidth={2} className="text-trail-orange" aria-hidden="true" />
      <span>{t('surpriseMe')}</span>
    </button>
  );
}
