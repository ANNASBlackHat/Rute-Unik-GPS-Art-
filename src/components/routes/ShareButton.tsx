'use client';

import React, { useState } from 'react';
import { Share2, Link2, Check } from 'lucide-react';

interface ShareButtonProps {
  routeId: string;
  routeName: string;
  cityName?: string;
}

export function ShareButton({ routeId, routeName, cityName }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/${document.documentElement.lang || 'en'}/routes/${routeId}`;
  };

  const handleShare = async () => {
    const url = getShareUrl();
    const title = `${routeName} — ${cityName || ''} | Rute Unik`;
    const text = `Check out this GPS-art running route: ${routeName}${cityName ? ` in ${cityName}` : ''}`;

    // track share (fire and forget)
    fetch(`/api/routes/${routeId}/share`, { method: 'POST' }).catch(() => {});

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    // fallback copy
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback prompt
      window.prompt('Copy this link', url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] bg-chalk text-ink border border-contour-tan hover:border-ink hover:bg-paper transition-colors select-none"
      aria-label="Share route"
    >
      {copied || shared ? (
        <>
          <Check size={16} strokeWidth={1.5} aria-hidden="true" /> {copied ? 'Link Copied' : 'Shared'}
        </>
      ) : (
        <>
          <Share2 size={16} strokeWidth={1.5} aria-hidden="true" /> Share Route
        </>
      )}
    </button>
  );
}

export function ViewTracker({ routeId }: { routeId: string }) {
  React.useEffect(() => {
    fetch(`/api/routes/${routeId}/view`, { method: 'POST' }).catch(() => {});
  }, [routeId]);
  return null;
}
