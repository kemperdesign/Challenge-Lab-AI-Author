import { IAIService, ContentPart, AIConfig } from "./aiServiceTypes";
import { OutputNormalizer } from "./outputNormalizer";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface OllamaMessage {
  role: string;
  content: string;
  images?: string[];
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaService implements IAIService {
  private baseUrl: string;
  private model: string;

  constructor(config: AIConfig) {
    this.baseUrl = config.ollamaBaseUrl || 'http://localhost:11434';
    this.model = config.model;
  }

  private async makeRequest(
    endpoint: string,
    body: any,
    stream: boolean = false
  ): Promise<Response> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...body, stream })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    return response;
  }

  async processText(
    agentPrompt: string,
    content: string,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string> {
    let lastError: unknown;
    const maxRetries = 6;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (isCancelledRef.current) throw new Error("Operation stopped by user.");

        const response = await this.makeRequest('/api/chat', {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${agentPrompt}\n\n---\n\n${content}`
            }
          ]
        }, false);

        const data: OllamaResponse = await response.json();
        onStatusUpdate?.('');
        return OutputNormalizer.normalizeOllama(data.message.content);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        // Check for connection errors
        if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
          throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running locally.`);
        }

        if (attempt < maxRetries) {
          const delayTime = 2000 * Math.pow(2, attempt);
          console.warn(`Ollama API attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All Ollama API attempts failed:", error);
          throw new Error(`Failed to process text with Ollama: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process text with Ollama after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  async processTextStream(
    agentPrompt: string,
    content: string,
    onChunk: (chunk: string) => void,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string> {
    let lastError: unknown;
    const maxRetries = 6;
    let fullText = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (isCancelledRef.current) throw new Error("Operation stopped by user.");

        const response = await this.makeRequest('/api/chat', {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${agentPrompt}\n\n---\n\n${content}`
            }
          ]
        }, true);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body reader available");

        const decoder = new TextDecoder();
        fullText = '';

        while (true) {
          if (isCancelledRef.current) {
            reader.cancel();
            throw new Error("Operation stopped by user.");
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const json: OllamaResponse = JSON.parse(line);
              const chunkText = json.message?.content || '';

              if (chunkText) {
                fullText += chunkText;
                onChunk(chunkText);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }

        onStatusUpdate?.('');
        return OutputNormalizer.normalizeOllama(fullText);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
          throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running locally.`);
        }

        if (attempt < maxRetries) {
          const delayTime = 2000 * Math.pow(2, attempt);
          console.warn(`Ollama API stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All Ollama API stream attempts failed:", error);
          throw new Error(`Failed to process text stream with Ollama: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process text stream with Ollama after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  async generateScriptStream(
    agentPrompt: string,
    parts: ContentPart[],
    onChunk: (chunk: string) => void,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
  ): Promise<string> {
    let lastError: unknown;
    const maxRetries = 6;
    let fullText = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (isCancelledRef.current) throw new Error("Operation stopped by user.");

        // Extract text and images from parts
        const textParts = parts.filter(p => p.type === 'text').map(p => (p as any).text);
        const imageParts = parts.filter(p => p.type === 'image').map(p => (p as any).data);

        const message: OllamaMessage = {
          role: 'user',
          content: `${agentPrompt}\n\n${textParts.join('\n')}`
        };

        if (imageParts.length > 0) {
          message.images = imageParts;
        }

        const response = await this.makeRequest('/api/chat', {
          model: this.model,
          messages: [message]
        }, true);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body reader available");

        const decoder = new TextDecoder();
        fullText = '';

        while (true) {
          if (isCancelledRef.current) {
            reader.cancel();
            throw new Error("Operation stopped by user.");
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const json: OllamaResponse = JSON.parse(line);
              const chunkText = json.message?.content || '';

              if (chunkText) {
                fullText += chunkText;
                onChunk(chunkText);
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }

        onStatusUpdate?.('');
        return OutputNormalizer.normalizeOllama(fullText);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (error?.message?.includes('fetch') || error?.message?.includes('Network')) {
          throw new Error(`Cannot connect to Ollama at ${this.baseUrl}. Please ensure Ollama is running locally.`);
        }

        if (attempt < maxRetries) {
          const delayTime = 2000 * Math.pow(2, attempt);
          console.warn(`Ollama API multi-modal stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All Ollama API multi-modal stream attempts failed:", error);
          throw new Error(`Failed to process multi-modal stream with Ollama: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process multi-modal stream with Ollama after ${maxRetries} attempts. Last error: ${lastError}`);
  }
}
