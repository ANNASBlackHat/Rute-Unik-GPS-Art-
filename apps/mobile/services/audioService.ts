export type LanguageCode = 'id-ID' | 'en-US';

export interface SpeechHandler {
  speak: (text: string, options?: { language?: string; rate?: number }) => Promise<void> | void;
  stop?: () => Promise<void> | void;
  isSpeakingAsync?: () => Promise<boolean>;
}

export class AudioGuideService {
  private handler: SpeechHandler;
  private currentLanguage: LanguageCode = 'id-ID';
  private speechRate = 1.0;
  private spokenHistory: string[] = [];

  constructor(handler?: SpeechHandler) {
    // Default fallback handler records history
    this.handler = handler || {
      speak: () => {},
      stop: () => {},
      isSpeakingAsync: async () => false,
    };
  }

  setLanguage(lang: LanguageCode) {
    this.currentLanguage = lang;
  }

  getLanguage(): LanguageCode {
    return this.currentLanguage;
  }

  setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  async speak(text: string, priority = false): Promise<void> {
    if (!text || text.trim().length === 0) return;

    this.spokenHistory.push(text);

    if (priority && this.handler.stop) {
      await this.handler.stop();
    }

    await this.handler.speak(text, {
      language: this.currentLanguage,
      rate: this.speechRate,
    });
  }

  getSpokenHistory(): string[] {
    return [...this.spokenHistory];
  }

  clearHistory(): void {
    this.spokenHistory = [];
  }
}
