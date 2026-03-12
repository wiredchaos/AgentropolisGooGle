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
  });
});
