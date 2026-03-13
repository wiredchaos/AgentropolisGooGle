import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = "gemini-2.5-flash";
const EMBEDDING_MODEL = "gemini-embedding-001";

export class GeminiService {
  private _client: GoogleGenAI | null = null;

  private get client(): GoogleGenAI {
    if (!this._client) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_API_KEY environment variable is required");
      }
      this._client = new GoogleGenAI({ apiKey });
    }
    return this._client;
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await this.client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text ?? "";
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    return response.embeddings?.[0]?.values ?? [];
  }
}
