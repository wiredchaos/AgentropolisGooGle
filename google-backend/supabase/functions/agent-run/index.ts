// supabase/functions/agent-run/index.ts
// POST /functions/v1/agent-run
//
// Replaces the Express POST /agent/run endpoint.
// Uses Gemini via GOOGLE_API_KEY secret.
// Persists memories + run logs to Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL     = "gemini-2.5-flash";
const EMBEDDING_MODEL  = "gemini-embedding-001";
const GEMINI_BASE      = "https://generativelanguage.googleapis.com/v1beta";

// ── Gemini helpers ────────────────────────────────────────────

async function generateContent(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function generateEmbedding(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch(
    `${GEMINI_BASE}/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: `models/${EMBEDDING_MODEL}`, content: { parts: [{ text }] } }),
    }
  );
  if (!res.ok) {
    // Embedding failures are non-fatal — return zeros
    console.warn("Embedding failed:", res.status);
    return [];
  }
  const data = await res.json();
  return data.embedding?.values ?? [];
}

// ── Memory helpers ────────────────────────────────────────────

async function searchMemories(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  query: string,
  appId: string
): Promise<{ content: string; provenance: string }[]> {
  const embedding = await generateEmbedding(apiKey, query);
  if (embedding.length === 0) return [];

  const { data, error } = await supabase.rpc("search_memories", {
    query_embedding: embedding,
    match_app_id: appId,
    match_count: 5,
  });
  if (error) { console.warn("Memory search error:", error); return []; }
  return (data ?? []) as { content: string; provenance: string }[];
}

async function storeMemory(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  content: string,
  appId: string,
  provenance: string
): Promise<void> {
  const embedding = await generateEmbedding(apiKey, content);
  const { error } = await supabase.from("agent_memories").insert({
    app_id: appId,
    content,
    embedding: embedding.length > 0 ? embedding : null,
    provenance,
  });
  if (error) console.warn("Memory store error:", error);
}

// ── Mode instructions ─────────────────────────────────────────

const MODE_INSTRUCTIONS: Record<string, string> = {
  teacher: "Use simple language, short sentences, and clear examples suitable for a beginner. Avoid jargon.",
  default: "Provide a thorough, helpful response.",
};

// ── RLM pipeline ──────────────────────────────────────────────

async function runRLM(
  supabase: ReturnType<typeof createClient>,
  apiKey: string,
  prompt: string,
  appId: string,
  mode: string | undefined,
  context: Record<string, unknown>
) {
  const modeInstruction =
    (mode && MODE_INSTRUCTIONS[mode]) || MODE_INSTRUCTIONS.default;
  const contextStr =
    Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : "No additional context.";

  // 1. Observe
  const memories = await searchMemories(supabase, apiKey, prompt, appId);
  const memoryContext =
    memories.length > 0
      ? memories.map((m) => `[Memory] ${m.content}`).join("\n")
      : "No relevant memories found.";

  const observation = await generateContent(
    apiKey,
    `You are an observational agent. Summarize the current state:\n\nUser prompt: ${prompt}\nApplication: ${appId}\nContext: ${contextStr}\nMemories:\n${memoryContext}\n\nProvide a concise observation.`
  );

  // 2. Plan
  const plan = await generateContent(
    apiKey,
    `You are a planning agent. Create a step-by-step plan.\n\nUser prompt: ${prompt}\nObservation: ${observation}\n\nProvide a clear, numbered plan.`
  );

  // 3. Act
  const action = await generateContent(
    apiKey,
    `You are an action agent. Execute the plan and respond to the user.\n\nUser prompt: ${prompt}\nPlan: ${plan}\nTone: ${modeInstruction}`
  );

  // 4. Reflect
  const reflection = await generateContent(
    apiKey,
    `You are a reflective agent. Assess this response.\n\nPrompt: ${prompt}\nResponse: ${action}\n\nBrief reflection only.`
  );

  // 5. Confidence score
  const rawConf = await generateContent(
    apiKey,
    `Rate this response quality 0.0-1.0.\n\nResponse: ${action}\nReflection: ${reflection}\n\nRespond with ONLY a decimal number.`
  );
  const confidence = Math.min(1, Math.max(0, parseFloat(rawConf.trim()) || 0.8));

  // 6. Next action
  const nextAction = await generateContent(
    apiKey,
    `What is the single most important next step for the user?\n\nPrompt: ${prompt}\nPlan: ${plan}\nResponse: ${action}\n\nOne sentence only.`
  );

  // 7. Store memory
  await storeMemory(
    supabase,
    apiKey,
    `Q: ${prompt}\nA: ${action}`,
    appId,
    `rlm:${new Date().toISOString()}`
  );

  return { action, reflection, confidence, nextAction, observation, plan };
}

// ── Main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GOOGLE_API_KEY is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { prompt, appId, mode, context } = body as {
    prompt?: string; appId?: string; mode?: string; context?: Record<string, unknown>;
  };

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "prompt is required and must be a string" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!appId || typeof appId !== "string") {
    return new Response(JSON.stringify({ error: "appId is required and must be a string" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const startMs = Date.now();
  try {
    const result = await runRLM(
      supabase,
      apiKey,
      prompt,
      appId,
      typeof mode === "string" ? mode : undefined,
      (context as Record<string, unknown>) ?? {}
    );

    const durationMs = Date.now() - startMs;

    // Persist run log
    await supabase.from("agent_runs").insert({
      app_id: appId,
      mode: mode ?? null,
      prompt,
      answer: result.action,
      reasoning_summary: result.reflection,
      next_action: result.nextAction,
      confidence: result.confidence,
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        answer: result.action,
        reasoningSummary: result.reflection,
        nextAction: result.nextAction,
        confidence: result.confidence,
        durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[agent-run] Error:", err);
    return new Response(
      JSON.stringify({
        error: "Agent execution failed",
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
