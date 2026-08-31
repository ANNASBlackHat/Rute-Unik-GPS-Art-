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
  try {
    const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null;
    return saved === 'satellite' ? 'satellite' : 'streets';
  } catch {
    return 'streets';
  }
}

interface RunMapProps {
  coordinates: [number, number][]; // route polyline [lon, lat]
  currentPosition: [number, number] | null; // [lon, lat]
  userBreadcrumbs?: [number, number][]; // recorded runner path so far
  accuracyMeters?: number | null;
  shouldRecenter?: boolean;
  onRecenterComplete?: () => void;
  onMapReady?: (map: maplibregl.Map) => void;
  className?: string;
}

export default function RunMap({
  coordinates,
  currentPosition,
  userBreadcrumbs,
  shouldRecenter,
  onRecenterComplete,
  onMapReady,
  className = 'w-full h-full min-h-[400px]',
}: RunMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const runnerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [styleKey, setStyleKey] = useState<MapStyleKey>(getInitialStyle);

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
          paint: { 'line-color': '#1F2A1E', 'line-width': 4.5, 'line-opacity': 0.65 },
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

      // Add user breadcrumbs (traced GPS art line) layer
      if (!map.getSource('user-breadcrumbs')) {
        map.addSource('user-breadcrumbs', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features:
              userBreadcrumbs && userBreadcrumbs.length > 1
                ? [
                    {
                      type: 'Feature',
                      properties: {},
                      geometry: {
                        type: 'LineString',
                        coordinates: userBreadcrumbs,
                      },
                    },
                  ]
                : [],
          },
        });
      }

      if (!map.getLayer('user-breadcrumbs-layer')) {
        map.addLayer({
          id: 'user-breadcrumbs-layer',
          type: 'line',
          source: 'user-breadcrumbs',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#E8562C',
            'line-width': 5.5,
          },
        });
      }
    },
    [coordinates, userBreadcrumbs]
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

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[styleKey],
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

    const setupLayers = () => {
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom: 16,
        duration: 0,
      });

      ensureRouteLine(map);

      if (onMapReady) {
        onMapReady(map);
      }
      map.resize();
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }

    const handleStyleLoad = () => {
      ensureRouteLine(map);
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
      if (runnerMarkerRef.current) {
        runnerMarkerRef.current.remove();
        runnerMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, ensureRouteLine, onMapReady, styleKey]);

  // Update Breadcrumbs layer when runner path changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('user-breadcrumbs') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features:
          userBreadcrumbs && userBreadcrumbs.length > 1
            ? [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: userBreadcrumbs,
                  },
                },
              ]
            : [],
      });
    }
  }, [userBreadcrumbs]);

  // Update Runner Position Marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition) return;

    if (!runnerMarkerRef.current) {
      const runnerEl = document.createElement('div');
      runnerEl.className = 'live-runner-marker';
      runnerEl.innerHTML = `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: rgba(232, 86, 44, 0.25); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 18px; height: 18px; border-radius: 50%; background-color: #E8562C; border: 3px solid #F7F5EF; box-shadow: 0 2px 4px rgba(0,0,0,0.3); z-index: 10;"></div>
        </div>
      `;

      runnerMarkerRef.current = new maplibregl.Marker({
        element: runnerEl,
        anchor: 'center',
      })
        .setLngLat(currentPosition)
        .addTo(map);
    } else {
      runnerMarkerRef.current.setLngLat(currentPosition);
    }
  }, [currentPosition]);

  // Handle Recenter
  useEffect(() => {
    if (shouldRecenter && mapRef.current && currentPosition) {
      mapRef.current.flyTo({
        center: currentPosition,
        zoom: Math.max(mapRef.current.getZoom(), 15),
        duration: 800,
      });
      if (onRecenterComplete) {
        onRecenterComplete();
      }
    }
  }, [shouldRecenter, currentPosition, onRecenterComplete]);

  // Handle style toggle
  const switchStreets = () => {
    setStyleKey('streets');
    try {
      window.localStorage.setItem(STYLE_STORAGE_KEY, 'streets');
    } catch {}
  };

  const switchSatellite = () => {
    setStyleKey('satellite');
    try {
      window.localStorage.setItem(STYLE_STORAGE_KEY, 'satellite');
    } catch {}
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[8px] border border-contour-tan ${className}`}
    >
      <div
        ref={mapContainer}
        className="w-full h-full"
        data-testid="live-run-maplibre"
      />

      {/* Style Switcher Controls */}
      <div className="absolute top-2 left-2 z-10 inline-flex rounded-[4px] border border-contour-tan bg-chalk p-0.5 shadow-sm">
        <button
          type="button"
          onClick={switchStreets}
          aria-pressed={styleKey === 'streets'}
          className={`min-h-8 px-2.5 py-1 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors cursor-pointer ${
            styleKey === 'streets'
              ? 'bg-ink text-chalk font-bold'
              : 'text-ink/70 hover:text-ink hover:bg-paper/60'
          }`}
        >
          Streets
        </button>
        <button
          type="button"
          onClick={switchSatellite}
          aria-pressed={styleKey === 'satellite'}
          className={`min-h-8 px-2.5 py-1 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors cursor-pointer ${
            styleKey === 'satellite'
              ? 'bg-ink text-chalk font-bold'
              : 'text-ink/70 hover:text-ink hover:bg-paper/60'
          }`}
        >
          Satellite
        </button>
      </div>
    </div>
  );
}
