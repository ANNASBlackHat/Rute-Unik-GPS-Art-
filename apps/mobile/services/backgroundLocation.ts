export const BACKGROUND_RUN_TASK_NAME = 'RUTE_UNIK_BACKGROUND_RUN_TRACKER';

export interface LocationData {
  longitude: number;
  latitude: number;
  accuracy: number; // in meters
  altitude?: number | null;
  speed?: number | null; // meters per second
  heading?: number | null;
  timestamp: number;
}

export interface ForegroundNotificationData {
  title: string;
  body: string;
  color?: string;
  ongoing?: boolean;
}

export interface BackgroundLocationAdapter {
  startLocationUpdates: (
    taskName: string,
    options: {
      accuracy: number;
      timeInterval: number;
      distanceInterval: number;
      foregroundService: {
        notificationTitle: string;
        notificationBody: string;
        notificationColor?: string;
      };
    },
    onTick?: (loc: LocationData) => void
  ) => Promise<void> | void;
  stopLocationUpdates: (taskName: string) => Promise<void> | void;
  hasStartedLocationUpdates: (taskName: string) => Promise<boolean> | boolean;
}

export class BackgroundLocationManager {
  private adapter: BackgroundLocationAdapter;
  private isTrackingActive = false;
  private isPaused = false;
  private maxAccuracyThresholdMeters: number;
  private onLocationTick?: (loc: LocationData) => void;
  private currentNotification: ForegroundNotificationData = {
    title: 'Rute Unik — Mode Lari',
    body: 'Memulai pelacakan rute...',
    color: '#10B981',
    ongoing: true,
  };

  constructor(options?: {
    adapter?: BackgroundLocationAdapter;
    maxAccuracyThresholdMeters?: number; // default 30m
  }) {
    this.maxAccuracyThresholdMeters =
      options?.maxAccuracyThresholdMeters ?? 30;

    // Default mock adapter for headless/testing
    this.adapter = options?.adapter ?? {
      startLocationUpdates: async () => {},
      stopLocationUpdates: async () => {},
      hasStartedLocationUpdates: async () => this.isTrackingActive,
    };
  }

  async start(
    initialNotification: ForegroundNotificationData,
    onTick: (loc: LocationData) => void
  ): Promise<void> {
    this.currentNotification = initialNotification;
    this.onLocationTick = onTick;
    this.isTrackingActive = true;
    this.isPaused = false;

    await this.adapter.startLocationUpdates(
      BACKGROUND_RUN_TASK_NAME,
      {
        accuracy: 6, // BestForNavigation in expo-location
        timeInterval: 1000,
        distanceInterval: 1,
        foregroundService: {
          notificationTitle: initialNotification.title,
          notificationBody: initialNotification.body,
          notificationColor: initialNotification.color ?? '#10B981',
        },
      },
      (loc) => {
        this.processIncomingLocation(loc);
      }
    );
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  async stop(): Promise<void> {
    this.isTrackingActive = false;
    this.isPaused = false;
    this.onLocationTick = undefined;
    await this.adapter.stopLocationUpdates(BACKGROUND_RUN_TASK_NAME);
  }

  /**
   * Dispatches a raw location tick to the runner engine if:
   * 1. Tracking is active
   * 2. Not paused
   * 3. GPS accuracy passes the filter threshold
   */
  processIncomingLocation(raw: LocationData): boolean {
    if (!this.isTrackingActive || this.isPaused) {
      return false;
    }

    // Accuracy filter: discard low-confidence / multipath GPS noise
    if (raw.accuracy > this.maxAccuracyThresholdMeters) {
      return false;
    }

    this.onLocationTick?.(raw);
    return true;
  }

  updateNotification(data: Partial<ForegroundNotificationData>): void {
    this.currentNotification = {
      ...this.currentNotification,
      ...data,
    };
  }

  getCurrentNotification(): ForegroundNotificationData {
    return { ...this.currentNotification };
  }

  isTracking(): boolean {
    return this.isTrackingActive && !this.isPaused;
  }

  isTrackingPaused(): boolean {
    return this.isTrackingActive && this.isPaused;
  }
}
