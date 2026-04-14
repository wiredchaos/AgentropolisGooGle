import { useState, useRef, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import "./index.css";

const GTM_CORE_API = "https://gtm-core-psi.vercel.app";
const GTMFLOW_URL  = "https://gtmflow-frontend.vercel.app";
const VIRALMEDIA_URL = "https://viralmedia.vercel.app";

// ── App Registry (mirrors backend) ──────────────────────────────────────────
const APPS = [
  { id: "neurometax", name: "NEURO METAX Studio", url: "https://neurometax.com", desc: "Parent brand studio. AI-native creative engine powering the entire ecosystem.", layer: "hub", emoji: "🧠", tags: ["brand", "studio"] },
  { id: "agentropolis-city", name: "Agentropolis City", url: "https://agentropolis.vercel.app", desc: "Sovereign cyber city on BASE. Tactical DeFi, Uniswap V4 hooks, Yellow Network state channels.", layer: "infrastructure", emoji: "🏙", tags: ["web3", "defi", "base"] },
  { id: "chaosrank", name: "Chaos Rank", url: "https://chaosrank.vercel.app", desc: "$CHAOS token incentive ranking. Agents earn by executing inside the city.", layer: "incentive", emoji: "⚡", tags: ["token", "ranking"] },
  { id: "agentseatbelt", name: "Agent Seatbelt", url: "https://agentseatbelt.vercel.app", desc: "Constitutional safety layer. CLAW library, MOLT orchestrator, NEMCLAW intelligence accumulator.", layer: "safety", emoji: "🔒", tags: ["safety", "claw", "policy"] },
  { id: "agentropolis-portal", name: "Agentropolis Portal", url: "https://agentropolis.lovable.app", desc: "City portal UI. Agent citizenship, district access, and hub navigation.", layer: "infrastructure", emoji: "🚪", tags: ["portal", "city"] },
  { id: "agentropolis-omni", name: "Agentropolis Omni", url: "https://agentropolisomni.lovable.app", desc: "Omnichain layer for cross-chain agent deployment and interoperability.", layer: "chain", emoji: "⬡", tags: ["omnichain", "interop"] },
  { id: "school-of-base", name: "School of Base", url: "https://schoolofbase.lovable.app", desc: "Builder readiness education platform. AI-powered lessons and Base certification paths.", layer: "education", emoji: "🎓", tags: ["education", "base", "builders"] },
  { id: "agent-social", name: "Agent Social Systems", url: "https://agentsocialsystems.lovable.app", desc: "Social agent coordination. Multi-channel distribution powered by autonomous agents.", layer: "social", emoji: "📣", tags: ["social", "agents"] },
  { id: "social-magnet", name: "Social Magnet", url: "https://socialmagnet.lovable.app", desc: "Magnetic content amplification engine across Web2 and Web3 social channels.", layer: "social", emoji: "🧲", tags: ["social", "content"] },
  { id: "nexus-publica", name: "Nexus Publica", url: "https://nexuspublica.lovable.app", desc: "Public intelligence layer. Systems-level signal aggregation for the open web.", layer: "intelligence", emoji: "🔭", tags: ["intelligence", "public"] },
  { id: "gtmflow-os", name: "GTMFlow OS", url: "https://gtmos-orchids.vercel.app", desc: "MCP-powered GTM workflow engine. 12 active workflows: content blast, lead enrichment, video, community pulse.", layer: "gtm-core", emoji: "📡", tags: ["gtm", "workflows", "mcp"] },
  { id: "ddb2b", name: "Dogs B2B Growth", url: "https://ddb2b.lovable.app", desc: "AI-powered B2B pipeline acceleration. Web2→Web3 brand growth engine.", layer: "b2b", emoji: "💼", tags: ["b2b", "growth", "pipeline"] },
  { id: "atv-network", name: "ATV Network", url: "https://atvnetwork.vercel.app", desc: "Blink-based decentralized media network. Solana blink actions + content distribution.", layer: "media", emoji: "📺", tags: ["media", "blink", "solana"] },
  { id: "cortex-city", name: "Cortex City 3D", url: "https://omma.build/p/remix-cortex-city-3d-qx8nw8", desc: "3D cyberpunk city experience. Immersive Web3 world for the Agentropolis narrative.", layer: "experience", emoji: "🌆", tags: ["3d", "game", "city"] },
  { id: "tower-defense", name: "Tower Defense", url: "https://omma.build/p/vary-futuristic-tower-defense-isometric--eog8gn", desc: "Isometric tower defense. Gamified agent defense mechanics inside Agentropolis.", layer: "experience", emoji: "🎮", tags: ["game", "isometric"] },
  { id: "browser-ops", name: "Browser Ops", url: "https://omma.build/p/browser-ops-execution-spec-s0yhrd", desc: "Browser-based agent operations execution spec. Automation and task execution.", layer: "infrastructure", emoji: "🖥", tags: ["browser", "automation"] },
  { id: "remix-car", name: "Remix Car Game", url: "https://omma.build/p/remix-car-game-rtnpih", desc: "Remix-powered racing game. Agentropolis universe gamified experience.", layer: "experience", emoji: "🏎", tags: ["game", "remix"] },
];

const LAYER_META = {
  hub:            { label: "Hub",           color: "#00ff9d", bg: "rgba(0,255,157,0.08)" },
  infrastructure: { label: "Infrastructure", color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  "gtm-core":     { label: "GTM Core",       color: "#4466ff", bg: "rgba(68,102,255,0.10)" },
  safety:         { label: "Safety",         color: "#ffb800", bg: "rgba(255,184,0,0.08)" },
  social:         { label: "Social",         color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
  education:      { label: "Education",      color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  chain:          { label: "Chain",          color: "#6366f1", bg: "rgba(99,102,241,0.08)" },
  b2b:            { label: "B2B",            color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  media:          { label: "Media",          color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  experience:     { label: "Experience",     color: "#f97316", bg: "rgba(249,115,22,0.08)" },
  intelligence:   { label: "Intelligence",   color: "#e2e8f0", bg: "rgba(226,232,240,0.06)" },
  incentive:      { label: "Incentive",      color: "#eab308", bg: "rgba(234,179,8,0.08)" },
};

const GTM_LAYERS = [
  { id: "awareness", label: "01 AWARENESS", title: "Dominate Every Channel", desc: "Agent Social Systems, Social Magnet, and ATV Network fire simultaneously. Your content hits Web2 feeds, Web3 protocols, and Solana blinks — in one coordinated blast before your competitors even wake up.", icon: "📡", color: "#00ff9d", apps: ["agent-social", "social-magnet", "atv-network"] },
  { id: "conversion", label: "02 CONVERSION", title: "Turn Signals Into Pipeline", desc: "GTMFlow OS enriches every inbound lead with LinkedIn data, pushes to CRM, and triggers a personalized cold sequence via Make.com — all within 4 minutes of first touch. Zero manual steps.", icon: "🎯", color: "#4466ff", apps: ["gtmflow-os", "ddb2b", "nexus-publica"] },
  { id: "education", label: "03 EDUCATION", title: "Pre-Sell While They Sleep", desc: "School of Base runs a 7-step educational drip that takes raw Web2 leads and transforms them into Web3-ready buyers. By the time your team calls, the lead already trusts the ecosystem.", icon: "🎓", color: "#8b5cf6", apps: ["school-of-base", "agentropolis-portal"] },
  { id: "infrastructure", label: "04 INFRASTRUCTURE", title: "Agents That Never Stop", desc: "Agent Seatbelt's CLAW operators run 24/7 with constitutional guardrails. NEMCLAW logs every execution, compounds intelligence, and makes every next workflow smarter than the last.", icon: "🔒", color: "#ffb800", apps: ["agentseatbelt", "chaosrank"] },
  { id: "city", label: "05 CITY & CHAIN", title: "Own the Territory", desc: "Agentropolis City on BASE is the settlement layer. $CHAOS token incentivizes agents to stay active, grow the ecosystem, and lock in network effects your competitors cannot copy.", icon: "🏙", color: "#f97316", apps: ["agentropolis-city", "agentropolis-omni", "chaosrank"] },
];

const TICKER_ITEMS = [
  "17 APPS CONNECTED", "$CHAOS INCENTIVES LIVE", "NEMCLAW INTELLIGENCE ACCUMULATING",
  "BASE CHAIN SETTLEMENT", "MCP WORKFLOWS ACTIVE", "CLAW OPERATORS RUNNING",
  "WEB2→WEB3 B2B BRIDGE", "OMNICHAIN DISTRIBUTION", "AGENT SEATBELT CLEARED",
  "SCHOOL OF BASE LIVE", "SOCIAL SYSTEMS DEPLOYED", "NEXUS PUBLICA ONLINE",
];

// ── Components ───────────────────────────────────────────────────────────────

function useAPIStatus() {
  const [status, setStatus] = useState("checking");
  const [appCount, setAppCount] = useState(null);
  useEffect(() => {
    fetch(`${GTM_CORE_API}/api/registry/active`)
      .then(r => r.json())
      .then(data => {
        setAppCount(Array.isArray(data) ? data.length : null);
        setStatus("online");
      })
      .catch(() => setStatus("offline"));
  }, []);
  return { status, appCount };
}

function NavBar() {
  const { status, appCount } = useAPIStatus();
  const dotColor = status === "online" ? "#00ff9d" : status === "offline" ? "#ff4444" : "#ffb800";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}>
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: dotColor,
            animation: "pulse-dot 2s infinite", boxShadow: `0 0 6px ${dotColor}` }} />
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, letterSpacing: "0.15em" }}>
            NEURO METAX / GTM LAYER
          </span>
          {appCount && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10,
              color: "#00ff9d", letterSpacing: "0.1em", opacity: 0.7 }}>
              · {appCount} APPS LIVE
            </span>
          )}
        </div>
        <div className="hidden md:flex items-center gap-6">
          {["How It Works", "Ecosystem", "Workflows", "Deploy"].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s/g, "-")}`}
              className="text-xs text-white/50 hover:text-white transition-colors tracking-widest uppercase">
              {l}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a href={GTMFLOW_URL} target="_blank" rel="noopener noreferrer"
            className="hidden md:block text-xs px-3 py-2 rounded-sm font-medium tracking-widest uppercase transition-all border border-white/10 hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.6)" }}>
            GTMFlow OS
          </a>
          <a href="https://gtmos-orchids.vercel.app" target="_blank" rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-sm font-medium tracking-widest uppercase transition-all"
            style={{ background: "#00ff9d", color: "#000" }}>
            ENTER GTM OS
          </a>
        </div>
      </div>
    </nav>
  );
}

function Ticker() {
  const doubled = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/5 py-3"
      style={{ background: "rgba(0,255,157,0.03)" }}>
      <div className="ticker-track flex gap-12 whitespace-nowrap">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-3 shrink-0"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.15em" }}>
            <span style={{ color: "#00ff9d" }}>▸</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center text-center px-6 pt-14 grid-bg overflow-hidden">
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 60%, rgba(0,255,157,0.06) 0%, transparent 70%)" }} />

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="relative z-10 max-w-5xl mx-auto">

        {/* Badge */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-sm border"
          style={{ borderColor: "rgba(0,255,157,0.3)", background: "rgba(0,255,157,0.05)", fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: "0.15em", color: "#00ff9d" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff9d", display: "inline-block", animation: "pulse-dot 2s infinite" }} />
          NEURO METAX · B2B GTM DISTRIBUTION LAYER · 17 APPS CONNECTED
        </motion.div>

        {/* Headline */}
        <h1 className="font-bold leading-none tracking-tight mb-6"
          style={{ fontSize: "clamp(2.8rem, 8vw, 6.5rem)", letterSpacing: "-0.03em", lineHeight: 1.0 }}>
          <span className="block text-white">The GTM Engine</span>
          <span className="block" style={{ color: "#00ff9d" }}>Your Competition</span>
          <span className="block text-white">Can't Replicate.</span>
        </h1>

        {/* Subhead */}
        <p className="max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)", color: "rgba(255,255,255,0.55)" }}>
          NEURO METAX built a living, compounding distribution layer across{" "}
          <strong style={{ color: "rgba(255,255,255,0.85)" }}>17 interconnected applications</strong>{" "}
          — spanning Web2 B2B pipelines, Web3 agent infrastructure, social amplification,
          and on-chain incentive mechanics. Every workflow executed makes the next one smarter.
          Your competitors start at zero. You start at compound.
        </p>

        {/* FOMO stat row */}
        <div className="flex flex-wrap justify-center gap-8 mb-12">
          {[
            { val: "17", label: "Apps in the Stack" },
            { val: "12+", label: "Active GTM Workflows" },
            { val: "6", label: "Agentropolis Districts" },
            { val: "∞", label: "NEMCLAW Compounding" },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-bold" style={{ fontFamily: "'Space Mono', monospace", fontSize: "2.2rem", color: "#00ff9d", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap justify-center gap-4">
          <a href="https://gtmos-orchids.vercel.app" target="_blank" rel="noopener noreferrer"
            className="px-8 py-4 font-semibold rounded-sm tracking-widest uppercase text-sm transition-all hover:opacity-90"
            style={{ background: "#00ff9d", color: "#000" }}>
            LAUNCH GTM OS →
          </a>
          <a href="#ecosystem"
            className="px-8 py-4 font-semibold rounded-sm tracking-widest uppercase text-sm border transition-all hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}>
            EXPLORE THE STACK
          </a>
        </div>
      </motion.div>

      {/* FOMO urgency strip */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}>
          SCROLL TO SEE WHY YOUR GTM IS ALREADY BEHIND
        </p>
        <div className="flex justify-center mt-2">
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
            style={{ color: "rgba(255,255,255,0.2)", fontSize: 18 }}>↓</motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function GTMLayerSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" ref={ref} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-20">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#00ff9d", letterSpacing: "0.2em", marginBottom: 16 }}>
            HOW IT WORKS
          </div>
          <h2 className="font-bold tracking-tight mb-6"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            Five Layers. One Compounding Machine.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "1.1rem", maxWidth: 600, margin: "0 auto" }}>
            While your competitors run disconnected point tools, the GTM Distribution Layer
            executes across all five layers simultaneously — and each execution trains the next.
          </p>
        </motion.div>

        <div className="space-y-4">
          {GTM_LAYERS.map((layer, i) => {
            const linkedApps = APPS.filter(a => layer.apps.includes(a.id));
            return (
              <motion.div key={layer.id}
                initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="rounded-sm overflow-hidden"
                style={{ border: `1px solid ${layer.color}25`, background: `${layer.color}05` }}>
                <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start gap-6">
                  <div className="shrink-0">
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: layer.color, letterSpacing: "0.15em", marginBottom: 4 }}>
                      {layer.label}
                    </div>
                    <div style={{ fontSize: "2.5rem" }}>{layer.icon}</div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-3" style={{ fontSize: "1.4rem", letterSpacing: "-0.02em" }}>{layer.title}</h3>
                    <p style={{ color: "rgba(255,255,255,0.5)", lineHeight: 1.7, fontSize: "0.95rem" }}>{layer.desc}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {linkedApps.map(app => (
                        <a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs transition-all hover:opacity-80"
                          style={{ border: `1px solid ${layer.color}30`, background: `${layer.color}08`, color: layer.color, fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em" }}>
                          {app.emoji} {app.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function EcosystemGrid() {
  const [activeLayer, setActiveLayer] = useState("all");
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const layers = ["all", ...Object.keys(LAYER_META)];
  const filtered = activeLayer === "all" ? APPS : APPS.filter(a => a.layer === activeLayer);

  return (
    <section id="ecosystem" ref={ref} className="py-32 px-6 grid-bg">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4466ff", letterSpacing: "0.2em", marginBottom: 16 }}>
            THE ECOSYSTEM
          </div>
          <h2 className="font-bold tracking-tight mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.03em" }}>
            17 Apps. One Distribution Layer.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1rem" }}>
            Every application is registered in the GTM Core backend. Click any card to launch.
          </p>
        </motion.div>

        {/* Layer filter */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {layers.map(l => {
            const meta = l === "all" ? null : LAYER_META[l];
            const active = activeLayer === l;
            return (
              <button key={l} onClick={() => setActiveLayer(l)}
                className="px-3 py-1.5 rounded-sm text-xs font-medium transition-all cursor-pointer"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: active ? `1px solid ${meta?.color ?? "#00ff9d"}` : "1px solid rgba(255,255,255,0.1)",
                  background: active ? `${meta?.color ?? "#00ff9d"}15` : "transparent",
                  color: active ? (meta?.color ?? "#00ff9d") : "rgba(255,255,255,0.4)",
                }}>
                {l === "all" ? "◈ ALL" : meta?.label}
              </button>
            );
          })}
        </div>

        {/* App grid */}
        <AnimatePresence mode="wait">
          <motion.div key={activeLayer}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((app, i) => {
              const meta = LAYER_META[app.layer] ?? LAYER_META.infrastructure;
              return (
                <motion.a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                  whileHover={{ y: -3, borderColor: meta.color }}
                  className={`block p-5 rounded-sm transition-all group card-border layer-${app.layer}`}
                  style={{ textDecoration: "none" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>{app.emoji}</div>
                    <span className="text-xs px-2 py-1 rounded-sm"
                      style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.12em",
                        background: meta.bg, color: meta.color, border: `1px solid ${meta.color}40` }}>
                      {meta.label.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-white transition-colors"
                    style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.3 }}>
                    {app.name}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>{app.desc}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {app.tags.map(t => (
                      <span key={t} style={{ fontSize: 9, padding: "2px 6px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, color: "rgba(255,255,255,0.3)",
                        fontFamily: "'Space Mono', monospace", letterSpacing: "0.08em" }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </motion.a>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

function WorkflowsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const workflows = [
    { id: "W1", name: "Universal Content Blast", desc: "One publish → all channels. Mirror, Paragraph, LinkedIn, X, Farcaster, newsletters.", trigger: "ON_PUBLISH", risk: "LOW", color: "#00ff9d" },
    { id: "W2", name: "Web3 Lead Funnel", desc: "Web2 B2B lead detected → 7-step Web3 education sequence → warm handoff to pipeline.", trigger: "ON_SIGNUP", risk: "MEDIUM", color: "#4466ff" },
    { id: "W3", name: "Agent Deployment Signal", desc: "New agent deployed → broadcast to all Agentropolis districts → $CHAOS rewards triggered.", trigger: "ON_DEPLOY", risk: "HIGH", color: "#ffb800" },
    { id: "W4", name: "Social Amplification Loop", desc: "Social Magnet + Agent Social Systems fire simultaneously across 12 channels.", trigger: "ON_PUBLISH", risk: "LOW", color: "#ec4899" },
    { id: "W5", name: "Intelligence Digest", desc: "Nexus Publica + Chaos Rank + NEMCLAW → weekly executive GTM briefing.", trigger: "WEEKLY", risk: "LOW", color: "#8b5cf6" },
    { id: "W6", name: "B2B Pipeline Activation", desc: "Intent signal → lead enriched → personalized cold sequence queued → deal brief generated.", trigger: "ON_SIGNAL", risk: "MEDIUM", color: "#10b981" },
    { id: "W7", name: "Chaos Rank Incentive", desc: "Product milestone → $CHAOS reward event → community challenge launched.", trigger: "ON_ACTION", risk: "LOW", color: "#eab308" },
    { id: "W8", name: "Full Ecosystem Broadcast", desc: "Emergency or launch signal fanned out to all 17 registered apps simultaneously.", trigger: "MANUAL", risk: "HIGH", color: "#ef4444" },
  ];

  const riskColors = { LOW: "#00ff9d", MEDIUM: "#ffb800", HIGH: "#ef4444" };

  return (
    <section id="workflows" ref={ref} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4466ff", letterSpacing: "0.2em", marginBottom: 16 }}>
            GTM WORKFLOWS
          </div>
          <h2 className="font-bold tracking-tight mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-0.03em" }}>
            8 Workflows. Infinite Leverage.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto" }}>
            Each workflow routes through the Core backend, fans out to registered apps,
            logs to NEMCLAW, and gets smarter with every execution.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((wf, i) => (
            <motion.div key={wf.id}
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.07, duration: 0.5 }}
              className="p-5 rounded-sm"
              style={{ border: `1px solid ${wf.color}20`, background: `${wf.color}04` }}>
              <div className="flex items-start justify-between mb-3">
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: wf.color, letterSpacing: "0.12em" }}>
                  {wf.id}
                </span>
                <div className="flex gap-2">
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: "2px 7px",
                    background: `${riskColors[wf.risk]}15`, color: riskColors[wf.risk],
                    border: `1px solid ${riskColors[wf.risk]}30`, borderRadius: 2, letterSpacing: "0.1em" }}>
                    {wf.risk}
                  </span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, padding: "2px 7px",
                    background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 2, letterSpacing: "0.1em" }}>
                    {wf.trigger}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold mb-2" style={{ fontSize: "1rem", color: "rgba(255,255,255,0.9)" }}>{wf.name}</h3>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{wf.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
          className="mt-8 text-center">
          <a href="https://gtmos-orchids.vercel.app" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-sm text-sm font-semibold tracking-widest uppercase transition-all hover:opacity-90"
            style={{ background: "#4466ff", color: "#fff" }}>
            RUN WORKFLOWS IN GTMFlow OS →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function CoreBackendSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const endpoints = [
    { method: "GET", path: "/api/registry", desc: "Full app registry — all 17 apps with metadata" },
    { method: "GET", path: "/api/registry/role/:role", desc: "Apps by GTM role: distribution, social, b2b, etc." },
    { method: "GET", path: "/api/health", desc: "Live health check all 17 registered apps" },
    { method: "POST", path: "/api/distribute", desc: "Fan-out GTM event to all matching-role apps" },
    { method: "GET", path: "/api/workflows", desc: "List all 8 defined GTM workflows" },
    { method: "POST", path: "/api/workflows/:id/trigger", desc: "Trigger + dry-run a workflow, get resolved targets" },
    { method: "GET", path: "/api/analytics", desc: "Event analytics — counts by type, by app, timeline" },
    { method: "GET", path: "/api/analytics/events", desc: "Recent events ring buffer (last 500)" },
  ];

  return (
    <section id="deploy" ref={ref} className="py-32 px-6 grid-bg">
      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }} className="text-center mb-16">
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#00ff9d", letterSpacing: "0.2em", marginBottom: 16 }}>
            CORE BACKEND API
          </div>
          <h2 className="font-bold tracking-tight mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3rem)", letterSpacing: "-0.03em" }}>
            The Central Nervous System
          </h2>
          <p style={{ color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            A TypeScript/Express backend that registers all 17 apps, runs health checks,
            fans out distribution events, tracks every workflow execution, and feeds NEMCLAW.
          </p>
        </motion.div>

        <div className="space-y-2 mb-10">
          {endpoints.map((ep, i) => (
            <motion.div key={ep.path}
              initial={{ opacity: 0, x: -20 }} animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex items-start gap-4 p-4 rounded-sm"
              style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-sm"
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10, letterSpacing: "0.1em",
                  background: ep.method === "GET" ? "rgba(0,255,157,0.12)" : "rgba(68,102,255,0.12)",
                  color: ep.method === "GET" ? "#00ff9d" : "#88aaff",
                  border: `1px solid ${ep.method === "GET" ? "rgba(0,255,157,0.2)" : "rgba(68,102,255,0.2)"}`,
                }}>
                {ep.method}
              </span>
              <code style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Mono', monospace", flexShrink: 0 }}>
                {ep.path}
              </code>
              <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)" }}>{ep.desc}</span>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}
          className="p-5 rounded-sm mb-6"
          style={{ border: "1px solid rgba(0,255,157,0.2)", background: "rgba(0,255,157,0.04)",
            fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", lineHeight: 1.8, color: "rgba(255,255,255,0.5)" }}>
          <div style={{ color: "#00ff9d", marginBottom: 4 }}># Stack</div>
          <div>Express 4 · TypeScript · Strict Mode · CORS · Helmet · Rate Limiting</div>
          <div>App Registry · Health Monitor · Distribution Fan-out · Analytics Ring Buffer</div>
          <div>8 GTM Workflow Definitions · API Key Auth · Vercel-deployable</div>
        </motion.div>

        {/* Live API links */}
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.65 }}
          className="flex flex-wrap gap-3">
          {[
            { label: "Registry", path: "/api/registry" },
            { label: "Health", path: "/api/health" },
            { label: "Workflows", path: "/api/workflows" },
            { label: "Analytics", path: "/api/analytics" },
          ].map(link => (
            <a key={link.path} href={`${GTM_CORE_API}${link.path}`} target="_blank" rel="noopener noreferrer"
              className="text-xs px-4 py-2 rounded-sm transition-all hover:opacity-80"
              style={{ fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em",
                border: "1px solid rgba(0,255,157,0.2)", background: "rgba(0,255,157,0.04)", color: "#00ff9d" }}>
              {link.label} →
            </a>
          ))}
          <a href={GTM_CORE_API} target="_blank" rel="noopener noreferrer"
            className="text-xs px-4 py-2 rounded-sm transition-all hover:opacity-80"
            style={{ fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em",
              border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.4)" }}>
            Root API →
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function FOAMOSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-32 px-6 relative overflow-hidden">
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,255,157,0.04) 0%, transparent 70%)" }} />
      <div ref={ref} className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#ef4444", letterSpacing: "0.2em", marginBottom: 20 }}>
            ⚠ THE WINDOW IS CLOSING
          </div>
          <h2 className="font-bold tracking-tight mb-6"
            style={{ fontSize: "clamp(2rem, 6vw, 4rem)", letterSpacing: "-0.03em", lineHeight: 1.0 }}>
            Your Competitors Are Already<br />
            <span style={{ color: "#00ff9d" }}>Running This Stack.</span>
          </h2>
          <p className="mb-8 leading-relaxed"
            style={{ fontSize: "1.15rem", color: "rgba(255,255,255,0.5)", maxWidth: 640, margin: "0 auto 2rem" }}>
            The GTM Distribution Layer isn't a future concept — it's live, deployed, and
            compounding right now. NEMCLAW logs every execution. Chaos Rank tracks every agent.
            School of Base pre-sells your pipeline while you sleep. The brands that activate
            this stack today will own the distribution moat for years.
          </p>
          <p className="mb-12" style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
            "The intelligence gap grows with every execution. Competitors start at zero."
            — NEMCLAW Architecture Spec
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="https://gtmos-orchids.vercel.app" target="_blank" rel="noopener noreferrer"
              className="px-10 py-4 font-bold rounded-sm tracking-widest uppercase text-sm transition-all"
              style={{ background: "#00ff9d", color: "#000" }}>
              ACTIVATE GTM OS NOW
            </a>
            <a href={GTMFLOW_URL} target="_blank" rel="noopener noreferrer"
              className="px-10 py-4 font-semibold rounded-sm tracking-widest uppercase text-sm border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(68,102,255,0.4)", color: "#88aaff" }}>
              GTMFLOW OS →
            </a>
            <a href="https://agentseatbelt.vercel.app" target="_blank" rel="noopener noreferrer"
              className="px-10 py-4 font-semibold rounded-sm tracking-widest uppercase text-sm border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)" }}>
              DEPLOY AN AGENT
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t px-6 py-16" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 12 }}>
              NEURO METAX
            </div>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.88rem", lineHeight: 1.7, maxWidth: 320 }}>
              AI-native B2B GTM Distribution Layer. 17 applications. One compounding system.
              Built for brands that refuse to be outrun.
            </p>
            <div style={{ marginTop: 16, fontFamily: "'Space Mono', monospace", fontSize: 10,
              color: "#00ff9d", letterSpacing: "0.15em" }}>
              GTM CORE API: ACTIVE · 17 APPS REGISTERED
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase" }}>
              Core Apps
            </div>
            <div className="space-y-2">
              {[
                { name: "GTMFlow OS", url: "https://gtmos-orchids.vercel.app" },
                { name: "Agentropolis City", url: "https://agentropolis.vercel.app" },
                { name: "Agent Seatbelt", url: "https://agentseatbelt.vercel.app" },
                { name: "Chaos Rank", url: "https://chaosrank.vercel.app" },
                { name: "NEURO METAX", url: "https://neurometax.com" },
              ].map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="block text-sm transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.35)" }}>{l.name}</a>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.15em",
              color: "rgba(255,255,255,0.3)", marginBottom: 12, textTransform: "uppercase" }}>
              Distribution
            </div>
            <div className="space-y-2">
              {[
                { name: "Social Magnet", url: "https://socialmagnet.lovable.app" },
                { name: "Agent Social", url: "https://agentsocialsystems.lovable.app" },
                { name: "School of Base", url: "https://schoolofbase.lovable.app" },
                { name: "Nexus Publica", url: "https://nexuspublica.lovable.app" },
                { name: "ATV Network", url: "https://atvnetwork.vercel.app" },
              ].map(l => (
                <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="block text-sm transition-colors hover:text-white"
                  style={{ color: "rgba(255,255,255,0.35)" }}>{l.name}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>
            © 2026 NEURO METAX. GTM DISTRIBUTION LAYER. ALL RIGHTS RESERVED.
          </span>
          <a href="https://neurometax.com" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.1em", textDecoration: "none" }}
            className="hover:text-white transition-colors">
            NEUROMETAX.COM →
          </a>
        </div>
      </div>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", fontFamily: "'Space Grotesk', sans-serif" }}>
      <NavBar />
      <div className="pt-14">
        <HeroSection />
        <Ticker />
        <GTMLayerSection />
        <EcosystemGrid />
        <WorkflowsSection />
        <CoreBackendSection />
        <FOAMOSection />
        <Footer />
      </div>
    </div>
  );
}
