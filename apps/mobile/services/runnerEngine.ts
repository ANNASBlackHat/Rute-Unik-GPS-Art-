import {
  evaluateNavigationStep,
  NavigationState,
  NavigationStepResult,
  TurnCue,
} from '@rute-unik/shared';
import { AudioGuideService } from './audioService';

export class MobileRunnerEngine {
  private routeCoords: [number, number][];
  private turnCues: TurnCue[];
  private audioService: AudioGuideService;
  private state: NavigationState;
  private language: 'id' | 'en' = 'id';
  private breadcrumbs: [number, number][] = [];

  constructor(
    routeCoords: [number, number][],
    turnCues: TurnCue[],
    audioService: AudioGuideService,
    language: 'id' | 'en' = 'id'
  ) {
    this.routeCoords = routeCoords;
    this.turnCues = turnCues;
    this.audioService = audioService;
    this.language = language;
    this.state = {
      offRouteConsecutiveTicks: 0,
      wasOffRoute: false,
      isCompleted: false,
    };
  }

  /**
   * Called on every GPS location update.
   * Evaluates navigation step and automatically triggers audio cues through AudioGuideService.
   */
  handleLocationTick(
    currentPos: [number, number],
    timestamp?: number
  ): NavigationStepResult {
    this.breadcrumbs.push(currentPos);

    const stepResult = evaluateNavigationStep(
      currentPos,
      this.routeCoords,
      this.turnCues,
      this.state,
      { nowTimestamp: timestamp }
    );

    this.state = stepResult.nextState;

    // Speak triggered events through audio service
    for (const event of stepResult.events) {
      const message =
        this.language === 'id' ? event.messageId : event.messageEn;
      const isPriority =
        event.type === 'off_route' || event.type === 'action_turn';
      this.audioService.speak(message, isPriority);
    }

    return stepResult;
  }

  getBreadcrumbs(): [number, number][] {
    return [...this.breadcrumbs];
  }

  getState(): NavigationState {
    return { ...this.state };
  }

  setLanguage(lang: 'id' | 'en'): void {
    this.language = lang;
    this.audioService.setLanguage(lang === 'id' ? 'id-ID' : 'en-US');
  }
}
