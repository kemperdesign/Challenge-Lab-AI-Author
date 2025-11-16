import OpenAI from "openai";
import { IAIService, ContentPart, AIConfig } from "./aiServiceTypes";
import { OutputNormalizer } from "./outputNormalizer";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Convert unified ContentPart to OpenAI message content
function convertToOpenAIContent(parts: ContentPart[]): Array<OpenAI.Chat.ChatCompletionContentPart> {
  return parts.map(part => {
    if (part.type === 'text') {
      return {
        type: 'text' as const,
        text: part.text
      };
    } else {
      return {
        type: 'image_url' as const,
        image_url: {
          url: `data:${part.mimeType};base64,${part.data}`
        }
      };
    }
  });
}

export class OpenAIService implements IAIService {
  private client: OpenAI;
  private model: string;

  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // Required for browser usage
    });
    this.model = config.model;
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

        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${agentPrompt}\n\n---\n\n${content}`
            }
          ],
          stream: false
        });

        onStatusUpdate?.('');
        const responseContent = response.choices[0]?.message?.content || '';
        return OutputNormalizer.normalizeOpenAI(responseContent);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        // Check for API key errors
        if (error?.status === 401 || error?.message?.toLowerCase().includes('api key')) {
          throw new Error("Your OpenAI API key is invalid or has expired. Please check your API key settings.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);

          // Handle rate limits
          if (error?.status === 429) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }

          console.warn(`OpenAI API attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All OpenAI API attempts failed:", error);

          if (error?.status === 429) {
            throw new Error("You have exceeded your OpenAI API quota. Please check your plan and billing details.");
          }

          throw new Error(`Failed to process text with OpenAI API: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process text with OpenAI API after ${maxRetries} attempts. Last error: ${lastError}`);
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

        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: `${agentPrompt}\n\n---\n\n${content}`
            }
          ],
          stream: true
        });

        fullText = '';
        for await (const chunk of stream) {
          if (isCancelledRef.current) {
            throw new Error("Operation stopped by user.");
          }

          const chunkText = chunk.choices[0]?.delta?.content || '';
          if (chunkText) {
            fullText += chunkText;
            onChunk(chunkText);
          }
        }

        onStatusUpdate?.('');
        return OutputNormalizer.normalizeOpenAI(fullText);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (error?.status === 401 || error?.message?.toLowerCase().includes('api key')) {
          throw new Error("Your OpenAI API key is invalid or has expired. Please check your API key settings.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);

          if (error?.status === 429) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }

          console.warn(`OpenAI API stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All OpenAI API stream attempts failed:", error);

          if (error?.status === 429) {
            throw new Error("You have exceeded your OpenAI API quota. Please check your plan and billing details.");
          }

          throw new Error(`Failed to process text stream with OpenAI API: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process text stream with OpenAI API after ${maxRetries} attempts. Last error: ${lastError}`);
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

        const contentParts = convertToOpenAIContent(parts);
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: 'user',
            content: [
              { type: 'text', text: agentPrompt },
              ...contentParts
            ]
          }
        ];

        const stream = await this.client.chat.completions.create({
          model: this.model,
          messages: messages,
          stream: true
        });

        fullText = '';
        for await (const chunk of stream) {
          if (isCancelledRef.current) {
            throw new Error("Operation stopped by user.");
          }

          const chunkText = chunk.choices[0]?.delta?.content || '';
          if (chunkText) {
            fullText += chunkText;
            onChunk(chunkText);
          }
        }

        onStatusUpdate?.('');
        return OutputNormalizer.normalizeOpenAI(fullText);

      } catch (error: any) {
        lastError = error;

        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }

        if (error?.status === 401 || error?.message?.toLowerCase().includes('api key')) {
          throw new Error("Your OpenAI API key is invalid or has expired. Please check your API key settings.");
        }

        if (attempt < maxRetries) {
          let delayTime = 2000 * Math.pow(2, attempt);

          if (error?.status === 429) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
          }

          console.warn(`OpenAI API multi-modal stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`, error);
          onStatusUpdate?.(`The AI model is busy. Retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
          await wait(delayTime);
        } else {
          console.error("All OpenAI API multi-modal stream attempts failed:", error);

          if (error?.status === 429) {
            throw new Error("You have exceeded your OpenAI API quota. Please check your plan and billing details.");
          }

          throw new Error(`Failed to process multi-modal stream with OpenAI API: ${error?.message || 'Unknown error'}`);
        }
      }
    }
    throw new Error(`Failed to process multi-modal stream with OpenAI API after ${maxRetries} attempts. Last error: ${lastError}`);
  }
}
