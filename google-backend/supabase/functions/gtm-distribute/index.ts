// supabase/functions/gtm-distribute/index.ts
// POST /functions/v1/gtm-distribute
//
// Fan-out a GTM event to all apps that match the requested roles.
// Logs event + per-app results to Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DistributePayload = {
  type: "content" | "lead" | "workflow" | "signal" | "broadcast";
  title: string;
  body: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  targetRoles?: string[];
  sourceAppId?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: Partial<DistributePayload>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { type, title, body, tags, metadata, targetRoles, sourceAppId } = payload;
  const VALID_TYPES = ["content", "lead", "workflow", "signal", "broadcast"];

  if (!type || !title || !body) {
    return new Response(JSON.stringify({ error: "type, title, and body are required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!VALID_TYPES.includes(type)) {
    return new Response(
      JSON.stringify({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Resolve target apps from registry
  const roles = targetRoles && targetRoles.length > 0 ? targetRoles : [type];
  const { data: apps, error: regErr } = await supabase
    .from("app_registry")
    .select("id, name, url, gtm_roles")
    .eq("active", true);

  if (regErr || !apps) {
    return new Response(JSON.stringify({ error: "Registry unavailable", details: regErr?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targets = apps.filter((app) =>
    roles.some((role) => Array.isArray(app.gtm_roles) && app.gtm_roles.includes(role))
  );

  // Log GTM event
  const { data: eventRow } = await supabase
    .from("gtm_events")
    .insert({
      event_type: "distribution_event",
      app_id: sourceAppId ?? null,
      payload: { type, title, body: body.slice(0, 500), tags, metadata, targets: targets.map(t => t.id) },
      source: sourceAppId ?? "gtm-distribute",
    })
    .select("id")
    .single();

  const eventId = eventRow?.id ?? null;

  // Fan-out — fire and don't wait long
  const results = await Promise.allSettled(
    targets.map(async (app) => {
      const appUrl = `${app.url}/api/gtm/receive`;
      try {
        const res = await fetch(appUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-GTM-Source": "supabase-edge" },
          body: JSON.stringify({ type, title, body, tags, metadata, fromCore: true }),
          signal: AbortSignal.timeout(6000),
        });
        const success = res.status < 400;
        await supabase.from("gtm_distribution_log").insert({
          event_id: eventId,
          target_app: app.id,
          target_url: appUrl,
          success,
          status_code: res.status,
        });
        return { appId: app.id, success, statusCode: res.status };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await supabase.from("gtm_distribution_log").insert({
          event_id: eventId,
          target_app: app.id,
          target_url: appUrl,
          success: false,
          error: errorMsg,
        });
        return { appId: app.id, success: false, error: errorMsg };
      }
    })
  );

  const resolved = results.map((r) =>
    r.status === "fulfilled" ? r.value : { appId: "unknown", success: false, error: "rejected" }
  );
  const succeeded = resolved.filter((r) => r.success).length;

  return new Response(
    JSON.stringify({
      dispatched: resolved.length,
      succeeded,
      failed: resolved.length - succeeded,
      results: resolved,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
