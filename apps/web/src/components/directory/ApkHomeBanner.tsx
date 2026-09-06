'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Smartphone, Download, CheckCircle2, ShieldAlert } from 'lucide-react';
import { APK_DOWNLOAD_CONFIG } from '@/config/appDownload';
import { ApkDownloadModal } from '@/components/layout/ApkDownloadModal';

export function ApkHomeBanner() {
  const t = useTranslations('apkDownload');
  const [showModal, setShowModal] = useState(false);

  if (!APK_DOWNLOAD_CONFIG.isEnabled) return null;

  return (
    <>
      <Card className="p-5 sm:p-6 bg-chalk border border-contour-tan rounded-[12px] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-trail-orange/10 border border-trail-orange/30 text-trail-orange font-data text-[10px] font-bold uppercase tracking-wider">
              <span>🤖</span> {t('badge')}
            </div>
            <h2 className="font-display text-base sm:text-lg uppercase text-ink tracking-tight">
              {t('homeBannerTitle')}
            </h2>
            <p className="font-body text-xs text-ink/75 leading-relaxed">
              {t('homeBannerDesc')}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 font-body text-[11px] text-ink/80">
              <span className="inline-flex items-center gap-1 text-moss">
                <CheckCircle2 size={12} /> {t('appBenefit1')}
              </span>
              <span className="inline-flex items-center gap-1 text-moss">
                <CheckCircle2 size={12} /> {t('appBenefit2')}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              type="button"
              id="btn-home-open-apk-modal"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 font-display text-xs uppercase tracking-wider px-4 py-2.5 rounded-[4px] bg-trail-orange text-chalk hover:bg-trail-orange/90 transition-colors cursor-pointer select-none"
            >
              <Download size={15} strokeWidth={2} />
              <span>{t('homeBannerBtn')}</span>
            </button>
          </div>
        </div>
      </Card>

      <ApkDownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}
