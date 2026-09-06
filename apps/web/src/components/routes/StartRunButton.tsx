'use client';

import React, { useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { PersonStanding } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { APK_DOWNLOAD_CONFIG } from '@/config/appDownload';
import { ApkRunWarningModal } from '@/components/run/ApkRunWarningModal';

export function StartRunButton({ routeId }: { routeId: string }) {
  const t = useTranslations('routeDetail');
  const router = useRouter();
  const [showWarningModal, setShowWarningModal] = useState(false);

  const trackStart = () => {
    fetch(`/api/routes/${routeId}/start`, { method: 'POST' }).catch(() => {});
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (APK_DOWNLOAD_CONFIG.isEnabled) {
      e.preventDefault();
      setShowWarningModal(true);
    } else {
      trackStart();
      router.push(`/routes/${routeId}/run`);
    }
  };

  const handleProceedWeb = () => {
    setShowWarningModal(false);
    trackStart();
    router.push(`/routes/${routeId}/run`);
  };

  return (
    <>
      <button
        type="button"
        id="btn-start-run"
        onClick={handleButtonClick}
        className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] bg-ink text-chalk hover:bg-moss transition-colors select-none cursor-pointer"
      >
        <PersonStanding size={16} strokeWidth={1.5} aria-hidden="true" /> {t('startRun')}
      </button>

      <ApkRunWarningModal
        isOpen={showWarningModal}
        onClose={() => setShowWarningModal(false)}
        onProceedWeb={handleProceedWeb}
      />
    </>
  );
}

