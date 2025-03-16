import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summarizeSchema } from "@shared/schema";
import { summarizeText } from "./openai";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/summarize", async (req, res) => {
    try {
      const { text } = summarizeSchema.parse(req.body);

      const summary = await summarizeText(text);

      const result = await storage.createSummarization({
        originalText: text,
        summary,
      });

      res.json({ summary });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.errors[0].message });
      } else {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        res.status(500).json({ message });
      }
    }
  });

  return createServer(app);
}