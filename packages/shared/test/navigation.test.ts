import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  calculateBearing,
  calculateTurnAngle,
  classifyTurn,
  getTurnInstructions,
  extractTurnCues,
  evaluateNavigationStep,
  NavigationState,
} from '../src/navigation';
import { parseGpxCoordinates } from '../src/geo';

describe('Turn-by-Turn Navigation Engine', () => {
  describe('calculateBearing', () => {
    it('calculates cardinal bearings accurately', () => {
      // Due North: lat increases, lon stays same
      const north = calculateBearing([110.0, -7.0], [110.0, -6.0]);
      assert.ok(Math.abs(north - 0) < 0.5 || Math.abs(north - 360) < 0.5);

      // Due East: lon increases, lat stays same
      const east = calculateBearing([110.0, -7.0], [111.0, -7.0]);
      assert.ok(Math.abs(east - 90) < 0.5);

      // Due South: lat decreases, lon stays same
      const south = calculateBearing([110.0, -6.0], [110.0, -7.0]);
      assert.ok(Math.abs(south - 180) < 0.5);

      // Due West: lon decreases, lat stays same
      const west = calculateBearing([111.0, -7.0], [110.0, -7.0]);
      assert.ok(Math.abs(west - 270) < 0.5);
    });
  });

  describe('calculateTurnAngle & classifyTurn', () => {
    it('accurately identifies right and left turns across 0/360 boundary', () => {
      // 0 deg -> 90 deg = +90 deg (Right)
      const rightAngle = calculateTurnAngle(0, 90);
      assert.strictEqual(rightAngle, 90);
      assert.strictEqual(classifyTurn(rightAngle), 'right');

      // 90 deg -> 0 deg = -90 deg (Left)
      const leftAngle = calculateTurnAngle(90, 0);
      assert.strictEqual(leftAngle, -90);
      assert.strictEqual(classifyTurn(leftAngle), 'left');

      // 350 deg -> 20 deg = +30 deg (Slight Right crossing 0 boundary)
      const slightRightAcrossNorth = calculateTurnAngle(350, 20);
      assert.strictEqual(slightRightAcrossNorth, 30);
      assert.strictEqual(classifyTurn(slightRightAcrossNorth), 'slight_right');

      // 10 deg -> 340 deg = -30 deg (Slight Left crossing 0 boundary)
      const slightLeftAcrossNorth = calculateTurnAngle(10, 340);
      assert.strictEqual(slightLeftAcrossNorth, -30);
      assert.strictEqual(classifyTurn(slightLeftAcrossNorth), 'slight_left');

      // 0 deg -> 140 deg = +140 deg (Sharp Right)
      assert.strictEqual(classifyTurn(140), 'sharp_right');

      // 0 deg -> -140 deg = -140 deg (Sharp Left)
      assert.strictEqual(classifyTurn(-140), 'sharp_left');

      // U-turn (175 deg)
      assert.strictEqual(classifyTurn(175), 'u_turn');
      assert.strictEqual(classifyTurn(-175), 'u_turn');

      // Straight (within 20 deg)
      assert.strictEqual(classifyTurn(15), 'straight');
      assert.strictEqual(classifyTurn(-15), 'straight');
    });

    it('generates bilingual instructions for all turn types', () => {
      const instructions = getTurnInstructions('right', 30);
      assert.ok(instructions.en.advance.includes('30 meters'));
      assert.ok(instructions.en.advance.includes('turn right'));
      assert.ok(instructions.id.advance.includes('30 meter'));
      assert.ok(instructions.id.advance.includes('belok kanan'));
      assert.strictEqual(instructions.en.action, 'Turn right now.');
      assert.strictEqual(instructions.id.action, 'Belok kanan sekarang.');
    });
  });

  describe('extractTurnCues from Real Route', () => {
    it('extracts significant turn cues from examples/kucing-ugm.gpx', () => {
      const gpxPath = path.resolve(__dirname, '../../../examples/kucing-ugm.gpx');
      const gpxContent = fs.readFileSync(gpxPath, 'utf8');
      const coords = parseGpxCoordinates(gpxContent);

      assert.ok(coords.length > 50, 'Should parse more than 50 track points');

      const cues = extractTurnCues(coords, {
        minSegmentMeters: 15,
        minTurnAngleDegrees: 25,
      });

      assert.ok(cues.length >= 5, `Expected at least 5 turns, found ${cues.length}`);

      // Verify each cue structure
      for (const cue of cues) {
        assert.ok(cue.id);
        assert.ok(cue.distanceFromStartMeters > 0);
        assert.ok(cue.turnAngle !== 0);
        assert.ok(cue.instructions.en.advance);
        assert.ok(cue.instructions.id.advance);
      }

      // Verify cues are in ascending order of distance
      for (let i = 0; i < cues.length - 1; i++) {
        assert.ok(
          cues[i].distanceFromStartMeters <= cues[i + 1].distanceFromStartMeters,
          'Turn cues must be ordered by distance from start'
        );
      }
    });
  });

  describe('evaluateNavigationStep (Live Runner Simulation)', () => {
    const routeCoords: [number, number][] = [
      [110.370, -7.770], // Start (0m)
      [110.370, -7.769], // Head North ~111m
      [110.371, -7.769], // Turn East (Right ~90 deg) at ~111m
      [110.371, -7.768], // Turn North (Left ~90 deg) at ~222m
    ];

    const turnCues = extractTurnCues(routeCoords, {
      minSegmentMeters: 10,
      minTurnAngleDegrees: 25,
    });

    it('manages state, advance triggers, action triggers, and off-route warnings', () => {
      assert.ok(turnCues.length >= 1, 'Should have extracted at least 1 turn cue');
      const firstTurn = turnCues[0];

      let navState: NavigationState = {
        offRouteConsecutiveTicks: 0,
        wasOffRoute: false,
        isCompleted: false,
      };

      // 1. Runner at start (0m) -> No events
      const resStart = evaluateNavigationStep(
        [110.370, -7.770],
        routeCoords,
        turnCues,
        navState
      );
      assert.strictEqual(resStart.events.length, 0);
      assert.strictEqual(resStart.isOffRoute, false);
      assert.strictEqual(resStart.completionPercent, 0);
      navState = resStart.nextState;

      // 2. Runner approaches first turn ~30m away
      // First turn is at [110.370, -7.769]. Let's place runner ~30m south of it.
      // -7.769 is turn. 30m south = ~ -7.76927
      const resAdvance = evaluateNavigationStep(
        [110.370, -7.76927],
        routeCoords,
        turnCues,
        navState
      );

      const advanceEvent = resAdvance.events.find((e) => e.type === 'advance_turn');
      assert.ok(advanceEvent, 'Should trigger advance turn warning');
      assert.ok(advanceEvent.messageEn.includes('turn right'));
      assert.ok(advanceEvent.messageId.includes('belok kanan'));
      navState = resAdvance.nextState;

      // 3. Runner takes another step ~25m away -> Should NOT re-trigger advance turn (deduplicated)
      const resDedupe = evaluateNavigationStep(
        [110.370, -7.76922],
        routeCoords,
        turnCues,
        navState
      );
      assert.strictEqual(
        resDedupe.events.filter((e) => e.type === 'advance_turn').length,
        0,
        'Advance turn must not repeat for same cue'
      );
      navState = resDedupe.nextState;

      // 4. Runner arrives at turn (< 8m away) -> Triggers action cue
      const resAction = evaluateNavigationStep(
        [110.370, -7.76905],
        routeCoords,
        turnCues,
        navState
      );
      const actionEvent = resAction.events.find((e) => e.type === 'action_turn');
      assert.ok(actionEvent, 'Should trigger immediate action turn cue');
      assert.strictEqual(actionEvent.messageEn, 'Turn right now.');
      assert.strictEqual(actionEvent.messageId, 'Belok kanan sekarang.');
      navState = resAction.nextState;

      // 5. Runner strays 50m off route (West into empty area)
      // Tick 1: detects off-route, increments tick counter
      const resOff1 = evaluateNavigationStep(
        [110.3695, -7.7690],
        routeCoords,
        turnCues,
        navState,
        { nowTimestamp: 1000 }
      );
      assert.strictEqual(resOff1.isOffRoute, true);
      navState = resOff1.nextState;

      // Tick 2: consecutive tick confirms off-route -> triggers warning event
      const resOff2 = evaluateNavigationStep(
        [110.3695, -7.7690],
        routeCoords,
        turnCues,
        navState,
        { nowTimestamp: 2000 }
      );
      const offEvent = resOff2.events.find((e) => e.type === 'off_route');
      assert.ok(offEvent, 'Should trigger off_route alert event');
      assert.ok(offEvent.messageEn.includes('off route'));
      assert.ok(offEvent.messageId.includes('keluar rute'));
      navState = resOff2.nextState;

      // 6. Runner returns back to route coordinate
      const resBack = evaluateNavigationStep(
        [110.3705, -7.7690],
        routeCoords,
        turnCues,
        navState,
        { nowTimestamp: 5000 }
      );
      const backEvent = resBack.events.find((e) => e.type === 'back_on_route');
      assert.ok(backEvent, 'Should trigger back_on_route event');
      navState = resBack.nextState;

      // 7. Runner reaches the finish point [110.371, -7.768]
      const resFinish = evaluateNavigationStep(
        [110.371, -7.768],
        routeCoords,
        turnCues,
        navState,
        { nowTimestamp: 10000 }
      );
      const finishEvent = resFinish.events.find((e) => e.type === 'route_completed');
      assert.ok(finishEvent, 'Should trigger route_completed event');
      assert.strictEqual(resFinish.completionPercent, 100);
    });
  });
});
