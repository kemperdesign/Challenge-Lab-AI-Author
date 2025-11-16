/**
 * Provider-Specific Prompts
 *
 * This file exports separate prompt sets for each AI provider.
 * Each provider has its own independent set of prompts that can be
 * customized without affecting the others.
 */

import type { AIProvider } from '../services/aiServiceTypes';
import * as OpenAIPrompts from './openai-prompts';
import * as GeminiPrompts from './gemini-prompts';
import * as OllamaPrompts from './ollama-prompts';

export interface PromptSet {
  AGENT_1_SERIES_COMBINED_PROMPT: string;
  AGENT_1_SINGLE_PROMPT: string;
  AGENT_RESTRUCTURE_PROMPT: string;
  COMBINED_AGENT_PROMPT: string;
}

/**
 * Get the appropriate prompt set for the given provider
 */
export function getPromptsForProvider(provider: AIProvider): PromptSet {
  switch (provider) {
    case 'openai':
      return OpenAIPrompts;
    case 'gemini':
      return GeminiPrompts;
    case 'ollama':
      return OllamaPrompts;
    default:
      // Default to OpenAI prompts as fallback
      return OpenAIPrompts;
  }
}
