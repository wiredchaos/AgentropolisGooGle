"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_1 = require("./middleware/auth");
const registry_1 = __importDefault(require("./routes/registry"));
const health_1 = __importDefault(require("./routes/health"));
const distribute_1 = __importDefault(require("./routes/distribute"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const workflow_1 = __importDefault(require("./routes/workflow"));
const registry_2 = require("./services/registry");
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT ?? "3002", 10);
// ── Security & logging ────────────────────────────────────────────────────────
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-GTM-Source"],
}));
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "1mb" }));
// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests — slow down." },
});
app.use("/api", limiter);
// ── Auth ──────────────────────────────────────────────────────────────────────
app.use("/api", auth_1.apiKeyAuth);
// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/registry", registry_1.default);
app.use("/api/health", health_1.default);
app.use("/api/distribute", distribute_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/workflows", workflow_1.default);
// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
    res.json({
        name: "GTM Distribution Layer — Core Backend",
        version: "1.0.0",
        by: "NEURO METAX",
        status: "operational",
        registeredApps: registry_2.APP_REGISTRY.length,
        activeApps: registry_2.APP_REGISTRY.filter((a) => a.active).length,
        auth: process.env.GTM_API_KEY ? "enabled" : "open",
        endpoints: {
            registry: "/api/registry",
            registryById: "/api/registry/:id",
            registryByLayer: "/api/registry/layer/:layer",
            registryByRole: "/api/registry/role/:role",
            health: "/api/health",
            healthById: "/api/health/:id",
            distribute: "POST /api/distribute",
            workflows: "/api/workflows",
            workflowById: "/api/workflows/:id",
            workflowTrigger: "POST /api/workflows/:id/trigger",
            analytics: "/api/analytics",
            analyticsEvents: "/api/analytics/events",
        },
        docs: "https://neurometax.com/gtm-core/docs",
    });
});
// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[GTM-Core Error]", err);
    res.status(500).json({
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err),
    });
});
app.listen(PORT, () => {
    console.log(`\n🧠 GTM Distribution Layer — Core Backend`);
    console.log(`   By NEURO METAX`);
    console.log(`   ▶ Listening on http://localhost:${PORT}`);
    console.log(`   ▶ ${registry_2.APP_REGISTRY.filter((a) => a.active).length} apps registered\n`);
});
exports.default = app;
//# sourceMappingURL=index.js.map