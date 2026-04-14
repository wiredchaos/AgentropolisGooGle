"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.distribute = distribute;
const axios_1 = __importDefault(require("axios"));
const registry_1 = require("./registry");
const analytics_1 = require("./analytics");
/**
 * Fan-out a GTM distribution event to all apps that match the requested roles.
 * Apps receive a POST to `{app.url}/api/gtm/receive` — if they don't implement
 * this endpoint the call will fail gracefully and be logged.
 */
async function distribute(payload) {
    const roles = payload.targetRoles ?? [payload.type];
    const targets = [];
    for (const role of roles) {
        for (const app of (0, registry_1.getAppsByGtmRole)(role)) {
            if (!targets.find((t) => t.id === app.id))
                targets.push(app);
        }
    }
    (0, analytics_1.trackEvent)("distribution_event", payload.sourceAppId ?? "gtm-core", {
        appId: payload.sourceAppId,
        payload: { type: payload.type, title: payload.title, targets: targets.map((t) => t.id) },
    });
    const results = await Promise.allSettled(targets.map((app) => axios_1.default
        .post(`${app.url}/api/gtm/receive`, { ...payload, fromCore: true }, { timeout: 6000, headers: { "X-GTM-Source": "gtm-core" } })
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
    }))));
    return results.map((r) => r.status === "fulfilled"
        ? r.value
        : { appId: "unknown", appName: "unknown", url: "", success: false, error: "rejected" });
}
//# sourceMappingURL=distribute.js.map