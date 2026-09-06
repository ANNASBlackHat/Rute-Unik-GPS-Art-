export type AudioDuckingMode = 'duck' | 'pause' | 'none';

export interface NativeAudioConfig {
  language: 'id-ID' | 'en-US';
  rate: number;
  pitch: number;
  duckingMode: AudioDuckingMode;
}

export interface AudioFocusManager {
  requestAudioFocus: (mode: AudioDuckingMode) => Promise<boolean> | boolean;
  abandonAudioFocus: () => Promise<void> | void;
}

export interface NativeSpeechEngine {
  speak: (
    text: string,
    options: {
      language: string;
      rate: number;
      pitch: number;
      onStart?: () => void;
      onDone?: () => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<void> | void;
  stop: () => Promise<void> | void;
  isSpeaking: () => Promise<boolean> | boolean;
}

export class NativeAudioGuide {
  private config: NativeAudioConfig;
  private focusManager: AudioFocusManager;
  private speechEngine: NativeSpeechEngine;
  private isSpeakingNow = false;
  private history: { text: string; timestamp: number; language: string }[] = [];

  constructor(options?: {
    config?: Partial<NativeAudioConfig>;
    focusManager?: AudioFocusManager;
    speechEngine?: NativeSpeechEngine;
  }) {
    this.config = {
      language: options?.config?.language ?? 'id-ID',
      rate: options?.config?.rate ?? 1.0,
      pitch: options?.config?.pitch ?? 1.0,
      duckingMode: options?.config?.duckingMode ?? 'duck',
    };

    // Default mock focus manager
    this.focusManager = options?.focusManager ?? {
      requestAudioFocus: () => true,
      abandonAudioFocus: () => {},
    };

    // Default mock speech engine
    this.speechEngine = options?.speechEngine ?? {
      speak: async (_text, opts) => {
        opts.onStart?.();
        // Simulate speech
        opts.onDone?.();
      },
      stop: () => {},
      isSpeaking: () => false,
    };
  }

  setLanguage(lang: 'id-ID' | 'en-US') {
    this.config.language = lang;
  }

  getLanguage(): 'id-ID' | 'en-US' {
    return this.config.language;
  }

  setDuckingMode(mode: AudioDuckingMode) {
    this.config.duckingMode = mode;
  }

  /**
   * Speaks voice guidance with Android audio ducking:
   * 1. Requests AudioFocus (lowering music volume if duckingMode is 'duck')
   * 2. Speaks utterance via TTS engine
   * 3. Abandons AudioFocus when done (restoring music volume)
   */
  async speakWithDucking(text: string, priority = false): Promise<void> {
    if (!text || text.trim().length === 0) return;

    if (priority) {
      await this.speechEngine.stop();
    }

    this.history.push({
      text,
      timestamp: Date.now(),
      language: this.config.language,
    });

    // 1. Request transient audio focus with ducking
    await this.focusManager.requestAudioFocus(this.config.duckingMode);
    this.isSpeakingNow = true;

    return new Promise((resolve) => {
      this.speechEngine.speak(text, {
        language: this.config.language,
        rate: this.config.rate,
        pitch: this.config.pitch,
        onStart: () => {
          this.isSpeakingNow = true;
        },
        onDone: async () => {
          this.isSpeakingNow = false;
          // 2. Restore full volume for background music
          await this.focusManager.abandonAudioFocus();
          resolve();
        },
        onError: async () => {
          this.isSpeakingNow = false;
          await this.focusManager.abandonAudioFocus();
          resolve();
        },
      });
    });
  }

  getHistory() {
    return [...this.history];
  }

  isSpeaking(): boolean {
    return this.isSpeakingNow;
  }
}
