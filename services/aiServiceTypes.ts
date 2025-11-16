// Unified types for all AI providers
export type AIProvider = 'gemini' | 'openai' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  ollamaBaseUrl?: string; // Only used for Ollama
}

export interface ImagePart {
  type: 'image';
  data: string; // base64 encoded
  mimeType: string;
}

export interface TextPart {
  type: 'text';
  text: string;
}

export type ContentPart = TextPart | ImagePart;

export interface IAIService {
  /**
   * Process text without streaming
   */
  processText(
    agentPrompt: string,
    content: string,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string>;

  /**
   * Process text with streaming response
   */
  processTextStream(
    agentPrompt: string,
    content: string,
    onChunk: (chunk: string) => void,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string>;

  /**
   * Process multi-modal content (text + images) with streaming
   */
  generateScriptStream(
    agentPrompt: string,
    parts: ContentPart[],
    onChunk: (chunk: string) => void,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string>;
}
