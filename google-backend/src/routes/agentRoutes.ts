import { Router, Request, Response } from "express";
import { RLMOrchestrator, RLMInput } from "../services/RLMOrchestrator";

export function createAgentRouter(orchestrator: RLMOrchestrator): Router {
  const router = Router();

  router.post("/run", async (req: Request, res: Response) => {
    const { prompt, appId, context } = req.body as Partial<RLMInput>;

    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required and must be a string" });
      return;
    }
    if (!appId || typeof appId !== "string") {
      res.status(400).json({ error: "appId is required and must be a string" });
      return;
    }

    try {
      const result = await orchestrator.run({
        prompt,
        appId,
        context: context ?? {},
      });
      res.json({ success: true, result });
    } catch (err) {
      console.error("[AgentRoute] Error running RLM orchestrator:", err);
      res.status(500).json({
        error: "Agent execution failed",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
