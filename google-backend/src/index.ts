import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { GeminiService } from "./services/GeminiService";
import { MemoryService } from "./services/MemoryService";
import { RLMOrchestrator } from "./services/RLMOrchestrator";
import { CrawlBrokerService } from "./services/CrawlBrokerService";
import { NormalizerService } from "./services/NormalizerService";
import { createAgentRouter } from "./routes/agentRoutes";
import { createCrawlRouter } from "./routes/crawlRoutes";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001", 10);

app.use(cors());
app.use(bodyParser.json());

const geminiService = new GeminiService();
const memoryService = new MemoryService(geminiService);
const rlmOrchestrator = new RLMOrchestrator(geminiService, memoryService);
const crawlBroker = new CrawlBrokerService();
const normalizer = new NormalizerService();

app.use("/agent", createAgentRouter(rlmOrchestrator));
app.use("/crawl", createCrawlRouter(crawlBroker, normalizer, memoryService));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "google-agent-engine" });
});

app.listen(PORT, () => {
  console.log(`Google Agent Engine running on port ${PORT}`);
});

export default app;
