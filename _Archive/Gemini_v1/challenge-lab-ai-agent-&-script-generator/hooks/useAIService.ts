import { useMemo } from 'react';
import { createAIService } from '../services/aiServiceFactory';
import { SettingsManager } from '../services/settingsManager';
import { IAIService, ContentPart } from '../services/aiServiceTypes';

export function useAIService(): IAIService {
  const service = useMemo(() => {
    const settings = SettingsManager.getSettings();
    return createAIService({
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      ollamaBaseUrl: settings.ollamaBaseUrl
    });
  }, []); // Empty deps - service is created once per mount

  return service;
}

// Compatibility wrapper functions that match the old geminiService interface
export async function processText(
  model: string,
  agentPrompt: string,
  content: string,
  isCancelledRef: { current: boolean },
  onStatusUpdate?: (message: string) => void
): Promise<string> {
  const settings = SettingsManager.getSettings();
  const service = createAIService({
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    ollamaBaseUrl: settings.ollamaBaseUrl
  });

  return service.processText(agentPrompt, content, isCancelledRef, onStatusUpdate);
}

export async function processTextStream(
  model: string,
  agentPrompt: string,
  content: string,
  onChunk: (chunk: string) => void,
  isCancelledRef: { current: boolean },
  onStatusUpdate?: (message: string) => void
): Promise<string> {
  const settings = SettingsManager.getSettings();
  const service = createAIService({
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    ollamaBaseUrl: settings.ollamaBaseUrl
  });

  return service.processTextStream(agentPrompt, content, onChunk, isCancelledRef, onStatusUpdate);
}

export async function generateScriptStream(
  model: string,
  agentPrompt: string,
  parts: ContentPart[],
  onChunk: (chunk: string) => void,
  isCancelledRef: { current: boolean },
  onStatusUpdate?: (message: string) => void
): Promise<string> {
  const settings = SettingsManager.getSettings();
  const service = createAIService({
    provider: settings.provider,
    apiKey: settings.apiKey,
    model: settings.model,
    ollamaBaseUrl: settings.ollamaBaseUrl
  });

  return service.generateScriptStream(agentPrompt, parts, onChunk, isCancelledRef, onStatusUpdate);
}
