import {
  APP_REGISTRY,
  getActiveApps,
  getAppById,
  getAppsByLayer,
  getAppsByGtmRole,
} from "../services/registry";

describe("App Registry", () => {
  it("has at least 10 registered apps", () => {
    expect(APP_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });

  it("all apps have required fields", () => {
    for (const app of APP_REGISTRY) {
      expect(app.id).toBeTruthy();
      expect(app.name).toBeTruthy();
      expect(app.url).toMatch(/^https?:\/\//);
      expect(app.layer).toBeTruthy();
      expect(Array.isArray(app.gtmRoles)).toBe(true);
      expect(app.gtmRoles.length).toBeGreaterThan(0);
    }
  });

  it("getActiveApps returns only active apps", () => {
    const active = getActiveApps();
    expect(active.every((a) => a.active)).toBe(true);
  });

  it("getAppById finds known app", () => {
    const app = getAppById("neurometax");
    expect(app).toBeDefined();
    expect(app?.name).toContain("NEURO METAX");
  });

  it("getAppById returns undefined for unknown id", () => {
    expect(getAppById("does-not-exist")).toBeUndefined();
  });

  it("getAppsByLayer returns correct layer apps", () => {
    const hubs = getAppsByLayer("hub");
    expect(hubs.length).toBeGreaterThan(0);
    expect(hubs.every((a) => a.layer === "hub")).toBe(true);
  });

  it("getAppsByGtmRole returns apps with that role", () => {
    const distApps = getAppsByGtmRole("distribution");
    expect(distApps.length).toBeGreaterThan(0);
    expect(distApps.every((a) => a.gtmRoles.includes("distribution"))).toBe(true);
  });

  it("gtm-core app (gtmflow-os) is registered", () => {
    const gtm = getAppById("gtmflow-os");
    expect(gtm).toBeDefined();
    expect(gtm?.layer).toBe("gtm-core");
  });

  it("no duplicate app IDs", () => {
    const ids = APP_REGISTRY.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
