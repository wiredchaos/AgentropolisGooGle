import axios from "axios";
import { getAppsByGtmRole, RegisteredApp } from "./registry";
import { trackEvent } from "./analytics";

export interface DistributionPayload {
  type: "content" | "lead" | "workflow" | "signal" | "broadcast";
  title: string;
  body: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  targetRoles?: string[];
  sourceAppId?: string;
}

export interface DistributionResult {
  appId: string;
  appName: string;
  url: string;
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Fan-out a GTM distribution event to all apps that match the requested roles.
 * Apps receive a POST to `{app.url}/api/gtm/receive` — if they don't implement
 * this endpoint the call will fail gracefully and be logged.
 */
export async function distribute(
  payload: DistributionPayload
): Promise<DistributionResult[]> {
  const roles = payload.targetRoles ?? [payload.type];
  const targets: RegisteredApp[] = [];

  for (const role of roles) {
    for (const app of getAppsByGtmRole(role)) {
      if (!targets.find((t) => t.id === app.id)) targets.push(app);
    }
  }

  trackEvent("distribution_event", payload.sourceAppId ?? "gtm-core", {
    appId: payload.sourceAppId,
    payload: { type: payload.type, title: payload.title, targets: targets.map((t) => t.id) },
  });

  const results = await Promise.allSettled(
    targets.map((app) =>
      axios
        .post(
          `${app.url}/api/gtm/receive`,
          { ...payload, fromCore: true },
          { timeout: 6000, headers: { "X-GTM-Source": "gtm-core" } }
        )
        .then((res) => ({
          appId: app.id,
          appName: app.name,
          url: app.url,
          success: res.status < 400,
          statusCode: res.status,
        }))
        .catch((err) => ({
          appId: app.id,
          appName: app.name,
          url: app.url,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        }))
    )
  );

  return results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { appId: "unknown", appName: "unknown", url: "", success: false, error: "rejected" }
  );
}
