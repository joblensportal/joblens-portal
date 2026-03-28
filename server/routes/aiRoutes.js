
import express from "express";
import { analyzeResumeAI, chatWithCareerAI } from "../ai/openaiService.js";
import { requireAuth } from "@clerk/express";
import fs from "fs/promises";
import upload from "../config/multer.js";
import { PDFParse } from "pdf-parse";

const router = express.Router();
const aiRequestLog = new Map();

const getAIErrorMessage = (error, fallbackMessage) => {
  if (error?.status === 429 && error?.code === "insufficient_quota") {
    return "AI quota exceeded. Please update Gemini billing/quota and try again.";
  }

  if (error?.status === 401 || error?.status === 403 || error?.code === "invalid_api_key") {
    return "GEMINI_API_KEY is invalid. Update the API key in server environment variables.";
  }

  return fallbackMessage;
};

const extractResumeText = async (req) => {
  if (req.file) {
    if (req.file.mimetype !== "application/pdf") {
      throw new Error("Only PDF resumes are supported for file upload.");
    }

    const fileBuffer = await fs.readFile(req.file.path);
    const parser = new PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();
    await parser.destroy();
    const parsedText = parsed?.text?.trim();

    if (!parsedText) {
      throw new Error("Could not read text from the uploaded PDF.");
    }

    return parsedText;
  }

  const resumeText = req.body?.resumeText;
  if (!resumeText || typeof resumeText !== "string") {
    throw new Error("Provide resume text or upload a PDF resume.");
  }
  return resumeText;
};

const aiLimiter = (req, res, next) => {
  const { userId } = req.auth();
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 20;
  const userEntries = aiRequestLog.get(userId) || [];
  const freshEntries = userEntries.filter((time) => now - time < windowMs);

  if (freshEntries.length >= maxRequests) {
    return res.status(429).json({ success: false, message: "Too many AI requests. Try again shortly." });
  }

  freshEntries.push(now);
  aiRequestLog.set(userId, freshEntries);
  return next();
};

router.post("/analyze-resume", requireAuth(), upload.single("resume"), aiLimiter, async (req, res) => {
  try {
    const resumeText = await extractResumeText(req);
    if (resumeText.length > 10000) {
      return res.status(400).json({ success: false, message: "resumeText is too long" });
    }
    const result = await analyzeResumeAI(resumeText);
    return res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    const message = getAIErrorMessage(error, error?.message || "AI analysis failed");
    const status = message === "AI analysis failed" ? 500 : 400;
    return res.status(status).json({ success: false, message });
  } finally {
    if (req.file?.path) {
      fs.unlink(req.file.path).catch(() => {});
    }
  }
});

router.post("/chat", requireAuth(), aiLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: "message is too long" });
    }
    const reply = await chatWithCareerAI(message);
    return res.json({ success: true, reply });
  } catch (error) {
    console.error(error);
    const message = getAIErrorMessage(error, "AI chat failed");
    const status = message === "AI chat failed" ? 500 : 400;
    return res.status(status).json({ success: false, message });
  }
});

export default router;
