import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const summarizations = pgTable("summarizations", {
  id: serial("id").primaryKey(),
  originalText: text("original_text").notNull(),
  summary: text("summary").notNull(),
});

export const insertSummarizationSchema = createInsertSchema(summarizations).pick({
  originalText: true,
  summary: true,
});

export type InsertSummarization = z.infer<typeof insertSummarizationSchema>;
export type Summarization = typeof summarizations.$inferSelect;

export const summarizeSchema = z.object({
  text: z.string().min(1, "Text is required").max(10000, "Text is too long"),
});
