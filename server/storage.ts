import { summarizations, type Summarization, type InsertSummarization } from "@shared/schema";

export interface IStorage {
  createSummarization(summarization: InsertSummarization): Promise<Summarization>;
}

export class MemStorage implements IStorage {
  private summarizations: Map<number, Summarization>;
  private currentId: number;

  constructor() {
    this.summarizations = new Map();
    this.currentId = 1;
  }

  async createSummarization(insertSummarization: InsertSummarization): Promise<Summarization> {
    const id = this.currentId++;
    const summarization: Summarization = { ...insertSummarization, id };
    this.summarizations.set(id, summarization);
    return summarization;
  }
}

export const storage = new MemStorage();
