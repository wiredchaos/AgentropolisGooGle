import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import { createAgentRouter } from "../routes/agentRoutes";
import { RLMOrchestrator, RLMResult } from "../services/RLMOrchestrator";

const mockResult: RLMResult = {
  answer: "The builder readiness model is a framework for assessing readiness.",
  confidence: 0.92,
  nextAction: "Review the builder readiness checklist with your team.",
  observation: "User is asking about the builder readiness model.",
  plan: "1. Explain the model\n2. Provide examples",
  action: "The builder readiness model is a framework for assessing readiness.",
  reflection: "The response was complete and accurate.",
  finalResponse: "The builder readiness model is a framework for assessing readiness.",
};

const mockOrchestrator = {
  run: jest.fn().mockResolvedValue(mockResult),
} as unknown as RLMOrchestrator;

function buildApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use("/agent", createAgentRouter(mockOrchestrator));
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
    jest.clearAllMocks();
    (mockOrchestrator.run as jest.Mock).mockResolvedValue(mockResult);
  });

  it("returns 200 with answer, confidence, and nextAction for a valid request", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Explain the builder readiness model", appId: "school-of-base" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("answer");
    expect(res.body).toHaveProperty("confidence");
    expect(res.body).toHaveProperty("nextAction");
    expect(typeof res.body.answer).toBe("string");
    expect(typeof res.body.confidence).toBe("number");
    expect(typeof res.body.nextAction).toBe("string");
  });

  it("returns the answer from the orchestrator result", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Explain the builder readiness model", appId: "school-of-base" });

    expect(res.body.answer).toBe(mockResult.answer);
    expect(res.body.confidence).toBe(mockResult.confidence);
    expect(res.body.nextAction).toBe(mockResult.nextAction);
  });

  it("calls orchestrator.run with prompt, appId, and empty context by default", async () => {
    const app = buildApp();
    await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello", appId: "my-app" });

    expect(mockOrchestrator.run).toHaveBeenCalledWith({
      prompt: "Hello",
      appId: "my-app",
      context: {},
    });
  });

  it("passes context through to orchestrator when provided", async () => {
    const app = buildApp();
    const ctx = { role: "admin" };
    await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello", appId: "my-app", context: ctx });

    expect(mockOrchestrator.run).toHaveBeenCalledWith({
      prompt: "Hello",
      appId: "my-app",
      context: ctx,
    });
  });

  it("returns 400 when prompt is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ appId: "school-of-base" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 when appId is missing", async () => {
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 500 when orchestrator throws an error", async () => {
    (mockOrchestrator.run as jest.Mock).mockRejectedValue(new Error("Gemini unavailable"));
    const app = buildApp();
    const res = await request(app)
      .post("/agent/run")
      .send({ prompt: "Hello", appId: "my-app" });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("error");
    expect(res.body.details).toBe("Gemini unavailable");
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
