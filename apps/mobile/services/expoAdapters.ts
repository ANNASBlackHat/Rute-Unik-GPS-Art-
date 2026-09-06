import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { BackgroundLocationAdapter, LocationData } from './backgroundLocation';
import { NativeSpeechEngine } from './nativeAudioService';

export class NativeExpoLocationAdapter implements BackgroundLocationAdapter {
  private subscription: Location.LocationSubscription | null = null;
  private isStarted = false;

  async requestPermissions(): Promise<boolean> {
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      return false;
    }
    try {
      await Location.requestBackgroundPermissionsAsync();
    } catch {
      // background permission is optional on some Android versions
    }
    return true;
  }

  async startLocationUpdates(
    _taskName: string,
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
  ): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) {
      throw new Error('PERMISSION_DENIED');
    }

    this.isStarted = true;

    this.subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: options.timeInterval,
        distanceInterval: options.distanceInterval,
      },
      (loc) => {
        if (onTick) {
          onTick({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy ?? 10,
            altitude: loc.coords.altitude,
            speed: loc.coords.speed,
            heading: loc.coords.heading,
            timestamp: loc.timestamp,
          });
        }
      }
    );
  }

  async stopLocationUpdates(): Promise<void> {
    this.isStarted = false;
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  async hasStartedLocationUpdates(): Promise<boolean> {
    return this.isStarted;
  }
}

export class NativeExpoSpeechEngine implements NativeSpeechEngine {
  async speak(
    text: string,
    options: {
      language: string;
      rate: number;
      pitch: number;
      onStart?: () => void;
      onDone?: () => void;
      onError?: (error: Error) => void;
    }
  ): Promise<void> {
    options.onStart?.();
    Speech.speak(text, {
      language: options.language,
      rate: options.rate,
      pitch: options.pitch,
      onDone: () => options.onDone?.(),
      onError: (err) =>
        options.onError?.(
          err instanceof Error ? err : new Error(String(err))
        ),
    });
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch {}
  }

  async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch {
      return false;
    }
  }
}
