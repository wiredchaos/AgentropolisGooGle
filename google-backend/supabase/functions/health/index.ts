// supabase/functions/health/index.ts
// GET /functions/v1/health
// Public health check — no auth required.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Quick DB ping — count app_registry rows
    const { count, error } = await supabase
      .from("app_registry")
      .select("*", { count: "exact", head: true })
      .eq("active", true);

    if (error) throw error;

    return new Response(
      JSON.stringify({
        status: "ok",
        service: "google-agent-engine",
        database: "connected",
        active_apps: count ?? 0,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "degraded", error: String(err) }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
