'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { isClientVideoExportSupported } from '@/lib/video-capability';
import { exportRouteVideo } from '@/lib/video-export';
import { Film, Loader2, Check, Cloud, AlertTriangle } from 'lucide-react';

interface VideoExportButtonProps {
  routeId: string;
  routeName: string;
  cityName: string;
  distanceKm: string; // already formatted "5.20"
  elevationGain: string; // e.g. "+85 m"
  coordinates: [number, number][];
}

type ExportState = 'idle' | 'checking' | 'encoding' | 'done' | 'fallback' | 'error';

export function VideoExportButton({
  routeId,
  routeName,
  cityName,
  distanceKm,
  elevationGain,
  coordinates,
}: VideoExportButtonProps) {
  const t = useTranslations('routeDetail');
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fallbackJobId, setFallbackJobId] = useState<string | null>(null);
  const [fallbackStatus, setFallbackStatus] = useState<string | null>(null);

  const handleExport = async () => {
    setErrorMsg(null);
    setState('checking');
    setProgress(0);

    // 1. Capability check (spec §3.1) — tries fallback resolutions/codecs
    const cap = await isClientVideoExportSupported();
    if (!cap.supported) {
      setState('fallback');
      // Try server fallback (spec §4)
      try {
        const res = await fetch(`/api/routes/${routeId}/render-video`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ width: 1080, height: 1080, fps: 30, durationSeconds: 8 }),
        });
        const data = await res.json();
        if (res.ok) {
          setFallbackJobId(data.jobId || data.id || null);
          // Poll for completion (spec §4.4) — for now server just queues, so we show queued
        } else {
          setErrorMsg(cap.reason);
        }
      } catch {
        setErrorMsg(cap.reason);
      }
      return;
    }

    // 2. Client-side render (spec §3.2-5) — use the config that was proven supported
    setState('encoding');
    try {
      const cfg = cap.config;
      const codecForMediabunny = cfg.codec.startsWith('vp09')
        ? ('vp9' as const)
        : cfg.codec.startsWith('av01')
          ? ('av1' as const)
          : ('avc' as const);
      const blob = await exportRouteVideo(
        coordinates,
        {
          routeName,
          cityName,
          distanceKm,
          elevationGain,
        },
        {
          width: cfg.width,
          height: cfg.height,
          fps: cfg.framerate,
          durationSeconds: 8,
          bitrate: cfg.bitrate,
          codec: codecForMediabunny,
        },
        (p) => setProgress(p.percent),
      );

      // 3. Deliver — trigger browser download directly from blob (no server upload)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${routeName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_RUTE_UNIK.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState('done');
      setTimeout(() => setState('idle'), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setState('error');
    }
  };

  const isBusy = state === 'checking' || state === 'encoding';

  // Poll server job if in fallback (spec §4.4)
  React.useEffect(() => {
    if (!fallbackJobId || fallbackJobId.startsWith('fallback-')) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/render-jobs/${fallbackJobId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setFallbackStatus(data.status);
        if (data.status === 'done' && data.output_url) {
          // Trigger download from storage URL
          const a = document.createElement('a');
          a.href = data.output_url;
          a.download = `${routeName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_RUTE_UNIK_SERVER.mp4`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setState('done');
        }
      } catch {}
    };
    const id = setInterval(poll, 2500);
    poll();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fallbackJobId, routeName]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={isBusy || coordinates.length < 2}
        className={`w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] border transition-colors select-none ${
          isBusy
            ? 'bg-paper border-contour-tan text-ink/60 cursor-wait'
            : 'bg-ink text-chalk border-ink hover:bg-ink/90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {state === 'idle' && <><Film size={16} strokeWidth={1.5} aria-hidden="true" /> {t('exportVideo') ?? 'Export Video'}</>}
        {state === 'checking' && <><Loader2 size={16} strokeWidth={1.5} aria-hidden="true" className="animate-spin" /> Checking…</>}
        {state === 'encoding' && <><Loader2 size={16} strokeWidth={1.5} aria-hidden="true" className="animate-spin" /> {progress}%</>}
        {state === 'done' && <><Check size={16} strokeWidth={1.5} aria-hidden="true" /> Downloaded</>}
        {state === 'fallback' && <><Cloud size={16} strokeWidth={1.5} aria-hidden="true" /> Queued (fallback)</>}
        {state === 'error' && <><AlertTriangle size={16} strokeWidth={1.5} aria-hidden="true" /> Retry</>}
      </button>

      {state === 'encoding' && (
        <div className="h-1.5 bg-paper rounded-full overflow-hidden border border-contour-tan/60">
          <div className="h-full bg-trail-orange transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] font-data text-trail-orange bg-trail-orange/10 border border-trail-orange/20 rounded-[4px] px-2 py-1">
          {errorMsg}
        </p>
      )}

      {state === 'fallback' && fallbackJobId && (
        <p className="text-[11px] font-data text-ink/70">
          Server job <span className="font-mono">{fallbackJobId.slice(0, 8)}</span> {fallbackStatus ?? 'queued'} — polling every 2.5s. Download will appear when done.
        </p>
      )}

      {state === 'fallback' && !fallbackJobId && errorMsg && (
        <p className="text-[11px] font-data text-ink/60">
          Client export not supported on this browser. Server fallback is not yet configured — try Chrome/Edge on desktop.
        </p>
      )}
    </div>
  );
}
