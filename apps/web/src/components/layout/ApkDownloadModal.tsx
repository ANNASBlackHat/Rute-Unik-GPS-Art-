'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { APK_DOWNLOAD_CONFIG } from '@/config/appDownload';

interface ApkDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApkDownloadModal({ isOpen, onClose }: ApkDownloadModalProps) {
  const t = useTranslations('apkDownload');

  if (!isOpen || !APK_DOWNLOAD_CONFIG.isEnabled) return null;

  return (
    <div
      id="apk-download-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apk-general-modal-title"
    >
      <Card className="w-full max-w-lg p-6 space-y-5 bg-chalk border border-contour-tan animate-in fade-in zoom-in-95 duration-200 relative my-8 shadow-xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="absolute top-4 right-4 text-ink/60 hover:text-ink transition-colors p-1 rounded-[4px] hover:bg-paper cursor-pointer"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 border-b border-contour-tan/70 pb-4 pr-6">
          <div className="w-10 h-10 rounded-[6px] bg-trail-orange/10 border border-trail-orange flex items-center justify-center text-trail-orange shrink-0">
            <Smartphone size={22} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-moss/10 border border-moss/30 text-moss font-data text-[10px] font-bold uppercase tracking-wider mb-1">
              <span>🤖</span> Android APK (v{APK_DOWNLOAD_CONFIG.version})
            </div>
            <h2
              id="apk-general-modal-title"
              className="font-display text-lg uppercase text-ink tracking-tight leading-snug"
            >
              Unduh Aplikasi Android Rute Unik
            </h2>
            <p className="font-data text-[11px] text-ink/70 uppercase tracking-wider mt-0.5">
              {t('modalSubtitle')}
            </p>
          </div>
        </div>

        {/* App Features */}
        <div className="p-3.5 rounded-[6px] bg-paper/60 border border-contour-tan space-y-2">
          <span className="font-display text-xs uppercase text-ink tracking-wide block">
            Fitur Utama Aplikasi Mobile:
          </span>
          <ul className="space-y-1.5 pl-5 font-body text-xs text-ink/85 list-disc marker:text-trail-orange">
            <li>{t('appBenefit1')}</li>
            <li>{t('appBenefit2')}</li>
            <li>{t('appBenefit3')}</li>
            <li>{t('appBenefit4')}</li>
            <li>Dukungan Tema ☀️ Paper Metaphor & 🌙 AMOLED High-Contrast</li>
          </ul>
        </div>

        {/* Manual Installation Notice */}
        <div className="p-3.5 rounded-[6px] bg-chalk border border-contour-tan/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-ink font-display text-xs uppercase tracking-wide">
            <ShieldAlert size={14} className="text-trail-orange shrink-0" />
            <span>{t('manualInstallNotice')}</span>
          </div>
          <p className="font-body text-xs text-ink/70 leading-relaxed">
            {t('manualInstallDesc')}
          </p>

          <ol className="space-y-1.5 pl-4 font-body text-xs text-ink/90 list-decimal marker:font-bold marker:text-trail-orange">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
            <li>{t('step4')}</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-contour-tan flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            {t('close')}
          </Button>

          <a
            href={APK_DOWNLOAD_CONFIG.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-display text-xs tracking-wider uppercase px-4 py-2.5 rounded-[4px] bg-trail-orange text-chalk hover:bg-trail-orange/90 transition-colors shadow-sm select-none"
          >
            <Download size={15} strokeWidth={2} aria-hidden="true" />
            <span>{t('downloadCta')}</span>
            <ExternalLink size={12} className="opacity-70" aria-hidden="true" />
          </a>
        </div>
      </Card>
    </div>
  );
}
