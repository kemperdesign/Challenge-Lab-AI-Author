import { IAIService, AIConfig } from "./aiServiceTypes";
import { GeminiService } from "./geminiProvider";
import { OpenAIService } from "./openaiProvider";
import { OllamaService } from "./ollamaProvider";

export function createAIService(config: AIConfig): IAIService {
  switch (config.provider) {
    case 'gemini':
      return new GeminiService(config);
    case 'openai':
      return new OpenAIService(config);
    case 'ollama':
      return new OllamaService(config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

// Default model names for each provider
export const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash-exp',
  openai: 'gpt-4o',
  ollama: 'llama3.2'
};

// Get default model for a provider
export function getDefaultModel(provider: string): string {
  return DEFAULT_MODELS[provider as keyof typeof DEFAULT_MODELS] || '';
}
