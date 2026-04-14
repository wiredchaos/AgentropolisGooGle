"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_1 = require("../services/analytics");
const router = (0, express_1.Router)();
/** GET /api/analytics — summary stats */
router.get("/", (_req, res) => {
    res.json((0, analytics_1.getSummaryStats)());
});
/** GET /api/analytics/events?limit=50 */
router.get("/events", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json((0, analytics_1.getRecentEvents)(limit));
});
/** GET /api/analytics/events/type/:type */
router.get("/events/type/:type", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json((0, analytics_1.getEventsByType)(req.params.type, limit));
});
/** GET /api/analytics/events/app/:appId */
router.get("/events/app/:appId", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    res.json((0, analytics_1.getEventsByApp)(req.params.appId, limit));
});
exports.default = router;
//# sourceMappingURL=analytics.js.map