import axios from "axios";
import { APP_REGISTRY, RegisteredApp } from "./registry";

export type HealthStatus = "up" | "down" | "unknown";

export interface AppHealthResult {
  id: string;
  name: string;
  url: string;
  status: HealthStatus;
  latencyMs: number | null;
  checkedAt: string;
  error?: string;
}

const TIMEOUT_MS = 8000;

async function checkOne(app: RegisteredApp): Promise<AppHealthResult> {
  const start = Date.now();
  try {
    const res = await axios.get(app.url, {
      timeout: TIMEOUT_MS,
      validateStatus: (s) => s < 500,
      headers: { "User-Agent": "GTMCore-HealthBot/1.0" },
    });
    const latencyMs = Date.now() - start;
    return {
      id: app.id,
      name: app.name,
      url: app.url,
      status: res.status < 400 ? "up" : "down",
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      id: app.id,
      name: app.name,
      url: app.url,
      status: "down",
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function checkAllHealth(): Promise<AppHealthResult[]> {
  const active = APP_REGISTRY.filter((a) => a.active);
  const results = await Promise.allSettled(active.map(checkOne));
  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return {
      id: active[i].id,
      name: active[i].name,
      url: active[i].url,
      status: "unknown" as HealthStatus,
      latencyMs: null,
      checkedAt: new Date().toISOString(),
      error: "Promise rejected",
    };
  });
}

export async function checkAppHealth(id: string): Promise<AppHealthResult | null> {
  const app = APP_REGISTRY.find((a) => a.id === id);
  if (!app) return null;
  return checkOne(app);
}
