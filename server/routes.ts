import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { summarizeSchema } from "@shared/schema";
import { analyzeText } from "./openai";
import { ZodError } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/summarize", async (req, res) => {
    try {
      const { text } = summarizeSchema.parse(req.body);

      const analysis = await analyzeText(text);

      const formattedOutput = `${analysis.title}\n\nKey Facts:\n1. ${analysis.interestingFacts[0]}\n2. ${analysis.interestingFacts[1]}\n\nSummary:\n${analysis.summary}`;

      const result = await storage.createSummarization({
        originalText: text,
        summary: formattedOutput,
      });

      res.json({ summary: formattedOutput });
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