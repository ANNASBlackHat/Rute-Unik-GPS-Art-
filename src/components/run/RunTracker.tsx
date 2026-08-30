'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { PreRunModal } from './PreRunModal';
import { RunMapWrapper } from './RunMapWrapper';
import { calculateOffRoute } from '@/lib/geo';
import { GhostRunner } from '@/components/map/GhostRunner';
import * as maplibregl from 'maplibre-gl';

interface RouteData {
  id: string;
  name: string;
  distance_m: number;
  elevation_gain_m?: number | null;
  status: string;
}

interface RunTrackerProps {
  route: RouteData;
  coordinates: [number, number][]; // [lon, lat]
}

export function RunTracker({ route, coordinates }: RunTrackerProps) {
  const t = useTranslations('runMode');
  const router = useRouter();

  const [showModal, setShowModal] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(
    null
  );
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [showGhostPreview, setShowGhostPreview] = useState(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Start tracking when modal dismissed
  const handleStartRun = () => {
    setShowModal(false);
    setIsTracking(true);

    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  const handleCancelRun = () => {
    router.push(`/routes/${route.id}`);
  };

  // Watch position
  useEffect(() => {
    if (!isTracking || typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    const onPosSuccess = (pos: GeolocationPosition) => {
      const lon = pos.coords.longitude;
      const lat = pos.coords.latitude;
      setCurrentPosition([lon, lat]);
      setAccuracy(Math.round(pos.coords.accuracy));
      setGeoError(null);
    };

    const onPosError = (err: GeolocationPositionError) => {
      let errMsg = t('errorPositionUnavailable');
      if (err.code === err.PERMISSION_DENIED) {
        errMsg = t('errorPermissionDenied');
      } else if (err.code === err.TIMEOUT) {
        errMsg = t('errorTimeout');
      }
      setGeoError(errMsg);
    };

    // Custom simulated position listener for testing/mocking
    const handleSimulatedGps = (e: Event) => {
      const customEvent = e as CustomEvent<{
        lat: number;
        lon: number;
        accuracy?: number;
      }>;
      if (customEvent.detail) {
        setCurrentPosition([customEvent.detail.lon, customEvent.detail.lat]);
        setAccuracy(customEvent.detail.accuracy ?? 5);
        setGeoError(null);
      }
    };

    const handleSimulatedError = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setGeoError(customEvent.detail?.message ?? t('errorPositionUnavailable'));
    };

    window.addEventListener('simulate-gps', handleSimulatedGps);
    window.addEventListener('simulate-gps-error', handleSimulatedError);

    (window as unknown as {
      __setGpsPosition: (lat: number, lon: number, accuracy?: number) => void;
      __setGpsError: (message: string) => void;
    }).__setGpsPosition = (lat: number, lon: number, accuracy = 5) => {
      window.dispatchEvent(
        new CustomEvent('simulate-gps', { detail: { lat, lon, accuracy } })
      );
    };

    (window as unknown as {
      __setGpsPosition: (lat: number, lon: number, accuracy?: number) => void;
      __setGpsError: (message: string) => void;
    }).__setGpsError = (message: string) => {
      window.dispatchEvent(
        new CustomEvent('simulate-gps-error', { detail: { message } })
      );
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosSuccess,
      onPosError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      window.removeEventListener('simulate-gps', handleSimulatedGps);
      window.removeEventListener('simulate-gps-error', handleSimulatedError);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, t]);

  // Clean up timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Compute off-route status
  const offRouteResult = useMemo(() => {
    if (!currentPosition) return null;
    return calculateOffRoute(currentPosition, coordinates, 30);
  }, [currentPosition, coordinates]);

  // Formatted timer
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs > 0) {
      return `${hrs}:${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${remMins < 10 ? '0' : ''}${remMins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[500px] flex flex-col">
      {/* 1. Pre-Run Warning Modal */}
      <PreRunModal
        isOpen={showModal}
        onStart={handleStartRun}
        onCancel={handleCancelRun}
      />

      {/* 2. Top HUD Bar */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center justify-between gap-2 pointer-events-auto">
          {/* Off-Route Status Indicator */}
          {offRouteResult ? (
            <div
              id="off-route-status"
              data-testid="off-route-status"
              data-status={offRouteResult.isOffRoute ? 'off-route' : 'on-route'}
              className={`px-3 py-1.5 rounded-[4px] border font-data text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm ${
                offRouteResult.isOffRoute
                  ? 'bg-trail-orange text-chalk border-[#d44820]'
                  : 'bg-moss text-chalk border-[#4a5840]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-chalk inline-block animate-pulse" />
              <span className="font-bold">
                {offRouteResult.isOffRoute
                  ? `${t('offRoute')}: ${Math.round(offRouteResult.distanceMeters)}m`
                  : t('onRoute')}
              </span>
            </div>
          ) : (
            <div
              id="off-route-status"
              data-testid="off-route-status"
              data-status="searching"
              className="px-3 py-1.5 rounded-[4px] border border-contour-tan bg-chalk text-ink font-data text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-contour-tan inline-block animate-ping" />
              <span>{t('searchingGps')}</span>
            </div>
          )}

          {/* GPS Accuracy Readout */}
          {accuracy !== null && (
            <div className="px-2.5 py-1.5 rounded-[4px] border border-contour-tan bg-chalk text-ink font-data text-[11px]">
              <span className="text-ink/60 mr-1">{t('accuracy')}:</span>
              <span className="font-bold">±{accuracy}m</span>
            </div>
          )}
        </div>

        {/* Geolocation Error Notification */}
        {geoError && (
          <div
            id="geo-error-banner"
            className="p-3 bg-[#9B2C2C] text-chalk border border-white/20 rounded-[4px] font-body text-xs pointer-events-auto shadow-md"
          >
            ⚠️ {geoError}
          </div>
        )}
      </div>

      {/* 3. Central Map View */}
      <div className="flex-1 relative w-full h-full">
        <RunMapWrapper
          coordinates={coordinates}
          currentPosition={currentPosition}
          accuracyMeters={accuracy}
          shouldRecenter={shouldRecenter}
          onRecenterComplete={() => setShouldRecenter(false)}
          onMapReady={setMapInstance}
          className="w-full h-full"
        />

        {/* Floating "Re-center on Me" Button */}
        {currentPosition && (
          <button
            type="button"
            id="btn-recenter"
            data-testid="btn-recenter"
            onClick={() => setShouldRecenter(true)}
            className="absolute bottom-24 right-4 z-20 px-3.5 py-2 bg-chalk text-ink border border-contour-tan rounded-[4px] font-display text-xs uppercase tracking-wider shadow-md hover:border-ink transition-colors cursor-pointer select-none"
          >
            🎯 {t('recenter')}
          </button>
        )}

        {/* Ghost Runner Floating Toggle */}
        <div className="absolute top-16 right-3 z-20">
          <button
            type="button"
            id="btn-toggle-ghost"
            onClick={() => setShowGhostPreview((v) => !v)}
            className="px-2.5 py-1.5 bg-chalk text-ink border border-contour-tan rounded-[4px] font-data text-[11px] uppercase tracking-wider hover:border-ink transition-colors shadow-sm select-none cursor-pointer"
          >
            {showGhostPreview ? `✕ ${t('closeGhost')}` : `🏃 ${t('previewRunner')}`}
          </button>
        </div>

        {/* Ghost Runner Controls Overlay */}
        {showGhostPreview && mapInstance && (
          <div className="absolute bottom-24 left-4 right-4 z-30 max-w-md mx-auto">
            <GhostRunner
              map={mapInstance}
              coordinates={coordinates}
              durationSeconds={20}
            />
          </div>
        )}
      </div>

      {/* 4. Bottom Metric HUD */}
      <div className="bg-chalk border-t border-contour-tan p-3 z-30 flex items-center justify-between gap-4 font-data select-none">
        <div className="flex items-center gap-4 sm:gap-8">
          <div>
            <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
              {t('elapsedTime')}
            </span>
            <span className="font-display text-lg text-ink font-bold">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-ink/50 block uppercase tracking-wider">
              {t('totalDistance')}
            </span>
            <span className="font-display text-lg text-ink font-bold">
              {(route.distance_m / 1000).toFixed(2)}{' '}
              <span className="text-xs font-normal">km</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-exit-run"
          onClick={handleCancelRun}
          className="px-3.5 py-2 border border-contour-tan text-ink hover:border-ink rounded-[4px] font-display text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          ✕ {t('exitRun')}
        </button>
      </div>
    </div>
  );
}
