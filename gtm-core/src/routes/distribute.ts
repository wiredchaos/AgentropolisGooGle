import { Router, Request, Response } from "express";
import { distribute, DistributionPayload } from "../services/distribute";

const router = Router();

/**
 * POST /api/distribute
 * Fan-out a GTM event to all apps matching the requested roles.
 *
 * Body:
 *   type        "content" | "lead" | "workflow" | "signal" | "broadcast"
 *   title       string
 *   body        string
 *   tags?       string[]
 *   metadata?   object
 *   targetRoles? string[]   — defaults to [type]
 *   sourceAppId? string
 */
router.post("/", async (req: Request, res: Response) => {
  const { type, title, body, tags, metadata, targetRoles, sourceAppId } =
    req.body as Partial<DistributionPayload>;

  if (!type || !title || !body) {
    res.status(400).json({ error: "type, title, and body are required" });
    return;
  }

  const VALID_TYPES = ["content", "lead", "workflow", "signal", "broadcast"];
  if (!VALID_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` });
    return;
  }

  try {
    const results = await distribute({
      type,
      title,
      body,
      tags,
      metadata,
      targetRoles,
      sourceAppId,
    });

    const succeeded = results.filter((r) => r.success).length;
    res.json({
      dispatched: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    });
  } catch (err) {
    res.status(500).json({
      error: "Distribution failed",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
