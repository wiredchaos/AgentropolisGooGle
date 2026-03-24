import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";

export class GeminiService {
  private client: GoogleGenAI | null = null;

<<<<<<< copilot/npm-run-dev-command
  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    } else {
      console.warn(
        "[GeminiService] GOOGLE_API_KEY is not set. AI features will be unavailable until it is configured."
      );
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      throw new Error(
        "GOOGLE_API_KEY environment variable is required to use AI features"
      );
    }
=======
  constructor() {}

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is required");
      }
      this.client = new GoogleGenAI({ apiKey });
    }
>>>>>>> main
    return this.client;
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await this.getClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text ?? "";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.getClient().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    return response.embeddings?.[0]?.values ?? [];
  }
}
