import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { Item, ItemCategory } from '../types';
import { CAMPUS_LOCATIONS } from "../constants";

// IMPORTANT: This check is to prevent crashing in environments where process.env is not defined.
const apiKey = typeof process !== 'undefined' && process.env && process.env.API_KEY
  ? process.env.API_KEY
  : "YOUR_API_KEY_HERE"; // Fallback for browser environment, though direct exposure is not recommended for production.

if (apiKey === "YOUR_API_KEY_HERE") {
    console.warn("Gemini API key is not set. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

/**
 * Retries an async function with exponential backoff.
 * @param apiCall The async function to retry.
 * @param retries The maximum number of retries.
 * @param delay The initial delay in milliseconds.
 * @returns The result of the successful API call.
 */
async function retryWithBackoff<T>(
  apiCall: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      // Don't log on the last attempt, as it will be thrown
      if (i < retries - 1) {
        console.warn(`API call failed. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`, error);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  // If all retries fail, throw the last error
  throw lastError;
}


export const geminiService = {
  // FIX: The `history` parameter should be an array of message objects.
  async chatWithAI(history: { role: 'user' | 'model', parts: { text: string }[] }[], newMessage: string) {
    try {
      const chat = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: history,
          config: {
              systemInstruction: `You are a helpful AI assistant for GSU IntelliFind. Your role is to assist students and staff with the lost and found platform. Be friendly, concise, and helpful. You can answer questions about using the app, suggest item categories, help describe items, and provide safety tips for meetups. Categories are: Electronics, Apparel, Books, Keys, Wallets & Purses, ID & Cards, Jewelry, Other. Do not go off-topic.`,
          },
      });
      
      const apiCall = () => chat.sendMessage({ message: newMessage });
      // FIX: Explicitly provide the generic type to `retryWithBackoff` to ensure `result` is correctly typed.
      const result = await retryWithBackoff<GenerateContentResponse>(apiCall);

      return result.text;
    } catch (error) {
      console.error("Error in AI chat after retries:", error);
      return "I'm sorry, I'm having trouble connecting to my brain right now. Please try again later.";
    }
  },

  async getImageInsight(imageFile: File) {
    try {
        const imagePart = await fileToGenerativePart(imageFile);
        
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [
                {text: 'Analyze this image of a lost or found item. Your goal is to automate the report details. Identify the item, its brand (if visible), main colors, and any text. Suggest a category. Generate a complete, well-written, and detailed description for a lost and found report based on the image. Return a JSON object with keys: "detectedName", "brand", "possibleCategory", "colors" (an array of strings), and "autoDescription". The possibleCategory must be one of: Electronics, Apparel, Books, Keys, Wallets & Purses, ID & Cards, Jewelry, Other.'},
                imagePart
            ]},
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        detectedName: { type: Type.STRING },
                        brand: { type: Type.STRING },
                        possibleCategory: { type: Type.STRING },
                        colors: { type: Type.ARRAY, items: { type: Type.STRING } },
                        autoDescription: { type: Type.STRING }
                    },
                    required: ["detectedName", "brand", "possibleCategory", "colors", "autoDescription"]
                }
            }
        });

      // FIX: Explicitly provide the generic type to `retryWithBackoff` to ensure `response` is correctly typed.
      const response = await retryWithBackoff<GenerateContentResponse>(apiCall);
      const text = response.text.trim();
      return JSON.parse(text);

    } catch (error) {
      console.error("Error getting image insight after retries:", error);
      return null;
    }
  },

  async improveDescription(description: string) {
     if (!description.trim()) return "";
     try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rewrite and enhance the following lost and found item description to be clearer and more detailed. Correct any spelling or grammar mistakes. The description is: "${description}"`
        });

        // FIX: Explicitly provide the generic type to `retryWithBackoff` to ensure `response` is correctly typed.
        const response = await retryWithBackoff<GenerateContentResponse>(apiCall);
        return response.text;
    } catch (error) {
      console.error("Error improving description after retries:", error);
      return description;
    }
  },

  async getAISmartMatch(lostItem: Item, foundItem: Item) {
      const prompt = `
        Analyze this pair of lost and found items and determine a match score from 0 to 100.
        Provide clear reasons for your score. Consider name, category, description, location, and date.
        A close date and location are strong indicators. Identical keywords in description are very important.
        
        Lost Item:
        - Name: ${lostItem.name}
        - Category: ${lostItem.category}
        - Description: ${lostItem.description}
        - Location: ${lostItem.location}
        - Date: ${lostItem.date}
        
        Found Item:
        - Name: ${foundItem.name}
        - Category: ${foundItem.category}
        - Description: ${foundItem.description}
        - Location: ${foundItem.location}
        - Date: ${foundItem.date}

        Return a JSON object with keys: "matchScore" (number) and "reasons" (an array of strings).
      `;
      try {
        const apiCall = () => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        matchScore: { type: Type.NUMBER },
                        reasons: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["matchScore", "reasons"]
                }
            }
        });

        // FIX: Explicitly provide the generic type to `retryWithBackoff` to ensure `response` is correctly typed.
        const response = await retryWithBackoff<GenerateContentResponse>(apiCall);
        const text = response.text.trim();
        return JSON.parse(text);
      } catch (error) {
          console.error("Error getting AI smart match after retries:", error);
          return { matchScore: 0, reasons: ["AI analysis failed due to connection issues."] };
      }
  },
  
  async analyzeForAdmin(item: Item) {
    const prompt = `
      As an admin for a university lost and found system, analyze this report for potential issues like being a fake report, spam, or containing inappropriate content.
      Provide a brief analysis and a "suspicionLevel" from 0 (low) to 10 (high).
      
      Item Report:
      - Name: ${item.name}
      - Category: ${item.category}
      - Description: ${item.description}
      - Location: ${item.location}
      - User ID: ${item.userId}
      
      Return a JSON object with keys: "analysis" (string) and "suspicionLevel" (number).
    `;
    try {
      const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING },
              suspicionLevel: { type: Type.NUMBER }
            },
            required: ["analysis", "suspicionLevel"]
          }
        }
      });
      
      // FIX: Explicitly provide the generic type to `retryWithBackoff` to ensure `response` is correctly typed.
      const response = await retryWithBackoff<GenerateContentResponse>(apiCall);
      const text = response.text.trim();
      return JSON.parse(text);
    } catch(error) {
      console.error("Error with admin analysis after retries:", error);
      return { analysis: "AI analysis failed due to connection issues.", suspicionLevel: -1 };
    }
  },

  async suggestPickupLocation(item: Item) {
    const prompt = `
      A student needs to schedule a pickup for a lost and found item on the Georgia State University (GSU) campus.
      The item is a "${item.name}" (category: ${item.category}).
      Suggest the best, safest, and most convenient public meeting location from the following list of official campus locations.
      Provide a brief reason for your choice. For example, a high-value item like a laptop should be exchanged at a very secure location.

      Official Locations: ${CAMPUS_LOCATIONS.join(', ')}

      Return a JSON object with keys: "location" (string, must be one from the list) and "reason" (string).
    `;
     try {
      const apiCall = () => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["location", "reason"]
          }
        }
      });
      const response = await retryWithBackoff<GenerateContentResponse>(apiCall);
      const text = response.text.trim();
      return JSON.parse(text);
    } catch(error) {
      console.error("Error with location suggestion after retries:", error);
      return { location: CAMPUS_LOCATIONS[0], reason: "AI suggestion failed. The Library is always a safe, public choice." };
    }
  }
};