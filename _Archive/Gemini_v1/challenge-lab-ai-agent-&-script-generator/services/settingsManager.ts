import { AIProvider } from "./aiServiceTypes";
import { DEFAULT_MODELS } from "./aiServiceFactory";

export interface ProviderSettings {
  provider: AIProvider;
  apiKey: string;
  model: string;
  ollamaBaseUrl: string;
}

const STORAGE_KEY = 'ai-provider-settings';

const DEFAULT_SETTINGS: ProviderSettings = {
  provider: 'gemini',
  apiKey: '',
  model: DEFAULT_MODELS.gemini,
  ollamaBaseUrl: 'http://localhost:11434'
};

export class SettingsManager {
  static getSettings(): ProviderSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...DEFAULT_SETTINGS };
  }

  static saveSettings(settings: ProviderSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  static clearSettings(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear settings:', error);
    }
  }

  static getApiKey(provider: AIProvider): string {
    const settings = this.getSettings();
    return settings.provider === provider ? settings.apiKey : '';
  }

  static setApiKey(provider: AIProvider, apiKey: string): void {
    const settings = this.getSettings();
    if (settings.provider === provider) {
      settings.apiKey = apiKey;
      this.saveSettings(settings);
    }
  }
}
