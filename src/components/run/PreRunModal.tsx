'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PreRunModalProps {
  isOpen: boolean;
  onStart: () => void;
  onCancel: () => void;
}

export function PreRunModal({ isOpen, onStart, onCancel }: PreRunModalProps) {
  const t = useTranslations('runMode');

  if (!isOpen) return null;

  return (
    <div
      id="pre-run-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <Card className="w-full max-w-md p-6 space-y-5 bg-chalk border border-contour-tan animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b border-contour-tan pb-3">
          <div className="w-8 h-8 rounded-[4px] bg-trail-orange/10 border border-trail-orange flex items-center justify-center text-trail-orange font-display text-base">
            ⚠️
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
