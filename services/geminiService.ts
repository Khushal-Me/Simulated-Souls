
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import type { GameAIResponse } from '../types';

// Ensure API_KEY is available in the environment.
const API_KEY = process.env.API_KEY;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;

if (!API_KEY) {
  console.error("API_KEY for Google GenAI is not set in environment variables.");
  // Potentially throw an error or handle this more gracefully depending on requirements
  // For this example, we'll let it proceed and fail at API call if key is truly missing
}

if (!CLOUDFLARE_API_KEY) {
  console.error("CLOUDFLARE_API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Non-null assertion, assuming it's set

const GEMINI_MODEL_NAME = "gemini-2.0-flash";
const FALLBACK_MODEL_NAME = "gemini-1.5-flash"; // Fallback model if primary is overloaded

const SYSTEM_INSTRUCTION = `You are a Dungeon Master for a dynamic text adventure game. Your goal is to create an engaging and evolving story based on the player's actions.
For each turn, you must:
1. Describe the current scene or the outcome of the player's action. The description should be immersive and engaging. Use vivid language.
2. Provide a concise, descriptive prompt (max 15-20 words) suitable for an image generation AI to create a visual for the scene. The prompt should be literal and focus on visual elements, capturing the mood and key details.
Your ENTIRE response for EACH turn MUST be a single JSON object with two keys: "sceneDescription" (string) and "imagePrompt" (string).
Do NOT include any other text, greetings, or explanations outside of this JSON structure.
Example response:
{"sceneDescription": "You cautiously open the ancient wooden door. Dust motes dance in the single ray of light piercing the gloom of the chamber beyond. A faint, metallic scent hangs in the air. The air is cold and stale.", "imagePrompt": "Ancient wooden door opening into a dark, dusty chamber, single ray of light, fantasy art style, metallic scent visual cue, cold stale air"}

When the game starts (first message is "Start the adventure."), generate the initial scene and image prompt according to these rules.`;

export const createChatSession = (modelName: string = GEMINI_MODEL_NAME): Chat => {
  return ai.chats.create({
    model: modelName,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json", // Request JSON output
    },
  });
};

const parseGeminiResponse = (responseText: string): GameAIResponse | null => {
  try {
    let jsonStr = responseText.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed.sceneDescription && parsed.imagePrompt) {
      return parsed as GameAIResponse;
    }
    console.warn("Parsed JSON does not match GameAIResponse structure:", parsed);
    return null;
  } catch (error) {
    console.error("Failed to parse Gemini response JSON:", error, "Raw response:", responseText);
    return null;
  }
};


// Utility function for exponential backoff delay
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  backoffFactor: 2
};

// Simple circuit breaker to prevent overwhelming the service
let circuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
  openUntil: 0
};

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 consecutive failures
  resetTimeout: 30000, // Reset after 30 seconds
  halfOpenRetryTimeout: 10000 // Try again after 10 seconds when half-open
};

const checkCircuitBreaker = (): boolean => {
  const now = Date.now();
  
  // If circuit is open, check if we should try again
  if (circuitBreakerState.isOpen) {
    if (now > circuitBreakerState.openUntil) {
      circuitBreakerState.isOpen = false;
      circuitBreakerState.failures = 0;
      console.log('Circuit breaker reset - attempting to reconnect');
      return true;
    }
    return false;
  }
  
  return true;
};

const recordFailure = () => {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  if (circuitBreakerState.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    circuitBreakerState.isOpen = true;
    circuitBreakerState.openUntil = Date.now() + CIRCUIT_BREAKER_CONFIG.resetTimeout;
    console.log('Circuit breaker opened - too many failures. Will retry after', CIRCUIT_BREAKER_CONFIG.resetTimeout / 1000, 'seconds');
  }
};

const recordSuccess = () => {
  circuitBreakerState.failures = 0;
  circuitBreakerState.isOpen = false;
};

export const sendMessageToGemini = async (chat: Chat, message: string, useFallback: boolean = false): Promise<GameAIResponse | null> => {
  // Check circuit breaker first
  if (!checkCircuitBreaker()) {
    // If circuit breaker is open and we haven't tried fallback yet, try with fallback model
    if (!useFallback) {
      console.log('Primary model circuit breaker is open, trying fallback model...');
      const fallbackChat = createChatSession(FALLBACK_MODEL_NAME);
      return sendMessageToGemini(fallbackChat, message, true);
    }
    throw new Error("Both primary and fallback AI services are temporarily unavailable due to repeated failures. Please wait a moment and try again.");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const response: GenerateContentResponse = await chat.sendMessage({ message });
      const responseText = response.text;
      if (!responseText) {
        console.error("Gemini response text is empty.");
        return null;
      }
      
      // Success - record it and reset circuit breaker
      recordSuccess();
      return parseGeminiResponse(responseText);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error sending message to Gemini (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}):`, error);
      
      if (error instanceof Error) {
        // Handle permanent errors that shouldn't be retried
        if (error.message.includes("API key not valid")) {
          throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
        }
        
        // Check for rate limit / quota exceeded errors
        if (error.message.includes("429") && error.message.toUpperCase().includes("RESOURCE_EXHAUSTED")) {
          throw new Error("RateLimitError: API quota exceeded for text generation. Please check your plan/billing or try again later.");
        }

        // Check for retryable errors (503 Service Unavailable, 502 Bad Gateway, etc.)
        const isRetryableError = 
          error.message.includes("503") || // Service Unavailable (model overloaded)
          error.message.includes("502") || // Bad Gateway
          error.message.includes("500") || // Internal Server Error
          error.message.includes("UNAVAILABLE") ||
          error.message.includes("overloaded") ||
          error.message.includes("temporarily unavailable");

        // If it's not a retryable error, throw immediately
        if (!isRetryableError) {
          throw error;
        }

        // For model overloaded errors, try fallback model after first failure
        if (!useFallback && attempt === 0 && (
          error.message.includes("503") || 
          error.message.includes("UNAVAILABLE") || 
          error.message.includes("overloaded")
        )) {
          console.log('Primary model appears overloaded, trying fallback model...');
          try {
            const fallbackChat = createChatSession(FALLBACK_MODEL_NAME);
            return await sendMessageToGemini(fallbackChat, message, true);
          } catch (fallbackError) {
            console.log('Fallback model also failed, continuing with retry logic...');
            // Continue with normal retry logic
          }
        }
      }

      // If we've exhausted all retries, record failure and throw
      if (attempt === RETRY_CONFIG.maxRetries) {
        recordFailure();
        if (lastError.message.includes("503") || lastError.message.includes("UNAVAILABLE") || lastError.message.includes("overloaded")) {
          throw new Error("The Gemini AI service is currently overloaded. Please try again in a few minutes. If the problem persists, consider switching to a different model or checking Google AI Studio for service status.");
        }
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt),
        RETRY_CONFIG.maxDelay
      );
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const delayMs = baseDelay + jitter;

      console.log(`Retrying in ${Math.round(delayMs)}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1})`);
      await delay(delayMs);
    }
  }

  // This should never be reached, but just in case
  throw lastError || new Error("Unknown error occurred during retry attempts");
};

export const generateImageWithCloudflare = async (prompt: string): Promise<string | null> => {
  try {
    if (!CLOUDFLARE_API_KEY) {
      throw new Error("Cloudflare API key is not configured");
    }

    // Use local proxy server to avoid CORS issues
    const endpoint = "http://localhost:3001/api/generate-image";
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudflare Proxy API error:", response.status, errorData);
      
      if (response.status === 429) {
        throw new Error("RateLimitError: Cloudflare API quota exceeded. Please check your plan/billing or try again later.");
      }
      if (response.status === 401) {
        throw new Error("Invalid Cloudflare API Key. Please check your CLOUDFLARE_API_KEY environment variable.");
      }
      
      throw new Error(`Cloudflare API error: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
    }

    const data = await response.json();
    return data.imageUrl;

  } catch (error) {
    console.error("Error generating image with Cloudflare:", error);
    throw error;
  }
};
