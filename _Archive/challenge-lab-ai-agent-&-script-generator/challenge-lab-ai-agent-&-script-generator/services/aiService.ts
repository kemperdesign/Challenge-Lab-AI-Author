// services/aiService.ts
import { Part } from '@google/genai';

export type AIProvider = 'gemini' | 'openai' | 'ollama';

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

interface ProcessOptions {
  onChunk?: (chunk: string) => void;
  onStatusUpdate?: (message: string) => void;
  isCancelledRef: { current: boolean };
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to parse errors from different providers
function parseAIError(error: unknown, provider: AIProvider): { code: number, message: string } {
  const defaultError = { code: 0, message: "An unknown error occurred." };
  let errorMessage = error instanceof Error ? error.message : String(error);

  try {
    const errorObj = JSON.parse(errorMessage);
    return {
      code: errorObj.error?.code || errorObj.status_code || 0,
      message: errorObj.error?.message || errorObj.message || errorMessage
    };
  } catch {
    // Handle common error patterns
    if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      return { code: 429, message: "Rate limit exceeded. Please wait and try again." };
    }
    if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
      return { code: 503, message: "The AI model is currently overloaded." };
    }
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return { code: 401, message: "Invalid API key or authentication failed." };
    }
    return { ...defaultError, message: errorMessage };
  }
}

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async processText(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const maxRetries = 6;
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        let result: string;
        switch (this.config.provider) {
          case 'gemini':
            result = await this.processGemini(agentPrompt, content, options);
            break;
          case 'openai':
            result = await this.processOpenAI(agentPrompt, content, options);
            break;
          case 'ollama':
            result = await this.processOllama(agentPrompt, content, options);
            break;
          default:
            throw new Error(`Unsupported provider: ${this.config.provider}`);
        }

        options.onStatusUpdate?.('');
        return result;

      } catch (error) {
        lastError = error;
        const parsedError = parseAIError(error, this.config.provider);

        if (parsedError.message.includes("Operation stopped by user.") || options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (parsedError.code === 401) {
          throw new Error("Your API key is invalid or has expired.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);
          if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, parsedError);
          options.onStatusUpdate?.(
            `The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`
          );
          await wait(delayTime);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  async processTextStream(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const maxRetries = 6;
    let lastError: unknown;
    let fullText = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        fullText = '';
        switch (this.config.provider) {
          case 'gemini':
            fullText = await this.processGeminiStream(agentPrompt, content, options);
            break;
          case 'openai':
            fullText = await this.processOpenAIStream(agentPrompt, content, options);
            break;
          case 'ollama':
            fullText = await this.processOllamaStream(agentPrompt, content, options);
            break;
          default:
            throw new Error(`Unsupported provider: ${this.config.provider}`);
        }

        options.onStatusUpdate?.('');
        return fullText;

      } catch (error) {
        lastError = error;
        const parsedError = parseAIError(error, this.config.provider);

        if (parsedError.message.includes("Operation stopped by user.") || options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (parsedError.code === 401) {
          throw new Error("Your API key is invalid or has expired.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);
          if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }
          console.warn(`Stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, parsedError);
          options.onStatusUpdate?.(
            `The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`
          );
          await wait(delayTime);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  async generateScriptStream(
    agentPrompt: string,
    parts: Part[],
    options: ProcessOptions
  ): Promise<string> {
    // For now, only Gemini supports multi-modal with Parts
    if (this.config.provider !== 'gemini') {
      throw new Error('Multi-modal input is only supported with Gemini provider.');
    }

    const maxRetries = 6;
    let lastError: unknown;
    let fullText = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        fullText = await this.processGeminiMultiModal(agentPrompt, parts, options);
        options.onStatusUpdate?.('');
        return fullText;

      } catch (error) {
        lastError = error;
        const parsedError = parseAIError(error, this.config.provider);

        if (parsedError.message.includes("Operation stopped by user.") || options.isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (parsedError.code === 401) {
          throw new Error("Your API key is invalid or has expired.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);
          if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }
          console.warn(`Multi-modal attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, parsedError);
          options.onStatusUpdate?.(
            `The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`
          );
          await wait(delayTime);
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts. Last error: ${lastError}`);
  }

  // Gemini implementation
  private async processGemini(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${agentPrompt}\n\n---\n\n${content}` }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  private async processGeminiStream(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${agentPrompt}\n\n---\n\n${content}` }] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Gemini API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullText += text;
                options.onChunk?.(text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullText;
  }

  private async processGeminiMultiModal(
    agentPrompt: string,
    parts: Part[],
    options: ProcessOptions
  ): Promise<string> {
    const promptPart: Part = { text: agentPrompt };
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [promptPart, ...parts] }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Gemini API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullText += text;
                options.onChunk?.(text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullText;
  }

  // OpenAI implementation
  private async processOpenAI(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: agentPrompt },
          { role: 'user', content: content }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async processOpenAIStream(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: agentPrompt },
          { role: 'user', content: content }
        ],
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `OpenAI API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            if (jsonStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(jsonStr);
              const text = data.choices?.[0]?.delta?.content || '';
              if (text) {
                fullText += text;
                options.onChunk?.(text);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }

    return fullText;
  }

  // Ollama implementation
  private async processOllama(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama2',
        prompt: `${agentPrompt}\n\n---\n\n${content}`,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  }

  private async processOllamaStream(
    agentPrompt: string,
    content: string,
    options: ProcessOptions
  ): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model || 'llama2',
        prompt: `${agentPrompt}\n\n---\n\n${content}`,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Ollama API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const text = data.response || '';
            if (text) {
              fullText += text;
              options.onChunk?.(text);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    return fullText;
  }
}