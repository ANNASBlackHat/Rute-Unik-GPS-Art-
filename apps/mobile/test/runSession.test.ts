import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import { BackgroundLocationManager } from '../services/backgroundLocation';
import { NativeAudioGuide } from '../services/nativeAudioService';
import { RunSessionController } from '../services/runSession';
import { processRouteGpx, FALLBACK_ROUTES } from '../services/routeService';

describe('Phase 4: Run Mode, Background Tracking & Native Audio Ducking', () => {
  describe('BackgroundLocationManager', () => {
    it('manages start, pause, resume, and stop lifecycle', async () => {
      let started = false;
      let stopped = false;

      const mockAdapter = {
        startLocationUpdates: async () => {
          started = true;
        },
        stopLocationUpdates: async () => {
          stopped = true;
        },
        hasStartedLocationUpdates: () => started,
      };

      const manager = new BackgroundLocationManager({ adapter: mockAdapter });

      let receivedTicks = 0;
      await manager.start(
        { title: 'Running Kucing UGM', body: '0 km' },
        () => {
          receivedTicks++;
        }
      );

      assert.strictEqual(started, true);
      assert.strictEqual(manager.isTracking(), true);

      // Process valid location (accuracy 10m <= threshold 30m)
      const processed1 = manager.processIncomingLocation({
        longitude: 110.37,
        latitude: -7.77,
        accuracy: 10,
        timestamp: Date.now(),
      });
      assert.strictEqual(processed1, true);
      assert.strictEqual(receivedTicks, 1);

      // Process inaccurate location (accuracy 45m > threshold 30m) -> Discarded
      const processedInaccurate = manager.processIncomingLocation({
        longitude: 110.37,
        latitude: -7.77,
        accuracy: 45,
        timestamp: Date.now(),
      });
      assert.strictEqual(processedInaccurate, false);
      assert.strictEqual(receivedTicks, 1, 'Inaccurate GPS point must be dropped');

      // Pause tracking
      manager.pause();
      assert.strictEqual(manager.isTracking(), false);
      assert.strictEqual(manager.isTrackingPaused(), true);

      // Ticks while paused are ignored
      manager.processIncomingLocation({
        longitude: 110.37,
        latitude: -7.77,
        accuracy: 5,
        timestamp: Date.now(),
      });
      assert.strictEqual(receivedTicks, 1);

      // Resume tracking
      manager.resume();
      assert.strictEqual(manager.isTracking(), true);

      // Stop tracking
      await manager.stop();
      assert.strictEqual(stopped, true);
      assert.strictEqual(manager.isTracking(), false);
    });

    it('updates foreground notification parameters', async () => {
      const manager = new BackgroundLocationManager();
      await manager.start({ title: 'Rute Unik', body: '0.0 km' }, () => {});

      manager.updateNotification({ body: '1.5 km (25%) • Belok kanan dlm 30m' });
      assert.strictEqual(
        manager.getCurrentNotification().body,
        '1.5 km (25%) • Belok kanan dlm 30m'
      );
    });
  });

  describe('NativeAudioGuide (Audio Focus & Ducking)', () => {
    it('requests and abandons audio focus with ducking on speech cycle', async () => {
      let focusModeRequested: string | null = null;
      let focusAbandoned = false;
      let speechHappened = false;

      const mockFocusManager = {
        requestAudioFocus: (mode: any) => {
          focusModeRequested = mode;
          return true;
        },
        abandonAudioFocus: () => {
          focusAbandoned = true;
        },
      };

      const mockSpeechEngine = {
        speak: async (_text: string, opts: any) => {
          speechHappened = true;
          opts.onDone?.();
        },
        stop: async () => {},
        isSpeaking: () => false,
      };

      const guide = new NativeAudioGuide({
        focusManager: mockFocusManager,
        speechEngine: mockSpeechEngine,
        config: { duckingMode: 'duck', language: 'id-ID' },
      });

      await guide.speakWithDucking('Dalam 30 meter, belok kanan.');

      assert.strictEqual(focusModeRequested, 'duck');
      assert.strictEqual(speechHappened, true);
      assert.strictEqual(focusAbandoned, true);
      assert.strictEqual(guide.getHistory().length, 1);
      assert.strictEqual(guide.getHistory()[0].text, 'Dalam 30 meter, belok kanan.');
    });
  });

  describe('RunSessionController (End-to-End Runner Experience)', () => {
    it('orchestrates complete running session with notifications, milestones, and ducked audio', async () => {
      const gpxPath = path.resolve(__dirname, '../../../examples/kucing-ugm.gpx');
      const gpxRaw = fs.readFileSync(gpxPath, 'utf8');
      const detail = processRouteGpx(FALLBACK_ROUTES[0], gpxRaw);

      let focusRequested = false;
      const audio = new NativeAudioGuide({
        focusManager: {
          requestAudioFocus: () => {
            focusRequested = true;
            return true;
          },
          abandonAudioFocus: () => {},
        },
      });

      const session = new RunSessionController({
        routeId: detail.id,
        routeName: detail.name,
        routeCoords: detail.coordinates,
        turnCues: detail.turnCues,
        audioGuide: audio,
        language: 'id',
      });

      // 1. Start Run -> Speaks welcome announcement
      await session.startRun();
      assert.strictEqual(focusRequested, true);
      const history = audio.getHistory();
      assert.ok(
        history.some((h) => h.text.includes('Mulai berlari')),
        'Expected initial run speech in Indonesian'
      );

      // 2. Feed simulated GPS tick approaching first turn
      const firstTurn = detail.turnCues[0];
      assert.ok(firstTurn);

      // Feed location update
      session.handleLocationUpdate({
        longitude: firstTurn.coordinate[0],
        latitude: firstTurn.coordinate[1],
        accuracy: 8,
        timestamp: Date.now(),
      });

      // Verify notification updated with turn cue
      const notif = session.getLocationManager().getCurrentNotification();
      assert.ok(notif.body.length > 0);

      // 3. Pause and Resume run
      session.pauseRun();
      assert.strictEqual(session.getLocationManager().isTrackingPaused(), true);
      session.resumeRun();
      assert.strictEqual(session.getLocationManager().isTracking(), true);

      // 4. Calculate pace string
      const pace1 = session.calculatePaceString(1000, 300); // 1km in 300s (5m)
      assert.strictEqual(pace1, '05:00');

      const pace2 = session.calculatePaceString(5000, 1500); // 5km in 25m
      assert.strictEqual(pace2, '05:00');

      // 5. Finish Run -> Generates summary
      const summary = await session.finishRun();
      assert.strictEqual(summary.routeName, 'Kucing UGM');
      assert.strictEqual(session.getLocationManager().isTracking(), false);
    });
  });
});
