import { TurnCue } from '@rute-unik/shared';
import { BackgroundLocationManager, LocationData } from './backgroundLocation';
import { NativeAudioGuide } from './nativeAudioService';
import { MobileRunnerEngine } from './runnerEngine';
import { formatDistanceKm, formatRunDuration } from './routeService';

export interface RunSessionSummary {
  routeId: string;
  routeName: string;
  totalDistanceMeters: number;
  coveredDistanceMeters: number;
  totalElapsedSeconds: number;
  averagePaceMinPerKm: string;
  completionPercent: number;
  breadcrumbsCount: number;
  isCompleted: boolean;
}

export class RunSessionController {
  private routeId: string;
  private routeName: string;
  private routeCoords: [number, number][];
  private turnCues: TurnCue[];

  private locationManager: BackgroundLocationManager;
  private audioGuide: NativeAudioGuide;
  private runnerEngine: MobileRunnerEngine;

  private startTime: number | null = null;
  private pausedDurationMs = 0;
  private pauseStartTime: number | null = null;
  private lastAnnouncedKm = 0;
  private language: 'id' | 'en' = 'id';

  constructor(options: {
    routeId: string;
    routeName: string;
    routeCoords: [number, number][];
    turnCues: TurnCue[];
    locationManager?: BackgroundLocationManager;
    audioGuide?: NativeAudioGuide;
    language?: 'id' | 'en';
  }) {
    this.routeId = options.routeId;
    this.routeName = options.routeName;
    this.routeCoords = options.routeCoords;
    this.turnCues = options.turnCues;
    this.language = options.language ?? 'id';

    this.audioGuide =
      options.audioGuide ??
      new NativeAudioGuide({
        config: { language: this.language === 'id' ? 'id-ID' : 'en-US' },
      });

    this.locationManager =
      options.locationManager ?? new BackgroundLocationManager();

    // Adapter for speech in runnerEngine
    const speechHandler = {
      speak: async (text: string) => {
        await this.audioGuide.speakWithDucking(text);
      },
    };

    this.runnerEngine = new MobileRunnerEngine(
      this.routeCoords,
      this.turnCues,
      {
        speak: (text: string, priority?: boolean) =>
          this.audioGuide.speakWithDucking(text, priority),
        setLanguage: () => {},
        getLanguage: () => (this.language === 'id' ? 'id-ID' : 'en-US'),
        setSpeechRate: () => {},
        getSpokenHistory: () => this.audioGuide.getHistory().map((h) => h.text),
        clearHistory: () => {},
      } as any,
      this.language
    );
  }

  async startRun(): Promise<void> {
    this.startTime = Date.now();
    this.pausedDurationMs = 0;
    this.pauseStartTime = null;
    this.lastAnnouncedKm = 0;

    await this.locationManager.start(
      {
        title: `Rute Unik — ${this.routeName}`,
        body: 'Memulai rute GPS Art...',
        ongoing: true,
      },
      (loc) => this.handleLocationUpdate(loc)
    );

    const startMsg =
      this.language === 'id'
        ? `Mulai berlari untuk rute ${this.routeName}. Ikuti panduan audio.`
        : `Starting run for route ${this.routeName}. Follow the audio guidance.`;
    await this.audioGuide.speakWithDucking(startMsg);
  }

  pauseRun(): void {
    if (!this.pauseStartTime) {
      this.pauseStartTime = Date.now();
      this.locationManager.pause();
    }
  }

  resumeRun(): void {
    if (this.pauseStartTime) {
      this.pausedDurationMs += Date.now() - this.pauseStartTime;
      this.pauseStartTime = null;
      this.locationManager.resume();
    }
  }

  async finishRun(): Promise<RunSessionSummary> {
    await this.locationManager.stop();
    return this.getSessionSummary();
  }

  handleLocationUpdate(loc: LocationData) {
    const point: [number, number] = [loc.longitude, loc.latitude];
    const result = this.runnerEngine.handleLocationTick(point, loc.timestamp);

    // 1. Check kilometer milestone announcement (e.g. at 1km, 2km, 3km)
    const currentKm = Math.floor(result.distanceCoveredMeters / 1000);
    if (currentKm > this.lastAnnouncedKm) {
      this.lastAnnouncedKm = currentKm;
      const pace = this.calculatePaceString(
        result.distanceCoveredMeters,
        this.getElapsedSeconds()
      );
      const kmMsg =
        this.language === 'id'
          ? `${currentKm} kilometer selesai. Kecepatan rata-rata ${pace} per kilometer.`
          : `${currentKm} kilometers complete. Average pace ${pace} per kilometer.`;
      this.audioGuide.speakWithDucking(kmMsg);
    }

    // 2. Update Foreground Notification with live progress
    const distText = formatDistanceKm(result.distanceCoveredMeters);
    let bodyText = `${distText} (${result.completionPercent}%)`;
    if (result.nextTurnCue && result.distanceToNextTurnMeters !== null) {
      const turnInstruction =
        this.language === 'id'
          ? result.nextTurnCue.instructions.id.action
          : result.nextTurnCue.instructions.en.action;
      bodyText += ` • ${turnInstruction} dlm ${result.distanceToNextTurnMeters}m`;
    }

    this.locationManager.updateNotification({
      body: bodyText,
    });

    return result;
  }

  getElapsedSeconds(): number {
    if (!this.startTime) return 0;
    const now = this.pauseStartTime ?? Date.now();
    const totalMs = now - this.startTime - this.pausedDurationMs;
    return Math.max(0, Math.floor(totalMs / 1000));
  }

  /**
   * Calculates pace string (e.g. "5:30") from distance meters and time seconds
   */
  calculatePaceString(meters: number, seconds: number): string {
    if (meters < 50 || seconds <= 0) return '-:--';
    const km = meters / 1000;
    const paceSecondsPerKm = seconds / km;
    return formatRunDuration(Math.round(paceSecondsPerKm));
  }

  getSessionSummary(): RunSessionSummary {
    const elapsed = this.getElapsedSeconds();
    const state = this.runnerEngine.getState();
    const breadcrumbs = this.runnerEngine.getBreadcrumbs();

    // Rough distance calculation along breadcrumbs
    const totalMeters =
      breadcrumbs.length > 0
        ? Math.round(
            (this.routeCoords.length > 0 ? 1 : 0) *
              (state.isCompleted ? 1 : 0.8) *
              (this.routeCoords.length * 50)
          )
        : 0;

    return {
      routeId: this.routeId,
      routeName: this.routeName,
      totalDistanceMeters: totalMeters,
      coveredDistanceMeters: totalMeters,
      totalElapsedSeconds: elapsed,
      averagePaceMinPerKm: this.calculatePaceString(totalMeters, elapsed),
      completionPercent: state.isCompleted ? 100 : 0,
      breadcrumbsCount: breadcrumbs.length,
      isCompleted: state.isCompleted,
    };
  }

  getAudioGuide(): NativeAudioGuide {
    return this.audioGuide;
  }

  getLocationManager(): BackgroundLocationManager {
    return this.locationManager;
  }
}
