import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function summarizeText(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a text summarization expert. Provide a 5-sentence summary of the given text that captures the key points while maintaining readability and coherence. Return only the summary text."
        },
        {
          role: "user",
          content: text
        }
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to summarize text: ${errorMessage}`);
  }
}