import { GoogleGenAI, Part } from "@google/genai";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to parse complex/nested Gemini API errors
function parseGeminiError(error: unknown): { code: number, message: string, status: string } {
    const defaultError = { code: 0, message: "An unknown error occurred.", status: "UNKNOWN" };
    let errorMessage = error instanceof Error ? error.message : String(error);

    try {
        let errorObj = JSON.parse(errorMessage);

        // Handle cases where the 'message' property contains another stringified JSON
        if (errorObj.error && typeof errorObj.error.message === 'string') {
            try {
                const nestedErrorObj = JSON.parse(errorObj.error.message);
                if (nestedErrorObj.error) {
                    errorObj = nestedErrorObj; 
                }
            } catch (e) {
                // Not nested JSON, proceed with the outer object.
            }
        }
        
        const code = errorObj.error?.code || 0;
        const message = errorObj.error?.message || errorMessage;
        const status = errorObj.error?.status || "";

        return { code, message, status };
    } catch (e) {
        // Fallback for non-JSON errors
        if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
            return { code: 429, message: "You have exceeded your API quota.", status: 'RESOURCE_EXHAUSTED' };
        }
        if (errorMessage.includes('503') || errorMessage.includes('UNAVAILABLE') || errorMessage.includes('overloaded')) {
            return { code: 503, message: "The AI model is currently overloaded.", status: 'UNAVAILABLE' };
        }
        return { ...defaultError, message: errorMessage };
    }
}

export async function processText(
    model: string,
    agentPrompt: string,
    content: string,
    isCancelledRef: { current: boolean },
    onStatusUpdate?: (message: string) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: unknown;
  const maxRetries = 6; // Increased from 5 to 6

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (isCancelledRef.current) throw new Error("Operation stopped by user.");

      // We use generateContentStream even for non-streaming result gathering
      // to avoid potential timeouts on strictly server-side buffering for large responses.
      // Combining the prompt and content into a single string is a simpler request
      // structure that can be more resilient to model overload errors.
      const response = await ai.models.generateContentStream({
        model: model,
        contents: `${agentPrompt}\n\n---\n\n${content}`,
      });
      
      let fullText = '';
      for await (const chunk of response) {
        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
        }
      }
      onStatusUpdate?.('');
      return fullText;

    } catch (error) {
      lastError = error;
      const parsedError = parseGeminiError(error);

      if (parsedError.message.includes("Operation stopped by user.") || isCancelledRef.current) {
        throw new Error("Operation stopped by user.");
      }
      
      // Immediate failure for invalid API key
      if (parsedError.code === 400 && (parsedError.status === 'INVALID_ARGUMENT' || parsedError.message.toLowerCase().includes('api key'))) {
          throw new Error("Your API key is invalid or has expired. Please check your API key settings.");
      }

      if (attempt < maxRetries) {
        let delayTime = 2000 * Math.pow(2, attempt); // Exponential backoff
        // Longer backoff for rate limit / overload errors, with more jitter
        if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
        }
        const consoleMessage = `Gemini API attempt ${attempt + 1} failed for processText, retrying in ${delayTime}ms...`;
        console.warn(consoleMessage, JSON.stringify(parsedError));
        onStatusUpdate?.(`The AI model is very busy. Patiently retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
        await wait(delayTime);
      } else {
        console.error("All Gemini API attempts failed for processText:", JSON.stringify(parsedError));
        // Provide a more user-friendly message based on the final error
        if (parsedError.code === 429) {
            throw new Error("You have exceeded your API quota. Please check your plan and billing details.");
        }
        if (parsedError.code === 503) {
            throw new Error("The AI model is currently overloaded. Please wait a few moments and try again.");
        }
        throw new Error("Failed to process text with Gemini API after multiple attempts. The service may be busy or unavailable.");
      }
    }
  }
  throw new Error(`Failed to process text with Gemini API after ${maxRetries} attempts. Last error: ${JSON.stringify(lastError)}`);
}


export async function processTextStream(
  model: string,
  agentPrompt: string,
  content: string,
  onChunk: (chunk: string) => void,
  isCancelledRef: { current: boolean },
  onStatusUpdate?: (message: string) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: unknown;
  const maxRetries = 6; // Increased from 5 to 6
  let fullText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (isCancelledRef.current) throw new Error("Operation stopped by user.");
      
      const response = await ai.models.generateContentStream({
        model: model,
        contents: `${agentPrompt}\n\n---\n\n${content}`,
      });
      
      fullText = ''; // Reset on retry
      for await (const chunk of response) {
        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }
      }
      onStatusUpdate?.('');
      return fullText;

    } catch (error) {
      lastError = error;
      const parsedError = parseGeminiError(error);

      if (parsedError.message.includes("Operation stopped by user.") || isCancelledRef.current) {
        throw new Error("Operation stopped by user.");
      }

      // Immediate failure for invalid API key
      if (parsedError.code === 400 && (parsedError.status === 'INVALID_ARGUMENT' || parsedError.message.toLowerCase().includes('api key'))) {
          throw new Error("Your API key is invalid or has expired. Please check your API key settings.");
      }

      if (attempt < maxRetries) {
        let delayTime = 2000 * Math.pow(2, attempt);
        // Longer backoff for rate limit / overload errors, with more jitter
        if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
        }
        const consoleMessage = `Gemini API stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`;
        console.warn(consoleMessage, JSON.stringify(parsedError));
        onStatusUpdate?.(`The AI model is very busy. Patiently retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
        await wait(delayTime);
      } else {
        console.error("All Gemini API stream attempts failed:", JSON.stringify(parsedError));
        if (parsedError.code === 429) {
            throw new Error("You have exceeded your API quota. Please check your plan and billing details.");
        }
        if (parsedError.code === 503) {
            throw new Error("The AI model is currently overloaded. Please wait a few moments and try again.");
        }
        throw new Error(`Failed to process text stream with Gemini API after multiple attempts. The service may be busy or unavailable.`);
      }
    }
  }
  throw new Error(`Failed to process text stream with Gemini API after ${maxRetries} attempts. Last error: ${JSON.stringify(lastError)}`);
}

export async function generateScriptStream(
  model: string,
  agentPrompt: string,
  parts: Part[],
  onChunk: (chunk: string) => void,
  isCancelledRef: { current: boolean },
  onStatusUpdate?: (message: string) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let lastError: unknown;
  const maxRetries = 6;
  let fullText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (isCancelledRef.current) throw new Error("Operation stopped by user.");

      const promptPart: Part = { text: agentPrompt };
      const contents = { parts: [promptPart, ...parts] };

      const response = await ai.models.generateContentStream({
        model: model,
        contents: contents,
      });
      
      fullText = ''; // Reset on retry
      for await (const chunk of response) {
        if (isCancelledRef.current) {
          throw new Error("Operation stopped by user.");
        }
        const chunkText = chunk.text;
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }
      }
      onStatusUpdate?.('');
      return fullText;

    } catch (error) {
      lastError = error;
      const parsedError = parseGeminiError(error);

      if (parsedError.message.includes("Operation stopped by user.") || isCancelledRef.current) {
        throw new Error("Operation stopped by user.");
      }

      if (parsedError.code === 400 && (parsedError.status === 'INVALID_ARGUMENT' || parsedError.message.toLowerCase().includes('api key'))) {
          throw new Error("Your API key is invalid or has expired. Please check your API key settings.");
      }

      if (attempt < maxRetries) {
        let delayTime = 2000 * Math.pow(2, attempt);
        if (parsedError.code === 429 || parsedError.code === 503) {
            delayTime = 15000 * Math.pow(2, attempt) + Math.floor(Math.random() * 5000);
        }
        const consoleMessage = `Gemini API multi-modal stream attempt ${attempt + 1} failed, retrying in ${delayTime}ms...`;
        console.warn(consoleMessage, JSON.stringify(parsedError));
        onStatusUpdate?.(`The AI model is very busy. Patiently retrying in ${Math.round(delayTime/1000)}s... (Attempt ${attempt + 2}/${maxRetries + 1})`);
        await wait(delayTime);
      } else {
        console.error("All Gemini API multi-modal stream attempts failed:", JSON.stringify(parsedError));
        if (parsedError.code === 429) {
            throw new Error("You have exceeded your API quota. Please check your plan and billing details.");
        }
        if (parsedError.code === 503) {
            throw new Error("The AI model is currently overloaded. Please wait a few moments and try again.");
        }
        throw new Error(`Failed to process multi-modal stream with Gemini API after multiple attempts. The service may be busy or unavailable.`);
      }
    }
  }
  throw new Error(`Failed to process multi-modal stream with Gemini API after ${maxRetries} attempts. Last error: ${JSON.stringify(lastError)}`);
}