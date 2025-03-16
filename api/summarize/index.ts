import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { OpenAI } from "openai";
import { z } from "zod";

const summarizeSchema = z.object({
  text: z.string().min(1, "Text is required").max(10000, "Text is too long"),
});

interface TextAnalysis {
  title: string;
  interestingFacts: string[];
  summary: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Rate limiting implementation
interface RateLimitStore {
  timestamp: number;
  count: number;
}

const rateLimits = new Map<string, RateLimitStore>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10;

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const current = rateLimits.get(ip);
  if (!current || current.timestamp < windowStart) {
    // First request or window expired
    rateLimits.set(ip, { timestamp: now, count: 1 });
    return { allowed: true };
  }

  if (current.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((current.timestamp + WINDOW_MS - now) / 1000)
    };
  }

  // Increment the counter
  current.count++;
  rateLimits.set(ip, current);
  return { allowed: true };
}

async function analyzeText(text: string): Promise<TextAnalysis> {
  try {
    // Step 1: Generate title
    const titleResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a title generation expert. Create a concise, engaging title for the given text. Return only the title text."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const title = titleResponse.choices[0].message.content || "Untitled";

    // Step 2: Extract interesting facts
    const factsResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fact extraction expert. Extract exactly two of the most interesting facts from the given text. Return only the facts, each on a new line."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const facts = factsResponse.choices[0].message.content?.split('\n').filter(Boolean) || [];

    // Step 3: Generate summary
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a text summarization expert. Provide a 3-sentence summary of the given text that captures the key points while maintaining readability and coherence. Return only the summary text."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    const summary = summaryResponse.choices[0].message.content || "";

    return {
      title,
      interestingFacts: facts,
      summary
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to analyze text: ${errorMessage}`);
  }
}

export async function summarizeFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Check rate limit
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("client-ip") || "unknown";
    const rateLimit = checkRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return {
        status: 429,
        jsonBody: {
          message: "Too many requests. Please try again in a minute.",
          retryAfter: rateLimit.retryAfter
        }
      };
    }

    const body = await request.json();
    const { text } = summarizeSchema.parse(body);

    const analysis = await analyzeText(text);
    const formattedOutput = `${analysis.title}\n\nKey Facts:\n1. ${analysis.interestingFacts[0]}\n2. ${analysis.interestingFacts[1]}\n\nSummary:\n${analysis.summary}`;

    return {
      status: 200,
      jsonBody: { summary: formattedOutput }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400,
        jsonBody: { message: error.errors[0].message }
      };
    } else {
      const message = error instanceof Error ? error.message : 'An unknown error occurred';
      return {
        status: 500,
        jsonBody: { message }
      };
    }
  }
}