import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { apiKeyAuth } from "./middleware/auth";
import registryRouter from "./routes/registry";
import healthRouter from "./routes/health";
import distributeRouter from "./routes/distribute";
import analyticsRouter from "./routes/analytics";
import workflowRouter from "./routes/workflow";
import { APP_REGISTRY } from "./services/registry";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3002", 10);

// ── Security & logging ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-GTM-Source"],
  })
);
app.use(morgan("combined"));
app.use(express.json({ limit: "1mb" }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
});
app.use("/api", limiter);

// ── Auth ──────────────────────────────────────────────────────────────────────
app.use("/api", apiKeyAuth);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/registry", registryRouter);
app.use("/api/health", healthRouter);
app.use("/api/distribute", distributeRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/workflows", workflowRouter);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "GTM Distribution Layer — Core Backend",
    version: "1.0.0",
    by: "NEURO METAX",
    status: "operational",
    registeredApps: APP_REGISTRY.length,
    activeApps: APP_REGISTRY.filter((a) => a.active).length,
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
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[GTM-Core Error]", err);
    res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : String(err),
    });
  }
);

app.listen(PORT, () => {
  console.log(`\n🧠 GTM Distribution Layer — Core Backend`);
  console.log(`   By NEURO METAX`);
  console.log(`   ▶ Listening on http://localhost:${PORT}`);
  console.log(`   ▶ ${APP_REGISTRY.filter((a) => a.active).length} apps registered\n`);
});

export default app;
