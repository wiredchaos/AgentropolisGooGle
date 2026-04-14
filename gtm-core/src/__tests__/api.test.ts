import request from "supertest";
import app from "../index";

describe("GTM Core API", () => {
  describe("GET /", () => {
    it("returns service info", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.body.name).toContain("GTM Distribution Layer");
      expect(res.body.registeredApps).toBeGreaterThan(0);
    });
  });

  describe("GET /api/registry", () => {
    it("returns full registry", async () => {
      const res = await request(app).get("/api/registry");
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
      expect(Array.isArray(res.body.apps)).toBe(true);
    });
  });

  describe("GET /api/registry/active", () => {
    it("returns only active apps", async () => {
      const res = await request(app).get("/api/registry/active");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((a: { active: boolean }) => a.active)).toBe(true);
    });
  });

  describe("GET /api/registry/:id", () => {
    it("returns known app", async () => {
      const res = await request(app).get("/api/registry/neurometax");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("neurometax");
    });

    it("returns 404 for unknown app", async () => {
      const res = await request(app).get("/api/registry/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/registry/layer/:layer", () => {
    it("returns apps for hub layer", async () => {
      const res = await request(app).get("/api/registry/layer/hub");
      expect(res.status).toBe(200);
      expect(res.body.layer).toBe("hub");
    });
  });

  describe("GET /api/registry/role/:role", () => {
    it("returns apps with distribution role", async () => {
      const res = await request(app).get("/api/registry/role/distribution");
      expect(res.status).toBe(200);
      expect(res.body.count).toBeGreaterThan(0);
    });
  });

  describe("GET /api/workflows", () => {
    it("returns workflow list", async () => {
      const res = await request(app).get("/api/workflows");
      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThan(0);
    });
  });

  describe("GET /api/workflows/:id", () => {
    it("returns resolved targets for a workflow", async () => {
      const res = await request(app).get("/api/workflows/gtm-w1");
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("gtm-w1");
      expect(Array.isArray(res.body.resolvedTargets)).toBe(true);
    });

    it("returns 404 for unknown workflow", async () => {
      const res = await request(app).get("/api/workflows/nonexistent");
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/workflows/:id/trigger", () => {
    it("dry-runs a workflow trigger", async () => {
      const res = await request(app)
        .post("/api/workflows/gtm-w1/trigger")
        .send({ sourceAppId: "test" });
      expect(res.status).toBe(200);
      expect(res.body.triggered).toBe(true);
      expect(typeof res.body.targetsResolved).toBe("number");
    });
  });

  describe("POST /api/distribute", () => {
    it("returns 400 if required fields missing", async () => {
      const res = await request(app)
        .post("/api/distribute")
        .send({ type: "content" });
      expect(res.status).toBe(400);
    });

    it("accepts valid distribution payload", async () => {
      const res = await request(app).post("/api/distribute").send({
        type: "signal",
        title: "Test Signal",
        body: "Testing GTM Core distribution",
        targetRoles: ["distribution"],
        sourceAppId: "test-suite",
      });
      expect(res.status).toBe(200);
      expect(typeof res.body.dispatched).toBe("number");
    });
  });

  describe("GET /api/analytics", () => {
    it("returns summary stats", async () => {
      const res = await request(app).get("/api/analytics");
      expect(res.status).toBe(200);
      expect(typeof res.body.total).toBe("number");
    });
  });

  describe("GET /api/analytics/events", () => {
    it("returns event list", async () => {
      const res = await request(app).get("/api/analytics/events");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
