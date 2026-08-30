'use client';

import React from 'react';
import { Link } from '@/i18n/routing';
import { PersonStanding } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function StartRunButton({ routeId }: { routeId: string }) {
  const t = useTranslations('routeDetail');
  const handleClick = () => {
    fetch(`/api/routes/${routeId}/start`, { method: 'POST' }).catch(() => {});
  };
  return (
    <Link
      href={`/routes/${routeId}/run`}
      onClick={handleClick}
      className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] bg-trail-orange text-chalk hover:bg-[#d44820] transition-colors select-none"
    >
      <PersonStanding size={16} strokeWidth={1.5} aria-hidden="true" /> {t('startRun')}
    </Link>
  );
}
