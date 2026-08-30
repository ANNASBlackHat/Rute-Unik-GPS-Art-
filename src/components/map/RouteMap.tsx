'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MAP_STYLES, type MapStyleKey } from '@/lib/map-style';
import { getKilometerMarks } from '@/lib/geo';
import { ensureMaplibreWorker } from '@/lib/maplibre-worker';

ensureMaplibreWorker();

const STYLE_STORAGE_KEY = 'rute-unik:map-style';

function getInitialStyle(): MapStyleKey {
  if (typeof window === 'undefined') return 'streets';
  const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null;
  return saved === 'satellite' ? 'satellite' : 'streets';
}

interface RouteMapProps {
  coordinates: [number, number][]; // [longitude, latitude]
  className?: string;
  interactive?: boolean;
  onMapReady?: (map: maplibregl.Map) => void;
}

export default function RouteMap({
  coordinates,
  className = 'w-full h-80 sm:h-96',
  interactive = true,
  onMapReady,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  const [styleKey, setStyleKey] = useState<MapStyleKey>('streets');

  useEffect(() => {
    setStyleKey(getInitialStyle());
  }, []);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

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
          paint: {
            'line-color': '#1F2A1E',
            'line-width': 4.5,
            // White halo keeps the ink line readable on satellite imagery
            'line-width-transition': { duration: 0 },
          },
        });
        // Add a subtle halo underneath for satellite contrast (if not already present)
        // We achieve this by painting a wider, semi-transparent white line behind the ink line
        // via a dedicated layer inserted just below the main line.
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
            // layer order may vary; ignore if insertion fails
          }
        }
      }
    },
    [coordinates]
  );

  // Keep initial style in a ref so the map is not torn down on toggle — switching uses setStyle
  const initialStyleRef = useRef<MapStyleKey>(styleKey);
  // Sync initial ref before first mount if localStorage read races the effect above
  if (typeof window !== 'undefined') {
    const saved = window.localStorage.getItem(STYLE_STORAGE_KEY) as MapStyleKey | null;
    if (saved === 'satellite' || saved === 'streets') initialStyleRef.current = saved;
  }

  useEffect(() => {
    if (!mapContainer.current || coordinates.length === 0) return;

    // Calculate bounds
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
      style: MAP_STYLES[initialStyleRef.current],
      center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
      zoom: 13,
      interactive: interactive,
      attributionControl: false,
    });

    mapRef.current = map;
    (window as unknown as { _debugMap?: maplibregl.Map })._debugMap = map;

    if (onMapReadyRef.current) {
      onMapReadyRef.current(map);
    }

    // Add navigation controls if interactive
    if (interactive) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right'
      );
    }

    // Add Start Marker (Moss #5C6E4F)
    const startCoord = coordinates[0];
    const startEl = document.createElement('div');
    startEl.className = 'route-marker start-marker';
    startEl.innerHTML = `
      <div style="background-color: #5C6E4F; color: #F7F5EF; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10;" title="Start">
        S
      </div>
    `;
    new maplibregl.Marker({ element: startEl })
      .setLngLat(startCoord)
      .addTo(map);

    // Add Finish Marker (Trail Orange #E8562C)
    const finishCoord = coordinates[coordinates.length - 1];
    const finishEl = document.createElement('div');
    finishEl.className = 'route-marker finish-marker';
    finishEl.innerHTML = `
      <div style="background-color: #E8562C; color: #F7F5EF; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: bold; border: 2px solid #F7F5EF; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 10;" title="Finish">
        F
      </div>
    `;
    new maplibregl.Marker({ element: finishEl })
      .setLngLat(finishCoord)
      .addTo(map);

    const setupLayers = () => {
      // Fit to route bounds with padding
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16,
        duration: 0,
      });

      ensureRouteLine(map);

      // Per-kilometer distance markers (DOM markers, survive style switches — create only once)
      getKilometerMarks(coordinates).forEach(({ km, position }) => {
        const kmEl = document.createElement('div');
        kmEl.className = 'route-marker km-marker';
        kmEl.innerHTML = `
          <div style="background-color: #F7F5EF; color: #1F2A1E; min-width: 26px; height: 20px; padding: 0 3px; border-radius: 13px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 10px; font-weight: bold; border: 2px solid #1F2A1E; box-shadow: 0 1px 3px rgba(0,0,0,0.25); z-index: 5;" title="${km} km">${km}</div>
        `;
        new maplibregl.Marker({ element: kmEl, anchor: 'center' })
          .setLngLat(position)
          .addTo(map);
      });

      if (onMapReadyRef.current) {
        onMapReadyRef.current(map);
      }

      map.resize();
    };

    // Draw as soon as the style (not the tile data) is ready. Waiting for the
    // full 'load' event stalls indefinitely when tile requests fail or hang,
    // which previously left the route line and markers undrawn.
    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once('style.load', setupLayers);
    }

    // Re-add the ink route line (with halo) after every style switch — setStyle clears custom sources/layers,
    // while DOM markers (S/F/km) persist. This keeps the line visible on both streets and satellite.
    const handleStyleLoad = () => {
      ensureRouteLine(map);
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 16,
        duration: 0,
      });
    };
    map.on('style.load', handleStyleLoad);

    // Resize observer
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
  }, [coordinates, interactive, ensureRouteLine]);

  // Handle style switching without remounting — re-adds ink line on style.load above
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
      // storage may be unavailable
    }
  }, [styleKey]);

  const switchStreets = () => setStyleKey('streets');
  const switchSatellite = () => setStyleKey('satellite');

  return (
    <div className={`relative overflow-hidden rounded-[8px] border border-contour-tan ${className}`}>
      <div
        ref={mapContainer}
        className="w-full h-full"
        data-testid="maplibre-container"
      />
      {/* Style switcher — paper flat, hairline borders, single accent per style-guide */}
      <div className="absolute top-2 left-2 z-10 inline-flex rounded-[4px] border border-contour-tan bg-chalk p-0.5 shadow-sm">
        <button
          type="button"
          onClick={switchStreets}
          aria-pressed={styleKey === 'streets'}
          className={`min-h-9 px-3 py-2 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors ${
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
          className={`min-h-9 px-3 py-2 rounded-[3px] text-xs font-data uppercase tracking-wider transition-colors ${
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
