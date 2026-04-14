import { Router, Request, Response } from "express";
import { checkAllHealth, checkAppHealth } from "../services/health";
import { trackEvent } from "../services/analytics";

const router = Router();

/** GET /api/health — health of ALL registered apps */
router.get("/", async (_req: Request, res: Response) => {
  trackEvent("health_check", "health-route");
  try {
    const results = await checkAllHealth();
    const up = results.filter((r) => r.status === "up").length;
    const down = results.filter((r) => r.status === "down").length;
    res.json({
      summary: { total: results.length, up, down, unknown: results.length - up - down },
      checkedAt: new Date().toISOString(),
      results,
    });
  } catch (err) {
    res.status(500).json({
      error: "Health check failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/** GET /api/health/:id — health of one app */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const result = await checkAppHealth(req.params.id);
    if (!result) {
      res.status(404).json({ error: `App '${req.params.id}' not found` });
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: "Health check failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
