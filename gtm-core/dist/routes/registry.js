"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const registry_1 = require("../services/registry");
const analytics_1 = require("../services/analytics");
const router = (0, express_1.Router)();
/** GET /api/registry — full registry */
router.get("/", (_req, res) => {
    res.json({
        total: registry_1.APP_REGISTRY.length,
        active: (0, registry_1.getActiveApps)().length,
        apps: registry_1.APP_REGISTRY,
    });
});
/** GET /api/registry/active — only active apps */
router.get("/active", (_req, res) => {
    res.json((0, registry_1.getActiveApps)());
});
/** GET /api/registry/:id — single app */
router.get("/:id", (req, res) => {
    const app = (0, registry_1.getAppById)(req.params.id);
    if (!app) {
        res.status(404).json({ error: `App '${req.params.id}' not found` });
        return;
    }
    (0, analytics_1.trackEvent)("app_visited", "registry-route", { appId: app.id });
    res.json(app);
});
/** GET /api/registry/layer/:layer */
router.get("/layer/:layer", (req, res) => {
    const apps = (0, registry_1.getAppsByLayer)(req.params.layer);
    res.json({ layer: req.params.layer, count: apps.length, apps });
});
/** GET /api/registry/role/:role */
router.get("/role/:role", (req, res) => {
    const apps = (0, registry_1.getAppsByGtmRole)(req.params.role);
    res.json({ role: req.params.role, count: apps.length, apps });
});
exports.default = router;
//# sourceMappingURL=registry.js.map