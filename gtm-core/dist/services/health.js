"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAllHealth = checkAllHealth;
exports.checkAppHealth = checkAppHealth;
const axios_1 = __importDefault(require("axios"));
const registry_1 = require("./registry");
const TIMEOUT_MS = 8000;
async function checkOne(app) {
    const start = Date.now();
    try {
        const res = await axios_1.default.get(app.url, {
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
    }
    catch (err) {
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
async function checkAllHealth() {
    const active = registry_1.APP_REGISTRY.filter((a) => a.active);
    const results = await Promise.allSettled(active.map(checkOne));
    return results.map((r, i) => {
        if (r.status === "fulfilled")
            return r.value;
        return {
            id: active[i].id,
            name: active[i].name,
            url: active[i].url,
            status: "unknown",
            latencyMs: null,
            checkedAt: new Date().toISOString(),
            error: "Promise rejected",
        };
    });
}
async function checkAppHealth(id) {
    const app = registry_1.APP_REGISTRY.find((a) => a.id === id);
    if (!app)
        return null;
    return checkOne(app);
}
//# sourceMappingURL=health.js.map