import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  FALLBACK_ROUTES,
  filterRoutes,
  processRouteGpx,
  formatDistanceKm,
  formatRunDuration,
} from '../services/routeService';
import { AudioGuideService } from '../services/audioService';
import { MobileRunnerEngine } from '../services/runnerEngine';

describe('Mobile App Services & Navigation Integration', () => {
  describe('routeService', () => {
    it('filters routes by text query', () => {
      const results = filterRoutes(FALLBACK_ROUTES, { query: 'kucing' });
      assert.ok(results.length >= 2);
      for (const r of results) {
        assert.ok(r.name.toLowerCase().includes('kucing'));
      }
    });

    it('filters routes by city', () => {
      const results = filterRoutes(FALLBACK_ROUTES, { city: 'Bandung' });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].city, 'Bandung');
    });

    it('filters routes by max distance', () => {
      const results = filterRoutes(FALLBACK_ROUTES, { maxDistanceKm: 5.5 });
      for (const r of results) {
        assert.ok(r.distanceMeters <= 5500);
      }
    });

    it('filters routes by shape category', () => {
      const results = filterRoutes(FALLBACK_ROUTES, { shapeCategory: 'symbol' });
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].shapeCategory, 'symbol');
    });

    it('formats distance and run duration accurately', () => {
      assert.strictEqual(formatDistanceKm(6540), '6.5 km');
      assert.strictEqual(formatDistanceKm(10000), '10.0 km');

      assert.strictEqual(formatRunDuration(45), '00:45');
      assert.strictEqual(formatRunDuration(125), '02:05');
      assert.strictEqual(formatRunDuration(3665), '1:01:05');
    });

    it('processes raw GPX into mobile route detail with turn cues', () => {
      const gpxPath = path.resolve(__dirname, '../../../examples/kucing-ugm.gpx');
      const gpxRaw = fs.readFileSync(gpxPath, 'utf8');

      const routeItem = FALLBACK_ROUTES[0];
      const detail = processRouteGpx(routeItem, gpxRaw);

      assert.ok(detail.coordinates.length > 50);
      assert.ok(detail.turnCues.length >= 5);
      assert.strictEqual(detail.totalTurns, detail.turnCues.length);
      assert.strictEqual(detail.name, 'Kucing UGM');
    });
  });

  describe('audioService', () => {
    it('manages speech rate, language, and logs speech history', async () => {
      const audio = new AudioGuideService();

      assert.strictEqual(audio.getLanguage(), 'id-ID');
      audio.setLanguage('en-US');
      assert.strictEqual(audio.getLanguage(), 'en-US');

      await audio.speak('Hello runner!');
      await audio.speak('Turn right in 30 meters.');

      const history = audio.getSpokenHistory();
      assert.strictEqual(history.length, 2);
      assert.strictEqual(history[0], 'Hello runner!');
      assert.strictEqual(history[1], 'Turn right in 30 meters.');

      audio.clearHistory();
      assert.strictEqual(audio.getSpokenHistory().length, 0);
    });

    it('handles priority speech stopping previous utterance', async () => {
      let stopCalled = false;
      const customHandler = {
        speak: () => {},
        stop: () => {
          stopCalled = true;
        },
      };

      const audio = new AudioGuideService(customHandler);
      await audio.speak('Off route warning!', true);

      assert.strictEqual(stopCalled, true);
    });
  });

  describe('MobileRunnerEngine (End-to-End Live Navigation & Voice)', () => {
    const routeCoords: [number, number][] = [
      [110.370, -7.770], // Start (0m)
      [110.370, -7.769], // Head North ~111m -> Turn East (Right ~90 deg)
      [110.371, -7.769], // Turn North (Left ~90 deg) at ~222m
      [110.371, -7.768], // Finish at ~333m
    ];

    it('feeds GPS ticks into engine and triggers Indonesian voice cues', () => {
      const gpxPath = path.resolve(__dirname, '../../../examples/kucing-ugm.gpx');
      const gpxRaw = fs.readFileSync(gpxPath, 'utf8');
      const detail = processRouteGpx(FALLBACK_ROUTES[0], gpxRaw);

      const audio = new AudioGuideService();
      const engine = new MobileRunnerEngine(
        routeCoords,
        detail.turnCues,
        audio,
        'id' // Indonesian
      );

      // 1. Tick at start
      const tick1 = engine.handleLocationTick([110.370, -7.770]);
      assert.strictEqual(tick1.isOffRoute, false);
      assert.strictEqual(audio.getSpokenHistory().length, 0);

      // 2. Tick 25m off route (Tick 1)
      engine.handleLocationTick([110.369, -7.769], 1000);
      // Tick 25m off route (Tick 2 consecutive) -> Triggers alert
      engine.handleLocationTick([110.369, -7.769], 2000);

      const historyAfterOffRoute = audio.getSpokenHistory();
      assert.ok(
        historyAfterOffRoute.some((msg) => msg.includes('keluar rute')),
        'Expected off-route voice alert in Indonesian'
      );

      // 3. Switch language to English and return to route
      engine.setLanguage('en');
      engine.handleLocationTick([110.370, -7.7695], 4000);

      const historyAfterBack = audio.getSpokenHistory();
      assert.ok(
        historyAfterBack.some((msg) => msg.includes('Back on route')),
        'Expected back-on-route voice alert in English'
      );

      // 4. Reach finish point
      engine.handleLocationTick([110.371, -7.768], 6000);
      const finalHistory = audio.getSpokenHistory();
      assert.ok(
        finalHistory.some((msg) => msg.includes('completed the route')),
        'Expected completion announcement in English'
      );
    });
  });
});
