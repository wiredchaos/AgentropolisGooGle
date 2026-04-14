"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_1 = require("../services/analytics");
const registry_1 = require("../services/registry");
const router = (0, express_1.Router)();
/**
 * GTM Workflow definitions — mirrors GTMFlow OS but also spans the full ecosystem.
 * Each workflow has a target app + execution endpoint.
 */
const WORKFLOWS = [
    {
        id: "gtm-w1",
        name: "Universal Content Blast",
        description: "Syndicate content to all distribution-layer apps simultaneously.",
        targetRoles: ["content", "distribution", "social"],
        trigger: "on_publish",
        risk: "low",
    },
    {
        id: "gtm-w2",
        name: "Web3 Lead Funnel",
        description: "Route Web2 B2B leads through education → safety → city onboarding.",
        targetRoles: ["lead-gen", "education", "b2b"],
        trigger: "on_signup",
        risk: "medium",
    },
    {
        id: "gtm-w3",
        name: "Agent Deployment Signal",
        description: "Broadcast new agent deployment across Agentropolis districts.",
        targetRoles: ["infrastructure", "safety", "incentive"],
        trigger: "on_deploy",
        risk: "high",
    },
    {
        id: "gtm-w4",
        name: "Social Amplification Loop",
        description: "Fan out social content via Social Magnet + Agent Social Systems.",
        targetRoles: ["social", "community"],
        trigger: "on_publish",
        risk: "low",
    },
    {
        id: "gtm-w5",
        name: "Ecosystem Intelligence Digest",
        description: "Aggregate signals from Nexus Publica, Chaos Rank, NEMCLAW into weekly digest.",
        targetRoles: ["intelligence", "analytics"],
        trigger: "weekly",
        risk: "low",
    },
    {
        id: "gtm-w6",
        name: "B2B Pipeline Activation",
        description: "Trigger B2B growth sequences via DDB2B + outreach automation.",
        targetRoles: ["b2b", "sales"],
        trigger: "on_signal",
        risk: "medium",
    },
    {
        id: "gtm-w7",
        name: "Chaos Rank Incentive Broadcast",
        description: "Push $CHAOS reward events to all experience + community layers.",
        targetRoles: ["incentive", "experience", "community"],
        trigger: "on_action",
        risk: "low",
    },
    {
        id: "gtm-w8",
        name: "Full Ecosystem Broadcast",
        description: "Broadcast a critical message to every active app in the registry.",
        targetRoles: ["distribution"],
        trigger: "manual",
        risk: "high",
    },
];
/** GET /api/workflows — list all workflows */
router.get("/", (_req, res) => {
    res.json({ total: WORKFLOWS.length, workflows: WORKFLOWS });
});
/** GET /api/workflows/:id */
router.get("/:id", (req, res) => {
    const wf = WORKFLOWS.find((w) => w.id === req.params.id);
    if (!wf) {
        res.status(404).json({ error: `Workflow '${req.params.id}' not found` });
        return;
    }
    // Resolve which apps would be targeted
    const targets = [];
    for (const role of wf.targetRoles) {
        for (const app of (0, registry_1.getAppsByGtmRole)(role)) {
            if (!targets.find((t) => t["id"] === app.id)) {
                targets.push({ id: app.id, name: app.name, url: app.url, layer: app.layer });
            }
        }
    }
    res.json({ ...wf, resolvedTargets: targets });
});
/** POST /api/workflows/:id/trigger — dry-run trigger (no actual fan-out) */
router.post("/:id/trigger", (req, res) => {
    const wf = WORKFLOWS.find((w) => w.id === req.params.id);
    if (!wf) {
        res.status(404).json({ error: `Workflow '${req.params.id}' not found` });
        return;
    }
    (0, analytics_1.trackEvent)("workflow_triggered", req.body.sourceAppId ?? "api", {
        workflowId: wf.id,
        payload: req.body,
    });
    const targets = [];
    for (const role of wf.targetRoles) {
        for (const app of (0, registry_1.getAppsByGtmRole)(role)) {
            if (!targets.find((t) => t["id"] === app.id)) {
                targets.push({ id: app.id, name: app.name, url: app.url });
            }
        }
    }
    res.json({
        triggered: true,
        workflowId: wf.id,
        workflowName: wf.name,
        targetsResolved: targets.length,
        targets,
        note: "Dry-run trigger. Use POST /api/distribute for live fan-out.",
    });
});
exports.default = router;
//# sourceMappingURL=workflow.js.map