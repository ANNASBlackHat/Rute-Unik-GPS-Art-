'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import * as maplibregl from 'maplibre-gl';
import { GhostRunner } from './GhostRunner';
import { useTranslations } from 'next-intl';

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 sm:h-96 rounded-[8px] border border-contour-tan bg-chalk flex items-center justify-center animate-pulse">
      <span className="font-data text-xs text-ink/50 uppercase tracking-wider">
        Loading Map...
      </span>
    </div>
  ),
});

interface DetailMapSectionProps {
  coordinates: [number, number][];
}

export function DetailMapSection({ coordinates }: DetailMapSectionProps) {
  const t = useTranslations('routeDetail');
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  return (
    <div className="space-y-4">
      <RouteMap
        coordinates={coordinates}
        onMapReady={setMap}
        className="w-full h-80 sm:h-96"
      />

      {/* Map Legend */}
      <div className="flex items-center justify-between px-1 text-[11px] font-data text-ink/70">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-moss inline-block border border-chalk" />
            <span>{t('startPoint')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-trail-orange inline-block border border-chalk" />
            <span>{t('finishPoint')}</span>
          </div>
        </div>
      </div>

      {/* Ghost Runner Playback Bar */}
      <GhostRunner
        map={map}
        coordinates={coordinates}
        durationSeconds={18}
      />
    </div>
  );
}
