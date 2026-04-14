import { Router, Request, Response } from "express";
import {
  getRecentEvents,
  getEventsByType,
  getEventsByApp,
  getSummaryStats,
  EventType,
} from "../services/analytics";

const router = Router();

/** GET /api/analytics — summary stats */
router.get("/", (_req: Request, res: Response) => {
  res.json(getSummaryStats());
});

/** GET /api/analytics/events?limit=50 */
router.get("/events", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(getRecentEvents(limit));
});

/** GET /api/analytics/events/type/:type */
router.get("/events/type/:type", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(getEventsByType(req.params.type as EventType, limit));
});

/** GET /api/analytics/events/app/:appId */
router.get("/events/app/:appId", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json(getEventsByApp(req.params.appId, limit));
});

export default router;
