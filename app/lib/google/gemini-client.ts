import { GoogleGenAI } from '@google/genai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is missing.');
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const DEFAULT_MODEL = 'gemini-3.6-flash';
export async function askGemini(prompt: string, model = DEFAULT_MODEL) {
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text;
}