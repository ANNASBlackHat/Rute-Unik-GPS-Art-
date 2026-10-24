'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Copy, Check, Share2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import {
  buildShareMessage,
  getWhatsAppShareUrl,
  getWhatsAppSchemeUrl,
  getTelegramShareUrl,
} from '@/lib/share';

interface ShareButtonProps {
  routeId: string;
  routeName: string;
  cityName?: string;
  distanceKm?: string;
  elevationGain?: string;
}

const emptySubscribe = () => () => {};

function useCanNativeShare() {
  return useSyncExternalStore(
    emptySubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false
  );
}

function WhatsAppIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function TelegramIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export function ShareButton({
  routeId,
  routeName,
  cityName,
  distanceKm,
  elevationGain,
}: ShareButtonProps) {
  const t = useTranslations('routeDetail');
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const canNativeShare = useCanNativeShare();

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/${locale || 'en'}/routes/${routeId}`;
  };

  const trackShare = () => {
    fetch(`/api/routes/${routeId}/share`, { method: 'POST' }).catch(() => {});
  };

  const getFormattedMessage = () => {
    const url = getShareUrl();
    return buildShareMessage({
      routeName,
      cityName,
      distanceKm,
      elevationGain,
      url,
      locale,
    });
  };

  const handleShareWhatsApp = () => {
    trackShare();
    const text = getFormattedMessage();
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile) {
      // Trigger whatsapp:// custom scheme on mobile:
      // When both WhatsApp and WhatsApp Business are installed,
      // the mobile OS prompts the native app chooser ("Open with WhatsApp / WA Business").
      window.location.href = getWhatsAppSchemeUrl(text);
    } else {
      const waUrl = getWhatsAppShareUrl(text);
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleShareTelegram = () => {
    trackShare();
    const url = getShareUrl();
    const text = `🏃 *${routeName}* (GPS Art Route)${cityName ? ` — ${cityName}` : ''}${distanceKm ? ` | ${distanceKm} km` : ''}`;
    const tgUrl = getTelegramShareUrl(url, text);
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyDetails = async () => {
    trackShare();
    const fullText = getFormattedMessage();
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this text:', fullText);
    }
  };

  const handleNativeShare = async () => {
    trackShare();
    const url = getShareUrl();
    const title = `${routeName}${cityName ? ` — ${cityName}` : ''} | Rute Unik`;
    const text = getFormattedMessage();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
        handleCopyDetails();
      }
    } else {
      handleCopyDetails();
    }
  };

  return (
    <div className="space-y-2">
      {/* 1. Direct Messaging App Share Buttons (WhatsApp & Telegram) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="inline-flex items-center justify-center gap-1.5 font-display tracking-wider uppercase text-xs px-3 py-2 rounded-[4px] border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 hover:border-[#25D366] transition-colors cursor-pointer select-none"
          aria-label={t('shareWhatsApp')}
        >
          <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
          <span>WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={handleShareTelegram}
          className="inline-flex items-center justify-center gap-1.5 font-display tracking-wider uppercase text-xs px-3 py-2 rounded-[4px] border border-[#24A1DE]/40 bg-[#24A1DE]/10 text-[#0088cc] hover:bg-[#24A1DE]/20 hover:border-[#24A1DE] transition-colors cursor-pointer select-none"
          aria-label={t('shareTelegram')}
        >
          <TelegramIcon className="w-3.5 h-3.5 text-[#24A1DE]" />
          <span>Telegram</span>
        </button>
      </div>

      {/* 2. Copy Route Details & Link */}
      <button
        type="button"
        onClick={handleCopyDetails}
        className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-3 py-2 rounded-[4px] bg-chalk text-ink border border-contour-tan hover:border-ink hover:bg-paper transition-colors cursor-pointer select-none"
        aria-label={t('copyShareDetails')}
      >
        {copied ? (
          <>
            <Check size={14} strokeWidth={1.5} className="text-trail-orange" aria-hidden="true" />
            <span>{t('shareDetailsCopied')}</span>
          </>
        ) : (
          <>
            <Copy size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>{t('copyShareDetails')}</span>
          </>
        )}
      </button>

      {/* 3. System / More Share Options (shown if device supports native share) */}
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="w-full inline-flex items-center justify-center gap-1.5 font-display tracking-wider uppercase text-xs px-3 py-1.5 rounded-[4px] bg-transparent text-ink/70 hover:text-ink hover:bg-paper/40 transition-colors cursor-pointer select-none"
          aria-label={t('shareMore')}
        >
          <Share2 size={13} strokeWidth={1.5} aria-hidden="true" />
          <span>{t('shareMore')}</span>
        </button>
      )}
    </div>
  );
}

export function ViewTracker({ routeId }: { routeId: string }) {
  useEffect(() => {
    fetch(`/api/routes/${routeId}/view`, { method: 'POST' }).catch(() => {});
  }, [routeId]);
  return null;
}
