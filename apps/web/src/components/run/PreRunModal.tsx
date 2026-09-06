'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Smartphone, Download, ExternalLink, ShieldAlert } from 'lucide-react';
import { APK_DOWNLOAD_CONFIG } from '@/config/appDownload';

interface PreRunModalProps {
  isOpen: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export function PreRunModal({ isOpen, onStart, onCancel }: PreRunModalProps) {
  const t = useTranslations('runMode');
  const tApk = useTranslations('apkDownload');
  const [showManualGuide, setShowManualGuide] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div
      id="pre-run-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card className="w-full max-w-lg p-6 space-y-5 bg-chalk border border-contour-tan animate-in fade-in zoom-in-95 duration-200 my-8 shadow-xl">
        <div className="flex items-center gap-3 border-b border-contour-tan pb-3">
          <div className="w-8 h-8 rounded-[4px] bg-trail-orange/10 border border-trail-orange flex items-center justify-center text-trail-orange shrink-0">
            <AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <h2
              id="modal-title"
              className="font-display text-base uppercase text-ink tracking-tight"
            >
              {t('warningTitle')}
            </h2>
            <span className="font-data text-[10px] uppercase text-ink/60 tracking-wider">
              {t('warningSubtitle')}
            </span>
          </div>
        </div>

        {/* APK Callout Banner if Available */}
        {APK_DOWNLOAD_CONFIG.isEnabled && (
          <div className="p-3.5 rounded-[6px] bg-trail-orange/10 border border-trail-orange/40 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-trail-orange shrink-0" />
                <span className="font-display text-xs uppercase text-ink font-bold">
                  {tApk('modalTitle')}
                </span>
              </div>
              <span className="text-[10px] font-data px-1.5 py-0.5 rounded-[3px] bg-moss/20 text-moss font-bold uppercase">
                {tApk('badge')}
              </span>
            </div>

            <p className="font-body text-xs text-ink/80 leading-relaxed">
              {tApk('webLimitationText')}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              <a
                href={APK_DOWNLOAD_CONFIG.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 font-display text-xs uppercase px-3 py-1.5 rounded-[4px] bg-trail-orange text-chalk hover:bg-trail-orange/90 transition-colors"
              >
                <Download size={13} strokeWidth={2} />
                <span>{tApk('downloadCta')}</span>
                <ExternalLink size={11} className="opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => setShowManualGuide((v) => !v)}
                className="font-display text-[11px] uppercase tracking-wider text-ink/70 hover:text-ink underline px-2 py-1 cursor-pointer"
              >
                {showManualGuide ? tApk('close') : tApk('manualInstallNotice')}
              </button>
            </div>

            {showManualGuide && (
              <div className="mt-2 pt-2 border-t border-trail-orange/20 text-[11px] font-body text-ink/80 space-y-1 bg-chalk/80 p-2.5 rounded-[4px]">
                <div className="flex items-center gap-1 font-semibold text-trail-orange">
                  <ShieldAlert size={12} />
                  <span>{tApk('manualInstallNotice')}:</span>
                </div>
                <p className="text-ink/70">{tApk('manualInstallDesc')}</p>
                <ol className="list-decimal pl-4 space-y-0.5 mt-1 text-ink/90">
                  <li>{tApk('step1')}</li>
                  <li>{tApk('step2')}</li>
                  <li>{tApk('step3')}</li>
                  <li>{tApk('step4')}</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3 font-body text-xs text-ink/80 leading-relaxed">
          <p className="font-semibold text-ink">
            {t('warningSummary')}
          </p>

          <ul className="space-y-2 pl-4 list-disc marker:text-trail-orange">
            <li>{t('warningTip1')}</li>
            <li>{t('warningTip2')}</li>
            <li>{t('warningTip3')}</li>
          </ul>
        </div>

        <div className="pt-2 border-t border-contour-tan flex items-center justify-end gap-3">
          <Button
            id="btn-cancel-run"
            variant="secondary"
            onClick={onCancel}
          >
            {t('cancel')}
          </Button>

          <Button
            id="btn-confirm-start-run"
            variant="primary"
            onClick={onStart}
          >
            {t('startRunCta')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
