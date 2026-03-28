
import { GoogleGenAI } from "@google/genai";

const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
};

const extractText = (response) => {
  if (!response) return "";
  if (typeof response.text === "string") return response.text;
  if (typeof response.text === "function") return response.text();
  return "";
};

export const analyzeResumeAI = async (resumeText) => {
  const client = getClient();
  const response = await client.models.generateContent({
    model: geminiModel,
    contents: [
      "You are an HR assistant that analyzes resumes.",
      `Analyze this resume and return skills, experience level, strengths, weaknesses, and a suitability score out of 100:\n${resumeText}`,
    ],
  });

  return extractText(response);
};

export const chatWithCareerAI = async (message) => {
  const client = getClient();
  const response = await client.models.generateContent({
    model: geminiModel,
    contents: [
      "You are a career advisor chatbot. Give practical and concise guidance.",
      message,
    ],
  });

  return extractText(response);
};
