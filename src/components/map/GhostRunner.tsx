'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { interpolatePolyline } from '@/lib/geo';
import { useTranslations } from 'next-intl';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface GhostRunnerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number][];
  durationSeconds?: number;
  progress?: number;
  onProgressChange?: (progress: number) => void;
  className?: string;
}

export function GhostRunner({
  map,
  coordinates,
  durationSeconds = 75,
  progress: externalProgress,
  onProgressChange,
  className = '',
}: GhostRunnerProps) {
  const t = useTranslations('runMode');
  const [isPlaying, setIsPlaying] = useState(false);
  const [internalProgress, setInternalProgress] = useState(0); // 0 to 1
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(1);

  const activeProgress =
    typeof externalProgress === 'number' ? externalProgress : internalProgress;

  const markerRef = useRef<maplibregl.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize marker on map
  useEffect(() => {
    if (!map || coordinates.length === 0) return;

    const el = document.createElement('div');
    el.className = 'ghost-runner-marker';
    el.innerHTML = `
      <div style="width: 30px; height: 30px; border-radius: 50%; background-color: #E8562C; color: #F7F5EF; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 20;" title="Ghost Runner" aria-label="Ghost runner position">
        ●
      </div>
    `;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(coordinates[0])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [map, coordinates]);

  // Update marker position given progress t
  const setMarkerPosition = useCallback(
    (tVal: number) => {
      if (!markerRef.current || coordinates.length === 0) return;
      const coord = interpolatePolyline(coordinates, tVal);
      markerRef.current.setLngLat(coord);
    },
    [coordinates]
  );

  // Sync external progress to marker
  useEffect(() => {
    if (typeof externalProgress === 'number') {
      pausedProgressRef.current = externalProgress;
      setMarkerPosition(externalProgress);
    }
  }, [externalProgress, setMarkerPosition]);

  const updateProgress = useCallback(
    (newProgress: number) => {
      setInternalProgress(newProgress);
      setMarkerPosition(newProgress);
      if (onProgressChange) {
        onProgressChange(newProgress);
      }
    },
    [onProgressChange, setMarkerPosition]
  );

  const stepRef = useRef<((timestamp: number) => void) | null>(null);

  const step = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const effectiveDuration = durationSeconds / speed;
      const currentT = Math.min(
        1,
        pausedProgressRef.current + elapsed / effectiveDuration
      );

      updateProgress(currentT);

      if (currentT < 1) {
        if (stepRef.current) {
          animFrameRef.current = requestAnimationFrame(stepRef.current);
        }
      } else {
        setIsPlaying(false);
        pausedProgressRef.current = 1;
      }
    },
    [durationSeconds, speed, updateProgress]
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const handlePlay = () => {
    if (isPlaying) return;
    if (prefersReducedMotion) return;

    if (activeProgress >= 1) {
      pausedProgressRef.current = 0;
      updateProgress(0);
    } else {
      pausedProgressRef.current = activeProgress;
    }

    startTimeRef.current = null;
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(step);
  };

  const handlePause = () => {
    if (!isPlaying) return;

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    pausedProgressRef.current = activeProgress;
    startTimeRef.current = null;
    setIsPlaying(false);
  };

  const handleRestart = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    startTimeRef.current = null;
    pausedProgressRef.current = 0;
    updateProgress(0);
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(step);
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clickX = e.clientX - rect.left;
    const newT = Math.max(0, Math.min(1, clickX / rect.width));

    if (isPlaying) {
      handlePause();
    }
    pausedProgressRef.current = newT;
    updateProgress(newT);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleSetSpeed = useCallback(
    (newSpeed: 0.5 | 1 | 2 | 4) => {
      if (isPlaying && startTimeRef.current) {
        const now = performance.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        const effectiveDuration = durationSeconds / speed;
        const currentT = Math.min(
          1,
          pausedProgressRef.current + elapsed / effectiveDuration
        );
        pausedProgressRef.current = currentT;
        startTimeRef.current = now;
      }
      setSpeed(newSpeed);
    },
    [isPlaying, durationSeconds, speed]
  );

  const progressPercent = Math.round(activeProgress * 100);
  const elapsedSecs = Math.round(activeProgress * durationSeconds);
  const mins = Math.floor(elapsedSecs / 60);
  const remSecs = elapsedSecs % 60;
  const elapsedFormatted = `${mins < 10 ? '0' : ''}${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;

  return (
    <div
      id="ghost-runner-controls"
      data-testid="ghost-runner-controls"
      className={`p-3 bg-chalk border border-contour-tan rounded-[8px] flex flex-wrap items-center justify-between gap-3 font-data text-xs ${className}`}
    >
      {/* Title with live pulse */}
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full bg-trail-orange motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <span className="font-display text-xs uppercase tracking-wider text-ink">
          {t('ghostRunnerTitle')}
        </span>
      </div>

      {/* Playback Actions + Speed Multiplier */}
      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            type="button"
            id="btn-ghost-play"
            data-testid="btn-ghost-play"
            onClick={handlePlay}
            disabled={prefersReducedMotion}
            aria-label={
              prefersReducedMotion
                ? 'Animation disabled (reduced motion)'
                : undefined
            }
            className="min-h-8 px-3.5 py-1.5 bg-ink text-chalk rounded-[4px] font-bold uppercase tracking-wider text-xs hover:bg-ink/80 transition-colors select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Play size={13} strokeWidth={2} aria-hidden="true" /> {t('play')}
          </button>
        ) : (
          <button
            type="button"
            id="btn-ghost-pause"
            data-testid="btn-ghost-pause"
            onClick={handlePause}
            className="min-h-8 px-3.5 py-1.5 bg-contour-tan text-ink rounded-[4px] font-bold uppercase tracking-wider text-xs hover:bg-contour-tan/80 transition-colors select-none cursor-pointer inline-flex items-center gap-1.5"
          >
            <Pause size={13} strokeWidth={2} aria-hidden="true" /> {t('pause')}
          </button>
        )}

        <button
          type="button"
          id="btn-ghost-restart"
          data-testid="btn-ghost-restart"
          onClick={handleRestart}
          className="min-h-8 px-2.5 py-1.5 border border-contour-tan text-ink rounded-[4px] font-bold uppercase tracking-wider text-xs hover:border-ink transition-colors select-none cursor-pointer inline-flex items-center gap-1"
          title={t('restart')}
        >
          <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
        </button>

        {/* Speed Selector (0.5x / 1x / 2x / 4x) */}
        <div
          className="inline-flex rounded-[4px] border border-contour-tan bg-paper/50 p-0.5"
          role="group"
          aria-label="Playback speed"
        >
          {([0.5, 1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              id={`btn-speed-${s}x`}
              onClick={() => handleSetSpeed(s)}
              className={`min-h-7 px-2 py-0.5 rounded-[3px] text-[11px] font-data font-bold transition-colors cursor-pointer select-none ${
                speed === s
                  ? 'bg-ink text-chalk'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Scrubber Progress Bar */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <div
          onClick={handleScrubberClick}
          className="flex-1 sm:w-32 h-3 bg-paper rounded-full overflow-hidden border border-contour-tan/60 cursor-pointer relative group"
          title="Click to scrub"
        >
          <div
            className="h-full bg-trail-orange transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-xs text-ink min-w-[50px] text-right font-data font-bold">
          {progressPercent}% · {elapsedFormatted}
        </span>
      </div>
    </div>
  );
}
