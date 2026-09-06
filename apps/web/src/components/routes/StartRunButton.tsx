'use client';

import React from 'react';
import { useRouter } from '@/i18n/routing';
import { PersonStanding } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function StartRunButton({ routeId }: { routeId: string }) {
  const t = useTranslations('routeDetail');
  const router = useRouter();

  const handleButtonClick = () => {
    fetch(`/api/routes/${routeId}/start`, { method: 'POST' }).catch(() => {});
    router.push(`/routes/${routeId}/run`);
  };

  return (
    <button
      type="button"
      id="btn-start-run"
      onClick={handleButtonClick}
      className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] bg-ink text-chalk hover:bg-moss transition-colors select-none cursor-pointer"
    >
      <PersonStanding size={16} strokeWidth={1.5} aria-hidden="true" /> {t('startRun')}
    </button>
  );
}

