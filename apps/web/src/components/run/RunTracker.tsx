'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { PreRunModal } from './PreRunModal';
import { RunMapWrapper } from './RunMapWrapper';
import { calculateOffRoute, haversineDistance, interpolatePolyline } from '@/lib/geo';
import { GhostRunner } from '@/components/map/GhostRunner';
import * as maplibregl from 'maplibre-gl';
import {
  AlertTriangle,
  Crosshair,
  PersonStanding,
  X,
  Play,
  Pause,
  PartyPopper,
  Compass,
} from 'lucide-react';

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
  const [isPaused, setIsPaused] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(
    null
  );
  const [userBreadcrumbs, setUserBreadcrumbs] = useState<[number, number][]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [shouldRecenter, setShouldRecenter] = useState(false);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [showGhostPreview, setShowGhostPreview] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simulationRef = useRef<number | null>(null);

  // Start tracking when pre-run modal dismissed
  const handleStartRun = () => {
    setShowModal(false);
    setIsTracking(true);
    setIsPaused(false);
  };

  const handleCancelRun = () => {
    router.push(`/routes/${route.id}`);
  };

  // Toggle Pause / Resume
  const handleTogglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Compute real-time shape completion progress (%)
  const { completionPercent, distanceCoveredMeters } = useMemo(() => {
    if (!currentPosition || coordinates.length < 2) {
      return { completionPercent: 0, distanceCoveredMeters: 0 };
    }

    // Find closest segment along route coordinates
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < coordinates.length; i++) {
      const d = haversineDistance(currentPosition, coordinates[i]);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }

    // Fraction of coordinates completed
    const fraction = closestIndex / (coordinates.length - 1);
    const covered = Math.round(fraction * route.distance_m);
    const percent = Math.min(100, Math.round(fraction * 100));

    return {
      completionPercent: percent,
      distanceCoveredMeters: covered,
    };
  }, [currentPosition, coordinates, route.distance_m]);

  // Check for route completion (within 40m of finish coordinate or 98% completed)
  const isFinished = Boolean(
    isCompleted ||
      (currentPosition &&
        coordinates.length >= 2 &&
        (completionPercent >= 98 ||
          (haversineDistance(
            currentPosition,
            coordinates[coordinates.length - 1]
          ) <= 40 &&
            completionPercent >= 80)))
  );

  // Timer interval (runs only when tracking and NOT paused and NOT completed)
  useEffect(() => {
    if (isTracking && !isPaused && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTracking, isPaused, isFinished]);

  // Geolocation Watch Position
  useEffect(() => {
    if (!isTracking || isSimulationMode || typeof window === 'undefined' || !navigator.geolocation) {
      return;
    }

    const onPosSuccess = (pos: GeolocationPosition) => {
      const lon = pos.coords.longitude;
      const lat = pos.coords.latitude;
      const point: [number, number] = [lon, lat];

      setCurrentPosition(point);
      setAccuracy(Math.round(pos.coords.accuracy));
      setGeoError(null);

      // Record breadcrumb only if not paused
      if (!isPaused) {
        setUserBreadcrumbs((prev) => [...prev, point]);
      }
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
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTracking, isPaused, isSimulationMode, t]);

  // Simulation mode runner (for testing or when indoors / geolocation denied)
  const startSimulation = useCallback(() => {
    if (coordinates.length === 0) return;
    setIsSimulationMode(true);
    setGeoError(null);
    setShowModal(false);
    setIsTracking(true);
    setIsPaused(false);

    let progress = 0;
    const duration = 25; // 25s simulation
    const startTime = performance.now();

    const simStep = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      progress = Math.min(1, elapsed / duration);
      const coord = interpolatePolyline(coordinates, progress);

      setCurrentPosition(coord);
      setAccuracy(4);
      setUserBreadcrumbs((prev) => [...prev, coord]);

      if (progress < 1) {
        simulationRef.current = requestAnimationFrame(simStep);
      } else {
        setIsCompleted(true);
      }
    };

    simulationRef.current = requestAnimationFrame(simStep);
  }, [coordinates]);

  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
    };
  }, []);

  // Compute off-route status
  const offRouteResult = useMemo(() => {
    if (!currentPosition || coordinates.length === 0 || isPaused) return null;
    return calculateOffRoute(currentPosition, coordinates, 30);
  }, [currentPosition, coordinates, isPaused]);

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
    <div className="relative w-full h-[calc(100vh-140px)] min-h-[520px] flex flex-col font-data">
      {/* 1. Pre-Run Warning Modal */}
      <PreRunModal
        isOpen={showModal}
        onStart={handleStartRun}
        onCancel={handleCancelRun}
      />

      {/* 2. Top HUD Bar */}
      <div className="absolute top-3 inset-x-3 z-30 flex flex-col gap-2 pointer-events-none">
        <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
          {/* Off-Route / Paused Status Indicator */}
          {isPaused ? (
            <div
              id="off-route-status"
              data-testid="off-route-status"
              data-status="paused"
              className="px-3 py-1.5 rounded-[4px] border font-data text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm bg-ink text-chalk border-contour-tan"
            >
              <Pause size={12} strokeWidth={2} className="text-trail-orange" />
              <span className="font-bold">{t('runPaused')}</span>
            </div>
          ) : offRouteResult ? (
            <div
              id="off-route-status"
              data-testid="off-route-status"
              data-status={offRouteResult.isOffRoute ? 'off-route' : 'on-route'}
              className={`px-3 py-1.5 rounded-[4px] border font-data text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm ${
                offRouteResult.isOffRoute
                  ? 'bg-error text-error-on border-[#7a2222]'
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
              className="px-3 py-1.5 rounded-[4px] border border-contour-tan bg-chalk text-ink font-data text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs"
            >
              <span className="w-2 h-2 rounded-full bg-contour-tan inline-block animate-ping" />
              <span>{isSimulationMode ? t('simulationMode') : t('searchingGps')}</span>
            </div>
          )}

          {/* Real-time Shape Completion Pill */}
          <div
            id="shape-completion-pill"
            data-testid="shape-completion-pill"
            className="px-3 py-1.5 rounded-[4px] border border-contour-tan bg-chalk text-ink font-data text-xs uppercase tracking-wider shadow-sm flex items-center gap-2"
          >
            <Compass size={13} strokeWidth={2} className="text-trail-orange" />
            <span className="font-bold text-ink">
              {t('shapeTraced')}: {completionPercent}%
            </span>
            <span className="text-[10px] text-ink/60">
              ({(distanceCoveredMeters / 1000).toFixed(1)} / {(route.distance_m / 1000).toFixed(1)} km)
            </span>
            {/* Miniature progress bar */}
            <div className="w-12 h-2 bg-paper rounded-full overflow-hidden border border-contour-tan/50 hidden sm:block">
              <div
                className="h-full bg-trail-orange transition-all duration-300"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* GPS Accuracy Readout */}
          {accuracy !== null && (
            <div className="px-2.5 py-1.5 rounded-[4px] border border-contour-tan bg-chalk text-ink font-data text-[11px] shadow-xs">
              <span className="text-ink/60 mr-1">{t('accuracy')}:</span>
              <span className="font-bold">±{accuracy}m</span>
            </div>
          )}
        </div>

        {/* Geolocation Error Notification with clear guidance & simulation trigger */}
        {geoError && !isSimulationMode && (
          <div
            id="geo-error-banner"
            role="alert"
            className="p-3 bg-paper text-ink border border-contour-tan rounded-[6px] font-body text-xs pointer-events-auto shadow-md space-y-2 max-w-lg"
          >
            <div className="flex items-start gap-2 text-error">
              <AlertTriangle size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-ink">{geoError}</p>
                <p className="text-ink/70 text-[11px]">
                  Ensure location permissions are granted in your browser settings (look for the lock or site settings icon in the URL bar).
                </p>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                id="btn-trigger-simulation"
                onClick={startSimulation}
                className="px-3 py-1.5 bg-ink text-chalk rounded-[4px] font-display text-[11px] uppercase tracking-wider hover:bg-moss transition-colors cursor-pointer"
              >
                {t('simulateRun')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Central Map View */}
      <div className="flex-1 relative w-full h-full">
        <RunMapWrapper
          coordinates={coordinates}
          currentPosition={currentPosition}
          userBreadcrumbs={userBreadcrumbs}
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
            className="absolute bottom-24 right-4 z-20 px-3.5 py-2 bg-chalk text-ink border border-contour-tan rounded-[4px] font-display text-xs uppercase tracking-wider shadow-md hover:border-ink transition-colors cursor-pointer select-none inline-flex items-center gap-1.5"
          >
            <Crosshair size={14} strokeWidth={1.5} aria-hidden="true" /> {t('recenter')}
          </button>
        )}

        {/* Ghost Runner Floating Toggle */}
        <div className="absolute top-16 right-3 z-20">
          <button
            type="button"
            id="btn-toggle-ghost"
            onClick={() => setShowGhostPreview((v) => !v)}
            className="min-h-9 px-3 py-2 bg-chalk text-ink border border-contour-tan rounded-[4px] font-data text-xs uppercase tracking-wider hover:border-ink transition-colors shadow-sm select-none cursor-pointer inline-flex items-center gap-1.5"
          >
            {showGhostPreview ? (
              <>
                <X size={14} strokeWidth={1.5} aria-hidden="true" /> {t('closeGhost')}
              </>
            ) : (
              <>
                <PersonStanding size={14} strokeWidth={1.5} aria-hidden="true" /> {t('previewRunner')}
              </>
            )}
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

        {/* Celebratory Completion Overlay */}
        {isFinished && (
          <div
            id="run-completed-banner"
            data-testid="run-completed-banner"
            className="absolute inset-x-4 top-1/4 z-40 max-w-md mx-auto p-6 bg-chalk border-2 border-trail-orange rounded-[8px] shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-trail-orange/10 flex items-center justify-center text-trail-orange">
              <PartyPopper size={24} strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-lg uppercase tracking-tight text-ink">
                {t('shapeCompleted')}
              </h2>
              <p className="font-body text-xs text-ink/80">
                {t('completedSubtitle')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2 border-y border-contour-tan font-data text-xs">
              <div>
                <span className="text-ink/60 uppercase text-[10px] block">{t('elapsedTime')}</span>
                <span className="font-bold text-ink text-sm">{formatTime(elapsedSeconds)}</span>
              </div>
              <div>
                <span className="text-ink/60 uppercase text-[10px] block">{t('totalDistance')}</span>
                <span className="font-bold text-ink text-sm">{(route.distance_m / 1000).toFixed(2)} km</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-complete-back"
              onClick={handleCancelRun}
              className="w-full py-2.5 bg-ink text-chalk font-display text-xs uppercase tracking-wider rounded-[4px] hover:bg-moss transition-colors cursor-pointer"
            >
              {t('backToRoute')}
            </button>
          </div>
        )}
      </div>

      {/* 4. Bottom Metric HUD & Primary Action Controls (Thumb-Zone Friendly) */}
      <div className="bg-chalk border-t border-contour-tan p-3 z-30 flex flex-wrap items-center justify-between gap-4 select-none shadow-sm">
        <div className="flex items-center gap-6 sm:gap-8">
          <div>
            <span className="text-[11px] text-ink/70 block uppercase tracking-wider font-semibold">
              {t('elapsedTime')}
            </span>
            <span className="font-display text-xl text-ink font-bold">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-ink/70 block uppercase tracking-wider font-semibold">
              {t('totalDistance')}
            </span>
            <span className="font-display text-xl text-ink font-bold">
              {(route.distance_m / 1000).toFixed(2)}{' '}
              <span className="text-xs font-normal">km</span>
            </span>
          </div>
        </div>

        {/* Primary Controls: Pause/Resume (Large Touch Target) + Exit */}
        <div className="flex items-center gap-3">
          {isTracking && !isFinished && (
            <button
              type="button"
              id="btn-toggle-pause"
              data-testid="btn-toggle-pause"
              onClick={handleTogglePause}
              className={`min-h-10 px-5 py-2 rounded-[4px] font-display text-xs uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs ${
                isPaused
                  ? 'bg-moss text-chalk hover:bg-moss/90'
                  : 'bg-paper text-ink border border-contour-tan hover:border-ink'
              }`}
            >
              {isPaused ? (
                <>
                  <Play size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{t('resume')}</span>
                </>
              ) : (
                <>
                  <Pause size={14} strokeWidth={2} aria-hidden="true" />
                  <span>{t('pause')}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            id="btn-exit-run"
            onClick={handleCancelRun}
            className="min-h-10 px-4 py-2 border border-contour-tan text-ink hover:border-ink rounded-[4px] font-display text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            ✕ {t('exitRun')}
          </button>
        </div>
      </div>
    </div>
  );
}
