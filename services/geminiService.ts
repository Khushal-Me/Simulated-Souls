
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

const SYSTEM_INSTRUCTION = `You are a Dungeon Master for a dynamic text adventure game. Your goal is to create an engaging and evolving story based on the player's actions.
For each turn, you must:
1. Describe the current scene or the outcome of the player's action. The description should be immersive and engaging. Use vivid language.
2. Provide a concise, descriptive prompt (max 15-20 words) suitable for an image generation AI to create a visual for the scene. The prompt should be literal and focus on visual elements, capturing the mood and key details.
Your ENTIRE response for EACH turn MUST be a single JSON object with two keys: "sceneDescription" (string) and "imagePrompt" (string).
Do NOT include any other text, greetings, or explanations outside of this JSON structure.
Example response:
{"sceneDescription": "You cautiously open the ancient wooden door. Dust motes dance in the single ray of light piercing the gloom of the chamber beyond. A faint, metallic scent hangs in the air. The air is cold and stale.", "imagePrompt": "Ancient wooden door opening into a dark, dusty chamber, single ray of light, fantasy art style, metallic scent visual cue, cold stale air"}

When the game starts (first message is "Start the adventure."), generate the initial scene and image prompt according to these rules.`;

export const createChatSession = (): Chat => {
  return ai.chats.create({
    model: GEMINI_MODEL_NAME,
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


export const sendMessageToGemini = async (chat: Chat, message: string): Promise<GameAIResponse | null> => {
  try {
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    const responseText = response.text;
    if (!responseText) {
      console.error("Gemini response text is empty.");
      return null;
    }
    return parseGeminiResponse(responseText);
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
        }
        // Check for rate limit / quota exceeded errors
        if (error.message.includes("429") && error.message.toUpperCase().includes("RESOURCE_EXHAUSTED")) {
            throw new Error("RateLimitError: API quota exceeded for text generation. Please check your plan/billing or try again later.");
        }
    }
    throw error; // Re-throw original or modified error
  }
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
