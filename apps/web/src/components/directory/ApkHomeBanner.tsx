'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download } from 'lucide-react';
import { APK_DOWNLOAD_CONFIG } from '@/config/appDownload';
import { ApkDownloadModal } from '@/components/layout/ApkDownloadModal';

export function ApkHomeBanner() {
  const t = useTranslations('apkDownload');
  const [showModal, setShowModal] = useState(false);

  if (!APK_DOWNLOAD_CONFIG.isEnabled) return null;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-[6px] bg-chalk border border-contour-tan">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-6 h-6 rounded-[3px] bg-trail-orange/10 text-trail-orange text-xs border border-trail-orange/20 shrink-0 select-none">
            🤖
          </span>
          <p className="font-body text-xs text-ink/80 truncate sm:whitespace-normal">
            <span className="font-display font-bold uppercase tracking-tight text-ink mr-1">
              {t('homeBannerTitle')}:
            </span>
            <span className="text-ink/70">{t('homeBannerDesc')}</span>
          </p>
        </div>

        <button
          type="button"
          id="btn-home-open-apk-modal"
          onClick={() => setShowModal(true)}
          className="shrink-0 self-start sm:self-auto inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-[3px] bg-trail-orange text-chalk hover:bg-trail-orange/90 transition-colors cursor-pointer select-none"
        >
          <Download size={13} strokeWidth={2} />
          <span>{t('homeBannerBtn')}</span>
        </button>
      </div>

      <ApkDownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
