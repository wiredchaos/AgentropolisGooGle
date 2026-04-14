export type AppLayer =
  | "hub"
  | "infrastructure"
  | "safety"
  | "education"
  | "social"
  | "intelligence"
  | "gtm-core"
  | "b2b"
  | "media"
  | "experience"
  | "incentive"
  | "chain";

export interface RegisteredApp {
  id: string;
  name: string;
  url: string;
  description: string;
  layer: AppLayer;
  tags: string[];
  active: boolean;
  /** GTM workflow categories this app participates in */
  gtmRoles: string[];
}

export const APP_REGISTRY: RegisteredApp[] = [
  {
    id: "neurometax",
    name: "NEURO METAX Studio",
    url: "https://neurometax.com",
    description:
      "Parent brand studio. AI-native creative engine powering the entire Agentropolis ecosystem.",
    layer: "hub",
    tags: ["studio", "brand", "parent"],
    active: true,
    gtmRoles: ["brand", "content", "distribution"],
  },
  {
    id: "agentropolis-city",
    name: "Agentropolis City",
    url: "https://agentropolis.vercel.app",
    description:
      "Sovereign cyber city on BASE. Tactical DeFi protocol with autonomous agents, Uniswap V4 hooks, and Yellow Network state channels.",
    layer: "infrastructure",
    tags: ["web3", "defi", "base", "agents"],
    active: true,
    gtmRoles: ["infrastructure", "chain", "incentive"],
  },
  {
    id: "chaosrank",
    name: "Chaos Rank",
    url: "https://chaosrank.vercel.app",
    description:
      "Sovereign ranking engine for the Agentropolis ecosystem. $CHAOS token incentive layer — agents earn by executing.",
    layer: "incentive",
    tags: ["ranking", "token", "chaos", "incentive"],
    active: true,
    gtmRoles: ["incentive", "analytics", "distribution"],
  },
  {
    id: "agentseatbelt",
    name: "Agent Seatbelt",
    url: "https://agentseatbelt.vercel.app",
    description:
      "Constitutional safety layer for agent builders. CLAW library, MOLT orchestrator, SeatBelts policy engine, NEMCLAW intelligence accumulator.",
    layer: "safety",
    tags: ["safety", "claw", "policy", "agents"],
    active: true,
    gtmRoles: ["safety", "infrastructure", "distribution"],
  },
  {
    id: "agentropolis-lovable",
    name: "Agentropolis Portal",
    url: "https://agentropolis.lovable.app",
    description:
      "City UI portal. Entry point for Agentropolis districts and agent citizenship.",
    layer: "infrastructure",
    tags: ["portal", "ui", "city"],
    active: true,
    gtmRoles: ["distribution", "community"],
  },
  {
    id: "agentropolis-omni",
    name: "Agentropolis Omni",
    url: "https://agentropolisomni.lovable.app",
    description:
      "Omnichain layer for cross-chain agent deployment and interoperability.",
    layer: "chain",
    tags: ["omnichain", "interop", "web3"],
    active: true,
    gtmRoles: ["chain", "infrastructure"],
  },
  {
    id: "school-of-base",
    name: "School of Base",
    url: "https://schoolofbase.lovable.app",
    description:
      "Education platform for BASE builders. Builder readiness curriculum, AI-powered lessons, and skill certification.",
    layer: "education",
    tags: ["education", "base", "builders", "curriculum"],
    active: true,
    gtmRoles: ["education", "community", "lead-gen"],
  },
  {
    id: "agent-social-systems",
    name: "Agent Social Systems",
    url: "https://agentsocialsystems.lovable.app",
    description:
      "Social agent coordination system. Multi-channel social distribution powered by autonomous agents.",
    layer: "social",
    tags: ["social", "agents", "distribution"],
    active: true,
    gtmRoles: ["social", "distribution", "community"],
  },
  {
    id: "social-magnet",
    name: "Social Magnet",
    url: "https://socialmagnet.lovable.app",
    description:
      "Social agent distribution engine. Magnetic content amplification across Web2 and Web3 channels.",
    layer: "social",
    tags: ["social", "content", "amplification"],
    active: true,
    gtmRoles: ["social", "content", "distribution"],
  },
  {
    id: "nexus-publica",
    name: "Nexus Publica",
    url: "https://nexuspublica.lovable.app",
    description:
      "Public intelligence layer. Systems-level intelligence aggregation for the ecosystems we all depend on.",
    layer: "intelligence",
    tags: ["intelligence", "public", "systems"],
    active: true,
    gtmRoles: ["intelligence", "analytics", "distribution"],
  },
  {
    id: "gtmflow-os",
    name: "GTMFlow OS",
    url: "https://gtmos-orchids.vercel.app",
    description:
      "MCP-powered GTM workflow execution engine. 12 active workflows spanning content syndication, lead enrichment, video rendering, and community pulse.",
    layer: "gtm-core",
    tags: ["gtm", "workflows", "mcp", "automation"],
    active: true,
    gtmRoles: ["gtm-core", "automation", "distribution", "content", "analytics"],
  },
  {
    id: "ddb2b",
    name: "Dogs B2B Growth Platform",
    url: "https://ddb2b.lovable.app",
    description:
      "B2B growth platform. AI-powered pipeline acceleration for Web2 → Web3 B2B brands.",
    layer: "b2b",
    tags: ["b2b", "growth", "pipeline", "sales"],
    active: true,
    gtmRoles: ["b2b", "lead-gen", "sales"],
  },
  {
    id: "atv-network",
    name: "ATV Network",
    url: "https://atvnetwork.vercel.app",
    description:
      "Blink-based media network. Decentralized content distribution and solana blink actions.",
    layer: "media",
    tags: ["media", "blink", "solana", "content"],
    active: true,
    gtmRoles: ["media", "content", "distribution"],
  },
  {
    id: "cortex-city",
    name: "Cortex City 3D",
    url: "https://omma.build/p/remix-cortex-city-3d-qx8nw8",
    description:
      "3D cyberpunk city experience. Immersive Web3 world for Agentropolis narrative.",
    layer: "experience",
    tags: ["3d", "game", "city", "experience"],
    active: true,
    gtmRoles: ["experience", "community", "brand"],
  },
  {
    id: "tower-defense",
    name: "Futuristic Tower Defense",
    url: "https://omma.build/p/vary-futuristic-tower-defense-isometric--eog8gn",
    description:
      "Isometric tower defense game. Gamified agent defense mechanics within the Agentropolis universe.",
    layer: "experience",
    tags: ["game", "tower-defense", "isometric", "experience"],
    active: true,
    gtmRoles: ["experience", "community", "incentive"],
  },
  {
    id: "browser-ops",
    name: "Browser Ops Execution",
    url: "https://omma.build/p/browser-ops-execution-spec-s0yhrd",
    description:
      "Browser-based operations execution spec. Agent browser automation and task execution.",
    layer: "infrastructure",
    tags: ["browser", "automation", "execution"],
    active: true,
    gtmRoles: ["infrastructure", "automation"],
  },
  {
    id: "remix-car-game",
    name: "Remix Car Game",
    url: "https://omma.build/p/remix-car-game-rtnpih",
    description:
      "Remix-powered car game. Gamified experience in the Agentropolis universe.",
    layer: "experience",
    tags: ["game", "remix", "experience"],
    active: true,
    gtmRoles: ["experience", "community"],
  },
];

export function getAppById(id: string): RegisteredApp | undefined {
  return APP_REGISTRY.find((app) => app.id === id);
}

export function getAppsByLayer(layer: AppLayer): RegisteredApp[] {
  return APP_REGISTRY.filter((app) => app.layer === layer && app.active);
}

export function getAppsByGtmRole(role: string): RegisteredApp[] {
  return APP_REGISTRY.filter(
    (app) => app.active && app.gtmRoles.includes(role)
  );
}

export function getActiveApps(): RegisteredApp[] {
  return APP_REGISTRY.filter((app) => app.active);
}
