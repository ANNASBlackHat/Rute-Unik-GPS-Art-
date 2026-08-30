import type { StyleSpecification } from 'maplibre-gl';

/**
 * Free, high-performance OpenStreetMap / CARTO Voyager basemap style.
 * Requires NO API key, loads globally at lightning speed,
 * and renders clear street names, roads, landmarks, and city topography.
 */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: [
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
