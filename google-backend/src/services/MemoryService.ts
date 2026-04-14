import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GeminiService } from "./GeminiService";

export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  appId: string;
  provenance: string;
  createdAt: Date;
}

/**
 * MemoryService — dual-mode persistence.
 *
 * When SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set in env the service
 * reads/writes to the `agent_memories` table and uses pgvector cosine search
 * via the `search_memories` RPC.
 *
 * Falls back to the original in-memory array when Supabase is not configured
 * (preserves behaviour in unit tests and local dev without Supabase).
 */
export class MemoryService {
  private entries: MemoryEntry[] = [];     // in-memory fallback
  private geminiService: GeminiService;
  private supabase: SupabaseClient | null = null;

  constructor(geminiService: GeminiService) {
    this.geminiService = geminiService;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  async store(content: string, appId: string, provenance: string): Promise<MemoryEntry> {
    const embedding = await this.geminiService.generateEmbedding(content);
    const id = `mem_${crypto.randomUUID()}`;

    if (this.supabase) {
      const { error } = await this.supabase.from("agent_memories").insert({
        id,
        app_id: appId,
        content,
        embedding: embedding.length > 0 ? embedding : null,
        provenance,
      });
      if (error) console.warn("[MemoryService] Supabase store error:", error.message);
    }

    // Always keep a local copy so tests + in-memory search still work
    const entry: MemoryEntry = {
      id,
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
    const queryEmbedding = await this.geminiService.generateEmbedding(query);

    // ── Supabase pgvector path ──────────────────────────────
    if (this.supabase && queryEmbedding.length > 0) {
      const { data, error } = await this.supabase.rpc("search_memories", {
        query_embedding: queryEmbedding,
        match_app_id: appId,
        match_count: topK,
      });
      if (error) {
        console.warn("[MemoryService] Supabase search error:", error.message);
        // Fall through to in-memory
      } else {
        return (data ?? []).map((row: { id: string; content: string; provenance: string }) => ({
          id: row.id,
          content: row.content,
          embedding: [],          // not returned by RPC to save bandwidth
          appId,
          provenance: row.provenance,
          createdAt: new Date(),
        }));
      }
    }

    // ── In-memory fallback ──────────────────────────────────
    if (this.entries.length === 0) return [];
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
