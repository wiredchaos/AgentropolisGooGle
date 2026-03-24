import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import { GeminiService } from "../services/GeminiService";
import { MemoryService } from "../services/MemoryService";
import { RLMOrchestrator } from "../services/RLMOrchestrator";
import { createAgentRouter } from "../routes/agentRoutes";

jest.mock("../services/GeminiService");

const MockedGeminiService = GeminiService as jest.MockedClass<typeof GeminiService>;

function buildApp() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  const geminiService = new MockedGeminiService();
  const memoryService = new MemoryService(geminiService);
  const rlmOrchestrator = new RLMOrchestrator(geminiService, memoryService);

  app.use("/agent", createAgentRouter(rlmOrchestrator));
  return app;
}

describe("POST /agent/run", () => {
  beforeEach(() => {
    MockedGeminiService.mockClear();
  });

  it("returns 400 when prompt is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ appId: "test-app" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/prompt is required/);
  });

  it("returns 400 when appId is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/appId is required/);
  });

  it("returns 200 with result when prompt and appId are provided", async () => {
    MockedGeminiService.prototype.generateContent = jest
      .fn()
      .mockResolvedValue("mocked response");
    MockedGeminiService.prototype.generateEmbedding = jest
      .fn()
      .mockResolvedValue([0.1, 0.2, 0.3]);

    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "What is 2+2?", appId: "test-app", context: {} });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBeDefined();
    expect(res.body.result.finalResponse).toBe("mocked response");
  });

  it("returns 500 when orchestrator throws", async () => {
    MockedGeminiService.prototype.generateContent = jest
      .fn()
      .mockRejectedValue(new Error("GOOGLE_API_KEY environment variable is required"));
    MockedGeminiService.prototype.generateEmbedding = jest
      .fn()
      .mockResolvedValue([]);

    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello", appId: "test-app" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Agent execution failed");
    expect(res.body.details).toMatch(/GOOGLE_API_KEY/);
  });
});
