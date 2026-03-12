import { Router, Request, Response } from "express";
import { CrawlBrokerService } from "../services/CrawlBrokerService";
import { NormalizerService } from "../services/NormalizerService";
import { MemoryService } from "../services/MemoryService";

export function createCrawlRouter(
  crawlBroker: CrawlBrokerService,
  normalizer: NormalizerService,
  memory: MemoryService
): Router {
  const router = Router();

  router.post("/submit", async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "url is required and must be a string" });
      return;
    }

    try {
      const job = await crawlBroker.submitCrawl(url);
      res.status(202).json({ success: true, jobId: job.jobId, status: job.status });
    } catch (err) {
      console.error("[CrawlRoute] Error submitting crawl:", err);
      res.status(500).json({
        error: "Failed to submit crawl job",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  router.get("/status/:jobId", (req: Request, res: Response) => {
    const { jobId } = req.params;
    const job = crawlBroker.getJobStatus(jobId);
    if (!job) {
      res.status(404).json({ error: `Crawl job '${jobId}' not found` });
      return;
    }
    res.json({ success: true, job });
  });

  router.post("/ingest", async (req: Request, res: Response) => {
    const { content, sourceUrl, appId } = req.body as {
      content?: string;
      sourceUrl?: string;
      appId?: string;
    };

    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "content is required and must be a string" });
      return;
    }
    if (!sourceUrl || typeof sourceUrl !== "string") {
      res.status(400).json({ error: "sourceUrl is required and must be a string" });
      return;
    }
    if (!appId || typeof appId !== "string") {
      res.status(400).json({ error: "appId is required and must be a string" });
      return;
    }

    try {
      const normalized = normalizer.normalize(content, sourceUrl);
      const entry = await memory.store(
        normalized.content,
        appId,
        normalized.provenance
      );
      res.json({
        success: true,
        memoryId: entry.id,
        wordCount: normalized.wordCount,
        provenance: normalized.provenance,
      });
    } catch (err) {
      console.error("[CrawlRoute] Error ingesting content:", err);
      res.status(500).json({
        error: "Failed to ingest content into memory",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
