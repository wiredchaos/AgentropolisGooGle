import { GeminiService } from "./GeminiService";

export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  appId: string;
  provenance: string;
  createdAt: Date;
}

export class MemoryService {
  private entries: MemoryEntry[] = [];
  private geminiService: GeminiService;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;
  }

  async store(
    content: string,
    appId: string,
    provenance: string
  ): Promise<MemoryEntry> {
    const embedding = await this.geminiService.generateEmbedding(content);
    const entry: MemoryEntry = {
      id: `mem_${crypto.randomUUID()}`,
      content,
      embedding,
      appId,
      provenance,
      createdAt: new Date(),
    };
    this.entries.push(entry);
    return entry;
  }

  async search(query: string, appId: string, topK = 5): Promise<MemoryEntry[]> {
    if (this.entries.length === 0) return [];

    const queryEmbedding = await this.geminiService.generateEmbedding(query);
    const appEntries = this.entries.filter((e) => e.appId === appId);

    const scored = appEntries.map((entry) => ({
      entry,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.entry);
  }

  listByApp(appId: string): MemoryEntry[] {
    return this.entries.filter((e) => e.appId === appId);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}
