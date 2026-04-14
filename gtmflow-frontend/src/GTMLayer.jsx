import { useState } from "react";

const WORKFLOWS = {
  "Content & Syndication": [
    { id: "c1", name: "Universal Content Blast", trigger: "on_publish", risk: "low", web3: true, desc: "Publish once → distribute to all channels: blog, LinkedIn, X, Farcaster, Lens, newsletters, partner feeds." },
    { id: "c2", name: "Web3 Thought Leadership Loop", trigger: "weekly", risk: "low", web3: true, desc: "Auto-draft + schedule long-form content for Mirror, Paragraph, Substack based on protocol updates." },
    { id: "c3", name: "Cross-Industry Case Study Engine", trigger: "on_close", risk: "low", web3: false, desc: "When deal closes → auto-generate vertical-specific case study and distribute to relevant industry channels." },
    { id: "c4", name: "Ecosystem Newsletter Assembly", trigger: "weekly", risk: "low", web3: true, desc: "Aggregate partner updates, on-chain metrics, product news → compile ecosystem digest → send." },
  ],
  "Lead Gen & Outreach": [
    { id: "l1", name: "Web2→Web3 Onboarding Sequence", trigger: "on_signup", risk: "medium", web3: true, desc: "Detect Web2 B2B lead → trigger 7-step educational sequence bridging their industry to Web3 primitives." },
    { id: "l2", name: "Vertical Prospecting Engine", trigger: "scheduled", risk: "medium", web3: false, desc: "Industry signal detection → ICP scoring → personalized outreach draft per vertical (finance, health, logistics…)." },
    { id: "l3", name: "DAO / Protocol BD Outreach", trigger: "on_trigger", risk: "medium", web3: true, desc: "Monitor governance forums + new protocol launches → draft partnership pitch → route to BD queue." },
    { id: "l4", name: "Event-Driven Activation", trigger: "on_event", risk: "low", web3: true, desc: "Conference/hackathon attendee list → segment → deploy warm outreach within 24h of event." },
  ],
  "Sales Pipeline": [
    { id: "s1", name: "Global Deal Room Orchestration", trigger: "on_stage_change", risk: "high", web3: false, desc: "CRM stage change → auto-generate deal brief, stakeholder map, next-action checklist, localized collateral." },
    { id: "s2", name: "Multi-Currency / Token Deal Structuring", trigger: "on_request", risk: "high", web3: true, desc: "When Web3 deal requires token component → trigger legal template, vesting schedule, treasury routing." },
    { id: "s3", name: "Proposal Factory", trigger: "on_request", risk: "medium", web3: false, desc: "Industry + company profile + use case → auto-generate branded proposal in <5 minutes." },
    { id: "s4", name: "Renewal & Expansion Signal", trigger: "on_schedule", risk: "low", web3: false, desc: "30/60/90-day usage signals → draft expansion proposal → route to CSM queue." },
  ],
  "Partner & Channel": [
    { id: "p1", name: "Global Partner Onboarding", trigger: "on_signup", risk: "medium", web3: true, desc: "New partner → localized onboarding pack, co-branded assets, MDF allocation, training sequence." },
    { id: "p2", name: "Web3 Protocol Integration Pipeline", trigger: "on_agreement", risk: "high", web3: true, desc: "Integration agreement signed → auto-generate technical docs, joint GTM plan, co-marketing calendar." },
    { id: "p3", name: "Channel Revenue Attribution", trigger: "continuous", risk: "low", web3: true, desc: "Track partner-sourced pipeline on-chain + off-chain → unified attribution dashboard + payout triggers." },
    { id: "p4", name: "Ecosystem Grants Distribution", trigger: "on_approval", risk: "high", web3: true, desc: "Grant approval → auto-generate milestone tracker, reporting templates, treasury release conditions." },
  ],
  "Social & Community": [
    { id: "sc1", name: "Cross-Chain Community Sync", trigger: "continuous", risk: "low", web3: true, desc: "Discord, Telegram, Farcaster, X threads → unified moderation queue + sentiment tracker + auto-responses." },
    { id: "sc2", name: "Ambassador Activation Flow", trigger: "on_enroll", risk: "low", web3: true, desc: "Ambassador enrolled → brief, content kit, tracking links, token reward milestones auto-deployed." },
    { id: "sc3", name: "Industry Community Infiltration", trigger: "weekly", risk: "medium", web3: false, desc: "Monitor vertical forums (Reddit, Slack groups, LinkedIn groups) → draft relevant value-add replies." },
    { id: "sc4", name: "Viral Loop Engine", trigger: "on_trigger", risk: "low", web3: true, desc: "Product milestone hit → auto-generate shareable announcement, referral mechanics, community challenge." },
  ],
  "Product-Led Growth": [
    { id: "plg1", name: "Freemium → Paid Conversion", trigger: "on_signal", risk: "medium", web3: false, desc: "Usage threshold hit → trigger personalized upgrade flow with ROI calculator for their specific industry." },
    { id: "plg2", name: "Web3 Wallet-Gated Onboarding", trigger: "on_connect", risk: "low", web3: true, desc: "Wallet connect → query on-chain history → personalize onboarding path by portfolio/protocol profile." },
    { id: "plg3", name: "Cross-Sell Industry Bundles", trigger: "on_schedule", risk: "low", web3: false, desc: "Segment by industry → auto-generate vertical-specific feature bundles + activation campaigns." },
    { id: "plg4", name: "Token-Incentivized Activation", trigger: "on_action", risk: "medium", web3: true, desc: "Key product actions → trigger token/points reward → auto-communicate via preferred channel." },
  ],
  "🎬 Higgsfield Outreach Engine": [
    { id: "h1", name: "Shopify Store Video Pitch", trigger: "on_scrape", risk: "low", web3: false, desc: "Scrape Shopify stores → enrich CMO contacts via Apollo → generate 9 free video ad formats per product via Higgsfield Marketing Studio Seedance 2.0 → send cold pitch with videos already made. Cost: $0.347/gen." },
    { id: "h2", name: "Free Ad → Retainer Conversion", trigger: "on_open", risk: "low", web3: false, desc: "Prospect opens pitch email → auto-trigger follow-up with pricing → present $200/mo retainer → route hot leads to closer. Math: 5k stores × 5% = 250 clients × $200 = $50k MRR." },
    { id: "h3", name: "Brand Ambassador Face Lock", trigger: "on_generate", risk: "low", web3: false, desc: "Upload custom face once → lock across all 9 Seedance 2.0 formats (UGC, unboxing, review, TV spot, etc.) → consistent ambassador identity per client brand." },
    { id: "h4", name: "Scale Math Revenue Tracker", trigger: "continuous", risk: "low", web3: false, desc: "Live dashboard: stores scraped → emails sent → open rate → response rate → retainer conversions → MRR vs fulfillment cost (Marketing Studio subscription)." },
    { id: "h5", name: "Multi-Vertical Product Scraper", trigger: "scheduled", risk: "medium", web3: false, desc: "Auto-scrape product URLs across Shopify, WooCommerce, BigCommerce → deduplicate → score by AOV + ad spend signals → prioritize high-value targets for video generation." },
    { id: "h6", name: "Video Format A/B Engine", trigger: "on_response", risk: "low", web3: false, desc: "Track which of 9 formats (UGC vs TV spot vs unboxing) gets highest response rate per vertical → auto-optimize lead format selection by industry cluster." },
  ],
};

const RISK_COLOR = { low: "#00ff9d", medium: "#ffb800", high: "#ff4444" };
const RISK_BG = { low: "#00ff9d18", medium: "#ffb80018", high: "#ff444418" };
const CATEGORY_ICONS = {
  "All": "⬡",
  "Content & Syndication": "📡",
  "Lead Gen & Outreach": "🎯",
  "Sales Pipeline": "💼",
  "Partner & Channel": "🤝",
  "Social & Community": "🌐",
  "Product-Led Growth": "🚀",
  "🎬 Higgsfield Outreach Engine": "🎬",
};

const ALL_WORKFLOWS = Object.values(WORKFLOWS).flat();

// ── MRR Calculator ────────────────────────────────────────────────────────────
function MRRCalculator() {
  const [stores, setStores] = useState(5000);
  const [cvr, setCvr] = useState(5);
  const [retainer, setRetainer] = useState(200);

  const clients = Math.floor(stores * (cvr / 100));
  const mrr = clients * retainer;
  const genCost = stores * 9 * 0.347;
  const profit = mrr - genCost;

  return (
    <div style={{
      background: "#0c0e16", border: "1px solid #1a3020",
      borderRadius: 10, padding: "20px", marginBottom: 20,
    }}>
      <div style={{
        fontSize: 11, color: "#00ff9d", letterSpacing: "0.15em",
        textTransform: "uppercase", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>📊</span> Scale Math Calculator
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Stores Targeted", val: stores, set: setStores, min: 100, max: 50000, step: 100 },
          { label: "Conversion Rate %", val: cvr, set: setCvr, min: 1, max: 30, step: 0.5 },
          { label: "Retainer $/mo", val: retainer, set: setRetainer, min: 50, max: 2000, step: 50 },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: 10, color: "#445", letterSpacing: "0.1em", marginBottom: 6 }}>
              {s.label.toUpperCase()}
            </div>
            <input
              type="range" min={s.min} max={s.max} step={s.step}
              value={s.val} onChange={(e) => s.set(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#4466ff" }}
            />
            <div style={{ fontSize: 13, color: "#aab", marginTop: 4, fontWeight: 600 }}>
              {s.label.includes("%") ? `${s.val}%` : s.label.includes("$") ? `$${s.val}` : s.val.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {[
          { label: "Clients Won", val: clients.toLocaleString(), color: "#88aaff" },
          { label: "MRR", val: `$${mrr.toLocaleString()}`, color: "#00ff9d" },
          { label: "Gen Cost", val: `$${genCost.toFixed(0)}`, color: "#ffb800" },
          { label: "Net Profit/mo", val: `$${profit.toLocaleString()}`, color: profit > 0 ? "#00ff9d" : "#ff4444" },
        ].map((m) => (
          <div key={m.label} style={{
            background: "#080a0f", border: "1px solid #1a2035",
            borderRadius: 8, padding: "12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 10, color: "#445", marginTop: 3, letterSpacing: "0.08em" }}>
              {m.label.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Video Pitch Preview ───────────────────────────────────────────────────────
function VideoPitchPreview() {
  const formats = [
    { icon: "📱", label: "UGC Raw", ctr: "8.2%" },
    { icon: "📦", label: "Unboxing", ctr: "6.7%" },
    { icon: "⭐", label: "Product Review", ctr: "5.9%" },
    { icon: "📺", label: "TV Spot", ctr: "4.4%" },
    { icon: "🎯", label: "Direct CTA", ctr: "7.1%" },
    { icon: "🤳", label: "Ambassador", ctr: "9.3%" },
    { icon: "🛍️", label: "Haul Format", ctr: "5.2%" },
    { icon: "🔥", label: "Trending Hook", ctr: "11.1%" },
    { icon: "💬", label: "Testimonial", ctr: "6.8%" },
  ];

  return (
    <div style={{
      background: "#0c0e16", border: "1px solid #2a1f40",
      borderRadius: 10, padding: "20px", marginBottom: 20,
    }}>
      <div style={{
        fontSize: 11, color: "#9966ff", letterSpacing: "0.15em",
        textTransform: "uppercase", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: 14 }}>🎬</span> Seedance 2.0 — 9 Formats Per Product · $0.347/gen
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {formats.map((f, i) => (
          <div key={i} style={{
            background: "#080a0f", border: "1px solid #1a1530",
            borderRadius: 8, padding: "10px 12px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{f.icon}</span>
              <span style={{ fontSize: 11, color: "#aab" }}>{f.label}</span>
            </div>
            <span style={{ fontSize: 11, color: "#00ff9d", fontWeight: 700 }}>{f.ctr}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: "10px 14px", background: "#080a0f",
        borderRadius: 8, border: "1px solid #1a2035",
        fontSize: 11, color: "#556", lineHeight: 1.7,
      }}>
        💌 <span style={{ color: "#88aaff" }}>Cold Pitch Template:</span>{" "}
        <span style={{ color: "#778" }}>
          "Hey [Name] — I built 9 video ads for [Product] using AI. No charge.
          UGC, unboxing, TV spot — all your brand. Took 4 minutes.
          Want the rest of the catalog done? Let's talk."
        </span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GTMLayer() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [enabledFlows, setEnabledFlows] = useState(new Set(["c1", "l1", "sc1", "h1", "h2", "h3"]));
  const [notification, setNotification] = useState(null);
  const [showHiggs, setShowHiggs] = useState(false);

  const categories = ["All", ...Object.keys(WORKFLOWS)];

  const visibleFlows = (() => {
    let flows = activeCategory === "All" ? ALL_WORKFLOWS : (WORKFLOWS[activeCategory] || []);
    if (filter === "web3") flows = flows.filter((f) => f.web3);
    if (filter === "web2") flows = flows.filter((f) => !f.web3);
    if (filter === "enabled") flows = flows.filter((f) => enabledFlows.has(f.id));
    if (filter === "higgsfield") flows = flows.filter((f) => f.id.startsWith("h"));
    if (searchTerm) flows = flows.filter((f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return flows;
  })();

  const triggerNotification = (msg, color = "#00ff9d") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2200);
  };

  const toggleFlow = (id, name, e) => {
    e.stopPropagation();
    setEnabledFlows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        triggerNotification(`⏸ ${name} disabled`, "#ff4444");
      } else {
        next.add(id);
        triggerNotification(`▶ ${name} activated`, "#00ff9d");
      }
      return next;
    });
  };

  const enableAll = () => {
    setEnabledFlows(new Set(ALL_WORKFLOWS.map((f) => f.id)));
    triggerNotification("⚡ All workflows activated", "#4466ff");
  };

  const disableAll = () => {
    setEnabledFlows(new Set());
    triggerNotification("⏹ All workflows disabled", "#ff4444");
  };

  const stats = {
    total: ALL_WORKFLOWS.length,
    enabled: enabledFlows.size,
    web3: ALL_WORKFLOWS.filter((f) => f.web3).length,
    high: ALL_WORKFLOWS.filter((f) => f.risk === "high").length,
    higgsfield: ALL_WORKFLOWS.filter((f) => f.id.startsWith("h")).length,
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080a0f",
      color: "#e8e8f0",
      fontFamily: "'DM Mono', 'Courier New', monospace",
      paddingBottom: 60,
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0d1120; }
        ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 3px; }
      `}</style>

      {/* Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: "#0d1120", border: `1px solid ${notification.color}40`,
          color: notification.color, padding: "10px 18px", borderRadius: 8,
          fontSize: 12, letterSpacing: "0.06em",
          boxShadow: `0 0 20px ${notification.color}20`,
          animation: "fadeIn 0.2s ease",
        }}>
          {notification.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{
        borderBottom: "1px solid #1a1f2e",
        padding: "28px 36px 20px",
        background: "linear-gradient(180deg, #0d1120 0%, #080a0f 100%)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%", background: "#00ff9d",
                boxShadow: "0 0 8px #00ff9d", animation: "pulse 2s infinite",
              }} />
              <span style={{ fontSize: 11, color: "#00ff9d", letterSpacing: "0.2em", textTransform: "uppercase" }}>
                Live Distribution Layer
              </span>
            </div>
            <h1 style={{
              fontSize: 26, fontWeight: 700, margin: 0,
              background: "linear-gradient(90deg, #ffffff 0%, #8899cc 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: "-0.02em",
            }}>
              GTM<span style={{ WebkitTextFillColor: "#4466ff" }}>FLOW</span>{" "}
              <span style={{ WebkitTextFillColor: "#9944ff", fontSize: 20 }}>+ HIGGSFIELD</span>
            </h1>
            <div style={{ fontSize: 12, color: "#556", marginTop: 3 }}>
              Universal Web2 B2B → Web3 · Higgsfield Video Pitch Engine · Seedance 2.0
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Total Workflows", val: stats.total, color: "#e8e8f0" },
              { label: "Active", val: stats.enabled, color: "#00ff9d" },
              { label: "Web3-Native", val: stats.web3, color: "#4466ff" },
              { label: "Higgsfield", val: stats.higgsfield, color: "#9944ff" },
              { label: "Policy-Gated", val: stats.high, color: "#ff4444" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#445", marginTop: 3, letterSpacing: "0.1em" }}>
                  {s.label.toUpperCase()}
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <button onClick={enableAll} style={{
                background: "#0a1a10", border: "1px solid #00ff9d30", color: "#00ff9d",
                borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "0.06em",
              }}>⚡ ALL ON</button>
              <button onClick={disableAll} style={{
                background: "#1a0a0a", border: "1px solid #ff444430", color: "#ff6666",
                borderRadius: 6, padding: "7px 12px", fontSize: 11, cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "0.06em",
              }}>⏹ ALL OFF</button>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#445", fontSize: 13 }}>🔍</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search workflows..."
              style={{
                background: "#0d1120", border: "1px solid #1a2035", borderRadius: 6,
                color: "#e8e8f0", padding: "8px 14px 8px 32px", fontSize: 13,
                outline: "none", width: 220, fontFamily: "inherit",
              }}
            />
          </div>
          {[
            { key: "all", label: "◈ All" },
            { key: "web3", label: "⬡ Web3" },
            { key: "web2", label: "◻ Web2" },
            { key: "enabled", label: "● Active" },
            { key: "higgsfield", label: "🎬 Higgsfield" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              background: filter === f.key
                ? (f.key === "higgsfield" ? "#1a0a2e" : "#1a2540")
                : "transparent",
              border: `1px solid ${filter === f.key
                ? (f.key === "higgsfield" ? "#9944ff" : "#4466ff")
                : "#1a2035"}`,
              color: filter === f.key
                ? (f.key === "higgsfield" ? "#bb77ff" : "#88aaff")
                : "#556",
              borderRadius: 6, padding: "8px 14px", fontSize: 12,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em",
              textTransform: "uppercase", transition: "all 0.15s",
            }}>
              {f.label}
            </button>
          ))}
          {searchTerm && (
            <span style={{ fontSize: 11, color: "#4466ff", marginLeft: 4 }}>
              {visibleFlows.length} result{visibleFlows.length !== 1 ? "s" : ""}
            </span>
          )}
          <button onClick={() => setShowHiggs((h) => !h)} style={{
            marginLeft: "auto",
            background: showHiggs ? "#1a0a2e" : "transparent",
            border: "1px solid #9944ff50",
            color: "#bb77ff", borderRadius: 6, padding: "8px 16px",
            fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em",
          }}>
            {showHiggs ? "▼ HIDE PITCH ENGINE" : "▶ OPEN PITCH ENGINE"}
          </button>
        </div>
      </div>

      {/* ── Higgsfield Panel ── */}
      {showHiggs && (
        <div style={{ padding: "24px 36px 0", borderBottom: "1px solid #1a1f2e" }}>
          <MRRCalculator />
          <VideoPitchPreview />
        </div>
      )}

      <div style={{ display: "flex", minHeight: "calc(100vh - 180px)" }}>

        {/* ── Sidebar ── */}
        <div style={{
          width: 220, borderRight: "1px solid #1a1f2e", padding: "24px 0",
          flexShrink: 0, position: "sticky", top: 180, height: "calc(100vh - 180px)",
          overflowY: "auto",
        }}>
          {categories.map((cat) => {
            const count = cat === "All" ? ALL_WORKFLOWS.length : WORKFLOWS[cat]?.length;
            const activeCount = cat === "All"
              ? ALL_WORKFLOWS.filter((f) => enabledFlows.has(f.id)).length
              : (WORKFLOWS[cat] || []).filter((f) => enabledFlows.has(f.id)).length;
            const isActive = activeCategory === cat;
            const isHiggs = cat.includes("Higgsfield");
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 20px",
                background: isActive ? (isHiggs ? "#120820" : "#0d1525") : "transparent",
                border: "none",
                borderLeft: `2px solid ${isActive ? (isHiggs ? "#9944ff" : "#4466ff") : "transparent"}`,
                color: isActive ? (isHiggs ? "#bb77ff" : "#88aaff") : "#667",
                cursor: "pointer", fontSize: 12, textAlign: "left",
                fontFamily: "inherit", letterSpacing: "0.04em", transition: "all 0.15s",
              }}>
                <span>{CATEGORY_ICONS[cat] ?? "⬡"} {cat}</span>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {activeCount > 0 && (
                    <span style={{
                      background: isHiggs ? "#9944ff20" : "#00ff9d20", borderRadius: 10,
                      padding: "1px 5px", fontSize: 10,
                      color: isHiggs ? "#bb77ff" : "#00ff9d",
                    }}>{activeCount}</span>
                  )}
                  <span style={{
                    background: isActive ? (isHiggs ? "#2a1040" : "#1a2540") : "#111",
                    borderRadius: 10, padding: "2px 7px", fontSize: 11,
                    color: isActive ? (isHiggs ? "#9944ff" : "#4466ff") : "#445",
                  }}>{count}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Main Grid ── */}
        <div style={{ flex: 1, padding: "28px 32px", overflowY: "auto" }}>
          {visibleFlows.length === 0 ? (
            <div style={{ color: "#445", textAlign: "center", marginTop: 80, fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
              No workflows match your filter.
              <div style={{ fontSize: 12, marginTop: 8, color: "#334" }}>
                Try adjusting your search or filter criteria.
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 11, color: "#445", marginBottom: 16, letterSpacing: "0.08em" }}>
                SHOWING {visibleFlows.length} WORKFLOW{visibleFlows.length !== 1 ? "S" : ""} · {activeCategory.toUpperCase()}
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}>
                {visibleFlows.map((flow) => {
                  const isEnabled = enabledFlows.has(flow.id);
                  const isSelected = selectedWorkflow?.id === flow.id;
                  const isHiggs = flow.id.startsWith("h");

                  return (
                    <div
                      key={flow.id}
                      onClick={() => setSelectedWorkflow(isSelected ? null : flow)}
                      style={{
                        background: isSelected
                          ? (isHiggs ? "#120820" : "#0d1525")
                          : (isHiggs ? "#0e0c16" : "#0c0e16"),
                        border: `1px solid ${
                          isSelected
                            ? (isHiggs ? "#9944ff" : "#4466ff")
                            : isEnabled
                            ? (isHiggs ? "#2a1040" : "#1a3020")
                            : "#141820"
                        }`,
                        borderRadius: 10, padding: "18px 20px", cursor: "pointer",
                        transition: "all 0.15s",
                        boxShadow: isSelected
                          ? `0 0 0 1px ${isHiggs ? "#9944ff40" : "#4466ff40"}`
                          : isEnabled
                          ? `0 0 0 1px ${isHiggs ? "#9944ff08" : "#00ff9d08"}`
                          : "none",
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {/* Enabled glow strip */}
                      {isEnabled && (
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: 2,
                          background: isHiggs
                            ? "linear-gradient(90deg, transparent, #9944ff60, transparent)"
                            : "linear-gradient(90deg, transparent, #00ff9d60, transparent)",
                        }} />
                      )}

                      {/* Top row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{
                            fontSize: 10, padding: "3px 8px", borderRadius: 4,
                            background: RISK_BG[flow.risk], color: RISK_COLOR[flow.risk],
                            border: `1px solid ${RISK_COLOR[flow.risk]}30`,
                            letterSpacing: "0.1em", textTransform: "uppercase",
                          }}>{flow.risk}</span>
                          {flow.web3 && (
                            <span style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 4,
                              background: "#4466ff18", color: "#6688ff",
                              border: "1px solid #4466ff30", letterSpacing: "0.1em",
                            }}>⬡ WEB3</span>
                          )}
                          {isHiggs && (
                            <span style={{
                              fontSize: 10, padding: "3px 8px", borderRadius: 4,
                              background: "#9944ff18", color: "#bb77ff",
                              border: "1px solid #9944ff30", letterSpacing: "0.1em",
                            }}>🎬 HIGGSFIELD</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => toggleFlow(flow.id, flow.name, e)}
                          style={{
                            background: isEnabled ? (isHiggs ? "#9944ff15" : "#00ff9d15") : "#1a1f2e",
                            border: `1px solid ${isEnabled ? (isHiggs ? "#9944ff40" : "#00ff9d40") : "#2a2f40"}`,
                            borderRadius: 20, padding: "4px 10px",
                            fontSize: 10, cursor: "pointer",
                            color: isEnabled ? (isHiggs ? "#bb77ff" : "#00ff9d") : "#445",
                            fontFamily: "inherit", letterSpacing: "0.08em",
                            transition: "all 0.15s", flexShrink: 0,
                          }}
                        >
                          {isEnabled ? "● ON" : "○ OFF"}
                        </button>
                      </div>

                      {/* Flow name */}
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: isEnabled ? "#ddeeff" : "#8899bb",
                        marginBottom: 8, lineHeight: 1.3,
                      }}>
                        {flow.name}
                      </div>

                      {/* Description */}
                      <div style={{ fontSize: 11, color: "#4a5570", lineHeight: 1.6, marginBottom: 12 }}>
                        {flow.desc}
                      </div>

                      {/* Trigger + ID */}
                      <div style={{
                        fontSize: 10, color: "#334", letterSpacing: "0.08em",
                        borderTop: "1px solid #111820", paddingTop: 10,
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                        <span style={{
                          background: "#0a0e18", border: "1px solid #1a2035",
                          padding: "2px 8px", borderRadius: 4, color: "#445",
                        }}>
                          TRIGGER: {flow.trigger.toUpperCase()}
                        </span>
                        <span style={{ color: "#334", fontSize: 10 }}>{flow.id.toUpperCase()}</span>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1a2540" }}>
                          <div style={{
                            fontSize: 10, letterSpacing: "0.1em", marginBottom: 8,
                            color: isHiggs ? "#9944ff" : "#4466ff",
                          }}>
                            WORKFLOW DETAIL
                          </div>
                          <div style={{ fontSize: 12, color: "#6688aa", lineHeight: 1.7 }}>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: "#445" }}>Status: </span>
                              <span style={{ color: isEnabled ? "#00ff9d" : "#ff4444" }}>
                                {isEnabled ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: "#445" }}>Risk: </span>
                              <span style={{ color: RISK_COLOR[flow.risk] }}>{flow.risk.toUpperCase()}</span>
                            </div>
                            <div style={{ marginBottom: 6 }}>
                              <span style={{ color: "#445" }}>Platform: </span>
                              <span style={{ color: isHiggs ? "#bb77ff" : flow.web3 ? "#6688ff" : "#8899bb" }}>
                                {isHiggs ? "Higgsfield / Seedance 2.0" : flow.web3 ? "Web3-Native" : "Web2 B2B"}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "#445" }}>Trigger: </span>
                              <span style={{ color: "#aabbcc" }}>{flow.trigger}</span>
                            </div>
                          </div>
                          {isHiggs && (
                            <div style={{
                              marginTop: 12, padding: "8px 12px", borderRadius: 6,
                              background: "#9944ff10", border: "1px solid #9944ff30",
                              fontSize: 11, color: "#cc99ff",
                            }}>
                              🎬 Powered by Higgsfield Marketing Studio · Seedance 2.0 · $0.347/generation
                            </div>
                          )}
                          {flow.risk === "high" && (
                            <div style={{
                              marginTop: 8, padding: "8px 12px", borderRadius: 6,
                              background: "#ff444410", border: "1px solid #ff444430",
                              fontSize: 11, color: "#ff8888",
                            }}>
                              ⚠ Policy review required before activation
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
