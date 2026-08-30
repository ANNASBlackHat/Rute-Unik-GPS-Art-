'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ensureMaplibreWorker } from '@/lib/maplibre-worker';
import { MAP_STYLES, type MapStyleKey } from '@/lib/map-style';

ensureMaplibreWorker();

const STYLE_STORAGE_KEY = 'rute-unik:map-style';

function getInitialStyle(): MapStyleKey {
  if (typeof window === 'undefined') return 'streets';
  const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null;
  return saved === 'satellite' ? 'satellite' : 'streets';
}

interface RunMapProps {
  coordinates: [number, number][]; // route polyline [lon, lat]
  currentPosition: [number, number] | null; // [lon, lat]
  accuracyMeters?: number | null;
  shouldRecenter?: boolean;
  onRecenterComplete?: () => void;
  onMapReady?: (map: maplibregl.Map) => void;
  className?: string;
}

export default function RunMap({
  coordinates,
  currentPosition,
  accuracyMeters,
  shouldRecenter,
  onRecenterComplete,
  onMapReady,
  className = 'w-full h-full min-h-[400px]',
}: RunMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const runnerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [styleKey, setStyleKey] = useState<MapStyleKey>('streets');

  useEffect(() => {
    setStyleKey(getInitialStyle());
  }, []);

  const ensureRouteLine = useCallback(
    (map: maplibregl.Map) => {
      if (!map.getSource('route-line')) {
        map.addSource('route-line', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          },
        });
      }
      if (!map.getLayer('route-line-layer')) {
        map.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#1F2A1E', 'line-width': 5 },
        });
        if (!map.getLayer('route-line-halo')) {
          try {
            map.addLayer(
              {
                id: 'route-line-halo',
                type: 'line',
                source: 'route-line',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#F7F5EF', 'line-width': 7, 'line-opacity': 0.9 },
              },
              'route-line-layer'
            );
          } catch {
            // ignore
          }
        }
      }
    },
    [coordinates]
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || coordinates.length === 0) return;

    let minLon = coordinates[0][0];
    let maxLon = coordinates[0][0];
    let minLat = coordinates[0][1];
    let maxLat = coordinates[0][1];

    for (const [lon, lat] of coordinates) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    const bounds: [number, number, number, number] = [
      minLon,
      minLat,
      maxLon,
      maxLat,
    ];

    const initialStyle =
      (typeof window !== 'undefined' &&
        (window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null)) ||
      'streets';
    const resolvedStyle: MapStyleKey = initialStyle === 'satellite' ? 'satellite' : 'streets';
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[resolvedStyle],
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
      zoom: 14,
      attributionControl: false,
    });

    mapRef.current = map;

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true }),
      'top-right'
    );

    // Add Start Marker (Moss)
    const startCoord = coordinates[0];
    const startEl = document.createElement('div');
    startEl.className = 'route-marker start-marker';
    startEl.innerHTML = `
      <div style="background-color: #5C6E4F; color: #F7F5EF; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3);" title="Start">
        S
      </div>
    `;
    new maplibregl.Marker({ element: startEl })
      .setLngLat(startCoord)
      .addTo(map);

    // Add Finish Marker (Trail Orange)
    const finishCoord = coordinates[coordinates.length - 1];
    const finishEl = document.createElement('div');
    finishEl.className = 'route-marker finish-marker';
    finishEl.innerHTML = `
      <div style="background-color: #E8562C; color: #F7F5EF; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3);" title="Finish">
        F
      </div>
    `;
    new maplibregl.Marker({ element: finishEl })
      .setLngLat(finishCoord)
      .addTo(map);

    const setupRouteLayer = () => {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
        duration: 0,
      });

      ensureRouteLine(map);

      if (onMapReady) {
        onMapReady(map);
      }
    };

    if (map.isStyleLoaded()) {
      setupRouteLayer();
    } else {
      map.once('style.load', setupRouteLayer);
    }

    const handleStyleLoad = () => {
      ensureRouteLine(map);
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
        duration: 0,
      });
    };
    map.on('style.load', handleStyleLoad);

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }

    return () => {
      map.off('style.load', handleStyleLoad);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, onMapReady, ensureRouteLine]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const current = (map.getStyle() as unknown as { sources?: Record<string, unknown> })?.sources;
    const isSatellite = !!current?.['satellite-tiles'];
    const wantSatellite = styleKey === 'satellite';
    if (isSatellite === wantSatellite) return;
    map.setStyle(MAP_STYLES[styleKey]);
    try {
      window.localStorage.setItem(STYLE_STORAGE_KEY, styleKey);
    } catch {
      // ignore
    }
  }, [styleKey]);

  // Handle live runner position dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!currentPosition) {
      if (runnerMarkerRef.current) {
        runnerMarkerRef.current.remove();
        runnerMarkerRef.current = null;
      }
      return;
    }

    if (!runnerMarkerRef.current) {
      const runnerEl = document.createElement('div');
      runnerEl.id = 'live-runner-dot';
      runnerEl.className = 'live-runner-dot';
      runnerEl.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background-color: #E8562C; opacity: 0.35; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background-color: #E8562C; border: 2.5px solid #F7F5EF; box-shadow: 0 0 8px rgba(232, 86, 44, 0.8);"></div>
        </div>
      `;

      const marker = new maplibregl.Marker({ element: runnerEl })
        .setLngLat(currentPosition)
        .addTo(map);

      runnerMarkerRef.current = marker;
    } else {
      runnerMarkerRef.current.setLngLat(currentPosition);
    }
  }, [currentPosition, accuracyMeters]);

  // Handle re-center trigger
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !shouldRecenter || !currentPosition) return;

    map.flyTo({
      center: currentPosition,
      zoom: 16.5,
      speed: 1.5,
      curve: 1,
      essential: true,
    });

    if (onRecenterComplete) {
      onRecenterComplete();
    }
  }, [shouldRecenter, currentPosition, onRecenterComplete]);

  return (
    <div className={`relative overflow-hidden rounded-[8px] border border-contour-tan ${className}`}>
      <div
        ref={mapContainer}
        className="w-full h-full"
        data-testid="run-map-container"
      />
      <div className="absolute bottom-2 left-2 z-10 inline-flex rounded-[4px] border border-contour-tan bg-chalk p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setStyleKey('streets')}
          aria-pressed={styleKey === 'streets'}
          className={`px-2.5 py-1 rounded-[3px] text-[11px] font-data uppercase tracking-wider transition-colors ${
            styleKey === 'streets' ? 'bg-ink text-chalk font-bold' : 'text-ink/70 hover:text-ink hover:bg-paper/60'
          }`}
        >
          Streets
        </button>
        <button
          type="button"
          onClick={() => setStyleKey('satellite')}
          aria-pressed={styleKey === 'satellite'}
          className={`px-2.5 py-1 rounded-[3px] text-[11px] font-data uppercase tracking-wider transition-colors ${
            styleKey === 'satellite' ? 'bg-ink text-chalk font-bold' : 'text-ink/70 hover:text-ink hover:bg-paper/60'
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
