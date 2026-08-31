'use client';

import React, { useState, useCallback } from 'react';
import RouteMap from './RouteMap';
import { GhostRunner } from './GhostRunner';
import { ElevationChart } from '@/components/elevation/ElevationChart';
import { FullscreenMapModal } from './FullscreenMapModal';
import { Card } from '@/components/ui/Card';
import { useTranslations } from 'next-intl';
import * as maplibregl from 'maplibre-gl';

interface RouteViewerSectionProps {
  coordinates: [number, number][];
  gpxRaw: string;
  distanceMeters: number;
}

export function RouteViewerSection({
  coordinates,
  gpxRaw,
  distanceMeters,
}: RouteViewerSectionProps) {
  const t = useTranslations('routeDetail');
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [progress, setProgress] = useState(0); // 0 to 1
  const [activeWaypoint, setActiveWaypoint] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleWaypointSelect = useCallback(
    (km: number) => {
      setActiveWaypoint(km);
      if (distanceMeters > 0) {
        const targetProgress = Math.min(1, Math.max(0, (km * 1000) / distanceMeters));
        setProgress(targetProgress);
      }
    },
    [distanceMeters]
  );

  return (
    <div className="space-y-6">
      {/* 1. Interactive Route Map Card */}
      <Card className="p-3 sm:p-4 space-y-4">
        <RouteMap
          coordinates={coordinates}
          onMapReady={setMap}
          onExpandFullscreen={() => setIsFullscreen(true)}
          onWaypointClick={handleWaypointSelect}
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

        {/* Ghost Runner Playback Bar (Synchronized with elevation profile) */}
        <GhostRunner
          map={map}
          coordinates={coordinates}
          progress={progress}
          onProgressChange={setProgress}
          durationSeconds={20}
        />
      </Card>

      {/* 2. Elevation Profile Chart Card (Bidirectional scrubbing) */}
      <Card className="p-4 sm:p-6">
        <ElevationChart
          gpxRaw={gpxRaw}
          distanceMeters={distanceMeters}
          progress={progress}
          onScrub={setProgress}
          activeWaypointKm={activeWaypoint}
        />
      </Card>

      {/* 3. Fullscreen Map Modal */}
      <FullscreenMapModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        coordinates={coordinates}
        progress={progress}
        onProgressChange={setProgress}
        onWaypointSelect={handleWaypointSelect}
      />
    </div>
  );
}
