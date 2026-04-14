import { Router, Request, Response } from "express";
import {
  APP_REGISTRY,
  getActiveApps,
  getAppById,
  getAppsByGtmRole,
  getAppsByLayer,
  AppLayer,
} from "../services/registry";
import { trackEvent } from "../services/analytics";

const router = Router();

/** GET /api/registry — full registry */
router.get("/", (_req: Request, res: Response) => {
  res.json({
    total: APP_REGISTRY.length,
    active: getActiveApps().length,
    apps: APP_REGISTRY,
  });
});

/** GET /api/registry/active — only active apps */
router.get("/active", (_req: Request, res: Response) => {
  res.json(getActiveApps());
});

/** GET /api/registry/:id — single app */
router.get("/:id", (req: Request, res: Response) => {
  const app = getAppById(req.params.id);
  if (!app) {
    res.status(404).json({ error: `App '${req.params.id}' not found` });
    return;
  }
  trackEvent("app_visited", "registry-route", { appId: app.id });
  res.json(app);
});

/** GET /api/registry/layer/:layer */
router.get("/layer/:layer", (req: Request, res: Response) => {
  const apps = getAppsByLayer(req.params.layer as AppLayer);
  res.json({ layer: req.params.layer, count: apps.length, apps });
});

/** GET /api/registry/role/:role */
router.get("/role/:role", (req: Request, res: Response) => {
  const apps = getAppsByGtmRole(req.params.role);
  res.json({ role: req.params.role, count: apps.length, apps });
});

export default router;
