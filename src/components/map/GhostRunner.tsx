'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { interpolatePolyline } from '@/lib/geo';
import { useTranslations } from 'next-intl';

interface GhostRunnerProps {
  map: maplibregl.Map | null;
  coordinates: [number, number][];
  durationSeconds?: number;
  className?: string;
}

export function GhostRunner({
  map,
  coordinates,
  durationSeconds = 20,
  className = '',
}: GhostRunnerProps) {
  const t = useTranslations('runMode');
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  const markerRef = useRef<maplibregl.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);

  // Initialize marker on map
  useEffect(() => {
    if (!map || coordinates.length === 0) return;

    const el = document.createElement('div');
    el.className = 'ghost-runner-marker';
    el.innerHTML = `
      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #E8562C; color: #F7F5EF; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid #F7F5EF; box-shadow: 0 2px 6px rgba(0,0,0,0.35); transition: transform 0.05s ease-out; z-index: 20;" title="Ghost Runner">
        🏃
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

  const stepRef = useRef<((timestamp: number) => void) | null>(null);

  const step = useCallback(
    (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000;
      const currentT = Math.min(
        1,
        pausedProgressRef.current + elapsed / durationSeconds
      );

      setProgress(currentT);
      setMarkerPosition(currentT);

      if (currentT < 1) {
        if (stepRef.current) {
          animFrameRef.current = requestAnimationFrame(stepRef.current);
        }
      } else {
        setIsPlaying(false);
        pausedProgressRef.current = 1;
      }
    },
    [durationSeconds, setMarkerPosition]
  );

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  const handlePlay = () => {
    if (isPlaying) return;

    if (progress >= 1) {
      pausedProgressRef.current = 0;
      setProgress(0);
      setMarkerPosition(0);
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
    pausedProgressRef.current = progress;
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
    setProgress(0);
    setMarkerPosition(0);
    setIsPlaying(true);
    animFrameRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const progressPercent = Math.round(progress * 100);
  const elapsedSecs = Math.round(progress * durationSeconds);
  const elapsedFormatted = `00:${elapsedSecs < 10 ? '0' : ''}${elapsedSecs}`;

  return (
    <div
      id="ghost-runner-controls"
      data-testid="ghost-runner-controls"
      className={`p-3 bg-chalk border border-contour-tan rounded-[8px] flex flex-wrap items-center justify-between gap-3 font-data text-xs ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-trail-orange animate-pulse" />
        <span className="font-display text-[11px] uppercase tracking-wider text-ink">
          {t('ghostRunnerTitle')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!isPlaying ? (
          <button
            type="button"
            id="btn-ghost-play"
            data-testid="btn-ghost-play"
            onClick={handlePlay}
            className="px-3 py-1 bg-ink text-chalk rounded-[4px] font-bold uppercase tracking-wider text-[10px] hover:bg-ink/80 transition-colors select-none cursor-pointer"
          >
            ▶ {t('play')}
          </button>
        ) : (
          <button
            type="button"
            id="btn-ghost-pause"
            data-testid="btn-ghost-pause"
            onClick={handlePause}
            className="px-3 py-1 bg-contour-tan text-ink rounded-[4px] font-bold uppercase tracking-wider text-[10px] hover:bg-contour-tan/80 transition-colors select-none cursor-pointer"
          >
            ⏸ {t('pause')}
          </button>
        )}

        <button
          type="button"
          id="btn-ghost-restart"
          data-testid="btn-ghost-restart"
          onClick={handleRestart}
          className="px-2.5 py-1 border border-contour-tan text-ink rounded-[4px] font-bold uppercase tracking-wider text-[10px] hover:border-ink transition-colors select-none cursor-pointer"
          title={t('restart')}
        >
          ↺ {t('restart')}
        </button>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Progress Bar */}
        <div className="flex-1 sm:w-28 h-2 bg-paper rounded-full overflow-hidden border border-contour-tan/60">
          <div
            className="h-full bg-trail-orange transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <span className="text-[10px] text-ink/70 min-w-[50px] text-right">
          {progressPercent}% · {elapsedFormatted}
        </span>
      </div>
    </div>
  );
}
