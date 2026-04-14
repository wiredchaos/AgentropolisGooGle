"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_1 = require("../services/health");
const analytics_1 = require("../services/analytics");
const router = (0, express_1.Router)();
/** GET /api/health — health of ALL registered apps */
router.get("/", async (_req, res) => {
    (0, analytics_1.trackEvent)("health_check", "health-route");
    try {
        const results = await (0, health_1.checkAllHealth)();
        const up = results.filter((r) => r.status === "up").length;
        const down = results.filter((r) => r.status === "down").length;
        res.json({
            summary: { total: results.length, up, down, unknown: results.length - up - down },
            checkedAt: new Date().toISOString(),
            results,
        });
    }
    catch (err) {
        res.status(500).json({
            error: "Health check failed",
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
/** GET /api/health/:id — health of one app */
router.get("/:id", async (req, res) => {
    try {
        const result = await (0, health_1.checkAppHealth)(req.params.id);
        if (!result) {
            res.status(404).json({ error: `App '${req.params.id}' not found` });
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({
            error: "Health check failed",
            details: err instanceof Error ? err.message : String(err),
        });
    }
});
exports.default = router;
//# sourceMappingURL=health.js.map