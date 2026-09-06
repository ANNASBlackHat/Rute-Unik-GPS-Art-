'use client';

import React, { useState } from 'react';
import { StartRunButton } from './StartRunButton';
import { ShareButton } from './ShareButton';
import { DownloadImageButton } from './DownloadImageButton';
import { VideoExportButton } from '@/components/video/VideoExportButton';
import { Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface RouteActionsMenuProps {
  routeId: string;
  routeName: string;
  cityName: string;
  distanceKm: string;
  elevationGain: string;
  thumbnailSvg: string;
  coordinates: [number, number][];
}

export function RouteActionsMenu({
  routeId,
  routeName,
  cityName,
  distanceKm,
  elevationGain,
  thumbnailSvg,
  coordinates,
}: RouteActionsMenuProps) {
  const t = useTranslations('routeDetail');
  const [showExports, setShowExports] = useState(false);

  return (
    <div className="pt-2 space-y-3">
      {/* 1. Primary Action: Start Run */}
      <StartRunButton routeId={routeId} />

      {/* 2. Secondary Action: Download GPX */}
      <a
        href={`/api/routes/${routeId}/gpx`}
        download
        className="w-full inline-flex items-center justify-center gap-2 font-display tracking-wider uppercase text-xs px-4 py-2.5 rounded-[4px] border border-contour-tan text-ink hover:border-ink hover:bg-paper/40 transition-colors select-none"
      >
        <Download size={16} strokeWidth={1.5} aria-hidden="true" /> {t('downloadGpx')}
      </a>

      {/* 3. Consolidated Export & Share Section */}
      <div className="border border-contour-tan/70 rounded-[4px] bg-paper/30 overflow-hidden">
        <button
          type="button"
          id="btn-toggle-export-menu"
          aria-expanded={showExports}
          aria-controls="export-share-options"
          onClick={() => setShowExports((prev) => !prev)}
          className="w-full px-3 py-2 flex items-center justify-between font-display text-xs uppercase tracking-wider text-ink/80 hover:text-ink hover:bg-paper/50 transition-colors cursor-pointer select-none"
        >
          <span className="inline-flex items-center gap-1.5">
            <Share2 size={14} strokeWidth={1.5} aria-hidden="true" />
            <span>Share & Export Media</span>
          </span>
          {showExports ? (
            <ChevronUp size={14} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <ChevronDown size={14} strokeWidth={1.5} aria-hidden="true" />
          )}
        </button>

        {showExports && (
          <div
            id="export-share-options"
            className="p-3 border-t border-contour-tan/50 bg-chalk space-y-2.5 animate-in slide-in-from-top-1 duration-150"
          >
            {/* Share Link button */}
            <ShareButton
              routeId={routeId}
              routeName={routeName}
              cityName={cityName}
            />

            {/* Card & Line Only PNG Downloads */}
            <DownloadImageButton
              routeName={routeName}
              cityName={cityName}
              distanceKm={distanceKm}
              elevationGain={elevationGain}
              thumbnailSvg={thumbnailSvg}
              coordinates={coordinates}
            />

            {/* Video Export button */}
            <VideoExportButton
              routeId={routeId}
              routeName={routeName}
              cityName={cityName}
              distanceKm={distanceKm}
              elevationGain={elevationGain}
              coordinates={coordinates}
            />
          </div>
        )}
      </div>
    </div>
  );
}
