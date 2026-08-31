'use client';

import React, { useEffect, useState } from 'react';
import RouteMap from './RouteMap';
import { GhostRunner } from './GhostRunner';
import { X, Maximize2 } from 'lucide-react';
import * as maplibregl from 'maplibre-gl';

interface FullscreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: [number, number][];
  progress: number;
  onProgressChange: (t: number) => void;
  onWaypointSelect?: (km: number) => void;
}

export function FullscreenMapModal({
  isOpen,
  onClose,
  coordinates,
  progress,
  onProgressChange,
  onWaypointSelect,
}: FullscreenMapModalProps) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen Route Map"
      className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-xs flex flex-col p-3 sm:p-6 animate-in fade-in duration-150"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-contour-tan">
        <span className="font-display text-sm uppercase tracking-wider text-ink flex items-center gap-2">
          <Maximize2 size={16} strokeWidth={2} aria-hidden="true" />
          <span>Interactive Route Map (Fullscreen)</span>
        </span>

        <button
          type="button"
          id="btn-close-fullscreen-map"
          onClick={onClose}
          aria-label="Close fullscreen map"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] bg-chalk border border-contour-tan text-ink font-display text-xs uppercase tracking-wider hover:border-ink cursor-pointer transition-colors"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
          <span>Close</span>
        </button>
      </div>

      {/* Main Full-Size Map Container */}
      <div className="flex-1 my-3 relative overflow-hidden rounded-[8px] border border-contour-tan">
        <RouteMap
          coordinates={coordinates}
          onMapReady={setMap}
          onWaypointClick={onWaypointSelect}
          className="w-full h-full"
        />
      </div>

      {/* Bottom GhostRunner Playback Sync */}
      <div className="pt-1">
        <GhostRunner
          map={map}
          coordinates={coordinates}
          progress={progress}
          onProgressChange={onProgressChange}
          durationSeconds={20}
        />
      </div>
    </div>
  );
}
