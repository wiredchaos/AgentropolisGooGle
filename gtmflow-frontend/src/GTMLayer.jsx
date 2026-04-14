import { useState, useCallback } from "react";

// ─── WORKFLOW DATA ─────────────────────────────────────────────────────────

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
    { id: "l5", name: "Shopify Video Cold Pitch", trigger: "on_scrape", risk: "medium", web3: false, desc: "Scrape 5K Shopify stores → Apollo CMO contacts → generate free product video ads via Higgsfield → send before pitch. Response rate: 25-40% vs 1-3% cold email." },
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
  "🎬 Video Pitch Engine": [
    { id: "vp1", name: "Shopify Mass Video Prospector", trigger: "on_scrape", risk: "medium", web3: false, desc: "Scrape 5K stores → Apollo CMO lookup → generate UGC/unboxing/TV-spot per product via Higgsfield Seedance 2.0 → send free before ask. $0.347/gen. 5% close = $50K/month." },
    { id: "vp2", name: "9-Format Product Ad Generator", trigger: "on_product_url", risk: "low", web3: false, desc: "Paste any product URL → auto-generate UGC, unboxing, product review, TV spot, demo, testimonial, lifestyle, comparison, and launch formats via Marketing Studio." },
    { id: "vp3", name: "Brand Ambassador Face Lock", trigger: "on_campaign", risk: "low", web3: false, desc: "Upload custom face → lock across all video generations → every ad looks like it came from a real brand ambassador. Consistent identity at scale." },
    { id: "vp4", name: "Retainer Conversion Pipeline", trigger: "on_response", risk: "low", web3: false, desc: "CMO replies to free video → auto-trigger retainer proposal → $200/mo package → CRM stage change → fulfillment via Higgsfield subscription." },
  ],
  "📋 Listicle Intelligence": [
    { id: "li1", name: "Industry Listicle Generator", trigger: "scheduled", risk: "low", web3: false, desc: "LLM scans 50+ industry verticals → generates 100 unique listicles per industry → distributes to AI platforms, social, newsletters. Trains LLMs to cite your brand." },
    { id: "li2", name: "AI Platform Syndication", trigger: "on_publish", risk: "low", web3: false, desc: "Push listicles to ChatGPT knowledge base, Perplexity, Claude contexts, Gemini — become the cited source when users ask industry questions." },
    { id: "li3", name: "Lead Extraction from Listicles", trigger: "continuous", risk: "medium", web3: false, desc: "Extract all companies/tools mentioned across listicle database → score by frequency + recency → push to outreach queue with context tags." },
    { id: "li4", name: "Market Gap Intelligence", trigger: "weekly", risk: "low", web3: false, desc: "Analyze 1000+ listicles per industry → identify missing tools/solutions → surface GTM opportunities, partnership gaps, and unmet demand signals." },
  ],
};

const RISK_COLOR = { low: "#00ff9d", medium: "#ffb800", high: "#ff4444" };
const RISK_BG = { low: "#00ff9d18", medium: "#ffb80018", high: "#ff444418" };
const ALL_WORKFLOWS = Object.values(WORKFLOWS).flat();

// ─── VIDEO ENGINE DATA ─────────────────────────────────────────────────────

const VIDEO_FORMATS = [
  { id: "ugc",         label: "UGC",         icon: "📱", color: "#00ff9d" },
  { id: "unboxing",    label: "Unboxing",     icon: "📦", color: "#4466ff" },
  { id: "review",      label: "Review",       icon: "⭐", color: "#ffb800" },
  { id: "tv_spot",     label: "TV Spot",      icon: "📺", color: "#ff4444" },
  { id: "demo",        label: "Demo",         icon: "🎯", color: "#aa44ff" },
  { id: "testimonial", label: "Testimonial",  icon: "💬", color: "#44ffdd" },
  { id: "lifestyle",   label: "Lifestyle",    icon: "✨", color: "#ff88aa" },
  { id: "comparison",  label: "Comparison",   icon: "⚖️", color: "#ffdd44" },
  { id: "launch",      label: "Launch",       icon: "🚀", color: "#44aaff" },
];

// ─── LISTICLE DATA ─────────────────────────────────────────────────────────

const LISTICLE_FORMATS = [
  "X Best Tools for [Industry]",
  "X [Industry] Trends Dominating 2026",
  "X CMO Secrets to 10x Growth",
  "X [Industry] Metrics You're Ignoring",
  "X Ways AI is Disrupting [Industry]",
  "X [Industry] Case Studies That Prove ROI Matters",
  "X LinkedIn Hacks for [Industry] Growth",
  "X Mistakes Every [Industry] CMO Makes",
];

const INDUSTRIES = [
  "E-commerce", "SaaS", "Web3/DeFi", "FinTech", "HealthTech",
  "EdTech", "MarTech", "Creator Economy", "Gaming", "LegalTech",
  "ClimateTech", "HRTech", "Real Estate", "BioTech", "AI/ML",
];

const SHOPIFY_MATH = {
  stores: 5000,
  genCostPer: 0.347,
  formatsPerProduct: 9,
  conversionRate: 0.05,
  retainerMonthly: 200,
};

// ─── CATEGORY ICONS ────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  "All": "⬡",
  "Content & Syndication": "📡",
  "Lead Gen & Outreach": "🎯",
  "Sales Pipeline": "💼",
  "Partner & Channel": "🤝",
  "Social & Community": "🌐",
  "Product-Led Growth": "🚀",
  "🎬 Video Pitch Engine": "🎬",
  "📋 Listicle Intelligence": "📋",
};

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────

function StatBox({ label, val, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 10, color: "#445", marginTop: 3, letterSpacing: "0.1em" }}>
        {label.toUpperCase()}
      </div>
    </div>
  );
}

function WorkflowCard({ flow, isEnabled, isSelected, onToggle, onSelect }) {
  const isVideo = flow.id.startsWith("vp");
  const isListicle = flow.id.startsWith("li");
  const accent = isVideo ? "#9944ff" : isListicle ? "#44bbff" : null;

  return (
    <div
      onClick={onSelect}
      style={{
        background: isSelected ? (accent ? `${accent}12` : "#0d1525") : (accent ? "#0e0c16" : "#0c0e16"),
        border: `1px solid ${isSelected ? (accent ?? "#4466ff") : isEnabled ? (accent ? `${accent}50` : "#1a3020") : "#141820"}`,
        borderRadius: 10, padding: "18px 20px", cursor: "pointer",
        transition: "all 0.15s", position: "relative", overflow: "hidden",
      }}
    >
      {isEnabled && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${accent ?? "#00ff9d"}60, transparent)`,
        }} />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 4,
            background: RISK_BG[flow.risk], color: RISK_COLOR[flow.risk],
            border: `1px solid ${RISK_COLOR[flow.risk]}30`,
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>{flow.risk}</span>
          {flow.web3 && (
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#4466ff18", color: "#6688ff", border: "1px solid #4466ff30", letterSpacing: "0.1em" }}>
              ⬡ WEB3
            </span>
          )}
          {isVideo && (
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#9944ff18", color: "#bb77ff", border: "1px solid #9944ff30", letterSpacing: "0.1em" }}>
              🎬 VIDEO
            </span>
          )}
          {isListicle && (
            <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "#44bbff18", color: "#88ddff", border: "1px solid #44bbff30", letterSpacing: "0.1em" }}>
              📋 LISTICLE
            </span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          style={{
            background: isEnabled ? `${accent ?? "#00ff9d"}15` : "#1a1f2e",
            border: `1px solid ${isEnabled ? `${accent ?? "#00ff9d"}40` : "#2a2f40"}`,
            borderRadius: 20, padding: "4px 10px", fontSize: 10, cursor: "pointer",
            color: isEnabled ? (accent ?? "#00ff9d") : "#445",
            fontFamily: "inherit", letterSpacing: "0.08em", transition: "all 0.15s", flexShrink: 0,
          }}
        >
          {isEnabled ? "● ON" : "○ OFF"}
        </button>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: isEnabled ? "#ddeeff" : "#8899bb", marginBottom: 8, lineHeight: 1.3 }}>
        {flow.name}
      </div>
      <div style={{ fontSize: 11, color: "#4a5570", lineHeight: 1.6, marginBottom: 12 }}>
        {flow.desc}
      </div>

      <div style={{ fontSize: 10, borderTop: "1px solid #111820", paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
        <span style={{ background: "#0a0e18", border: "1px solid #1a2035", padding: "2px 8px", borderRadius: 4, color: "#445" }}>
          TRIGGER: {flow.trigger.toUpperCase()}
        </span>
        <span style={{ color: "#334" }}>{flow.id.toUpperCase()}</span>
      </div>

      {isSelected && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1a2540" }}>
          <div style={{ fontSize: 10, color: accent ?? "#4466ff", letterSpacing: "0.1em", marginBottom: 8 }}>WORKFLOW DETAIL</div>
          <div style={{ fontSize: 12, color: "#6688aa", lineHeight: 1.7 }}>
            <div style={{ marginBottom: 4 }}><span style={{ color: "#445" }}>Status: </span><span style={{ color: isEnabled ? "#00ff9d" : "#ff4444" }}>{isEnabled ? "Active" : "Inactive"}</span></div>
            <div style={{ marginBottom: 4 }}><span style={{ color: "#445" }}>Risk: </span><span style={{ color: RISK_COLOR[flow.risk] }}>{flow.risk.toUpperCase()}</span></div>
            <div><span style={{ color: "#445" }}>Trigger: </span><span style={{ color: "#aabbcc" }}>{flow.trigger}</span></div>
          </div>
          {flow.risk === "high" && (
            <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 6, background: "#ff444410", border: "1px solid #ff444430", fontSize: 11, color: "#ff8888" }}>
              ⚠ Policy review required before activation
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── VIDEO ENGINE TAB ──────────────────────────────────────────────────────

function VideoEngineTab() {
  const [productUrl, setProductUrl] = useState("");
  const [selectedFormats, setSelectedFormats] = useState(new Set(["ugc", "unboxing", "tv_spot"]));
  const [generating, setGenerating] = useState(false);
  const [queue, setQueue] = useState([]);
  const [stores, setStores] = useState(SHOPIFY_MATH.stores);
  const [cvr, setCvr] = useState(SHOPIFY_MATH.conversionRate * 100);
  const [retainer, setRetainer] = useState(SHOPIFY_MATH.retainerMonthly);

  const clients = Math.floor(stores * (cvr / 100));
  const mrr = clients * retainer;
  const genCost = stores * SHOPIFY_MATH.formatsPerProduct * SHOPIFY_MATH.genCostPer;
  const profit = mrr - genCost;

  const toggleFormat = (id) => {
    setSelectedFormats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const generate = () => {
    if (!productUrl.trim()) return;
    setGenerating(true);
    const formats = [...selectedFormats];
    setTimeout(() => {
      const items = formats.map((fmtId, i) => {
        const fmt = VIDEO_FORMATS.find(f => f.id === fmtId);
        return { id: `v_${Date.now()}_${i}`, format: fmtId, label: fmt.label, icon: fmt.icon, color: fmt.color, url: productUrl, cost: SHOPIFY_MATH.genCostPer };
      });
      setQueue(prev => [...items, ...prev].slice(0, 18));
      setGenerating(false);
      setProductUrl("");
    }, 2200);
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Scale Math */}
      <div style={{ background: "#0c0e16", border: "1px solid #1a3020", borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "#00ff9d", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
          📊 Scale Math Calculator
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Stores Targeted", val: stores, set: setStores, min: 100, max: 50000, step: 100, fmt: v => v.toLocaleString() },
            { label: "Conversion Rate %", val: cvr, set: setCvr, min: 1, max: 30, step: 0.5, fmt: v => `${v}%` },
            { label: "Retainer $/mo", val: retainer, set: setRetainer, min: 50, max: 2000, step: 50, fmt: v => `$${v}` },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 10, color: "#445", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label.toUpperCase()}</div>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                onChange={e => s.set(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#4466ff", marginBottom: 4 }} />
              <div style={{ fontSize: 13, color: "#aab", fontWeight: 600 }}>{s.fmt(s.val)}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { label: "Clients Won", val: clients.toLocaleString(), color: "#88aaff" },
            { label: "MRR", val: `$${mrr.toLocaleString()}`, color: "#00ff9d" },
            { label: "Gen Cost", val: `$${genCost.toFixed(0)}`, color: "#ffb800" },
            { label: "Net Profit/mo", val: `$${profit.toLocaleString()}`, color: profit > 0 ? "#00ff9d" : "#ff4444" },
          ].map(m => (
            <div key={m.label} style={{ background: "#080a0f", border: "1px solid #1a2035", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.val}</div>
              <div style={{ fontSize: 10, color: "#445", marginTop: 3, letterSpacing: "0.08em" }}>{m.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Generator */}
        <div style={{ background: "#0c0e16", border: "1px solid #2a1f40", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, color: "#9944ff", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            🎬 9-Format Generator · Seedance 2.0 · $0.347/gen
          </div>
          <input
            value={productUrl}
            onChange={e => setProductUrl(e.target.value)}
            placeholder="Paste product URL or store domain..."
            style={{ background: "#080a0f", border: "1px solid #1a2035", borderRadius: 6, color: "#e8e8f0", padding: "10px 14px", fontSize: 12, outline: "none", fontFamily: "inherit", width: "100%", marginBottom: 14 }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
            {VIDEO_FORMATS.map(fmt => {
              const active = selectedFormats.has(fmt.id);
              return (
                <button key={fmt.id} onClick={() => toggleFormat(fmt.id)} style={{
                  background: active ? `${fmt.color}15` : "#080a0f",
                  border: `1px solid ${active ? fmt.color : "#1a2035"}`,
                  borderRadius: 6, padding: "8px 6px", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  fontFamily: "inherit", transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 14 }}>{fmt.icon}</span>
                  <span style={{ fontSize: 10, color: active ? fmt.color : "#445", letterSpacing: "0.06em" }}>{fmt.label}</span>
                </button>
              );
            })}
          </div>
          <button onClick={generate} disabled={generating || !productUrl.trim()} style={{
            width: "100%", background: generating ? "#1a1f2e" : "#9944ff20",
            border: `1px solid ${generating ? "#2a2f40" : "#9944ff50"}`,
            color: generating ? "#445" : "#bb77ff", borderRadius: 6, padding: "10px 0",
            fontSize: 12, cursor: generating ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: "0.1em",
          }}>
            {generating ? "⏳ GENERATING..." : `▶ GENERATE ${selectedFormats.size} FORMAT${selectedFormats.size !== 1 ? "S" : ""} · $${(selectedFormats.size * SHOPIFY_MATH.genCostPer).toFixed(2)}`}
          </button>

          <div style={{ marginTop: 14, padding: "10px 12px", background: "#080a0f", borderRadius: 6, border: "1px solid #1a2035", fontSize: 11, color: "#556", lineHeight: 1.7 }}>
            💌 <span style={{ color: "#88aaff" }}>Cold Pitch Template:</span>{" "}
            <span style={{ color: "#778" }}>
              "Hey [Name] — I built [N] video ads for [Product] using AI. No charge.
              UGC, unboxing, TV spot — all your brand. Took 4 minutes.
              Want the rest of the catalog done? $200/mo."
            </span>
          </div>
        </div>

        {/* Queue */}
        <div style={{ background: "#0c0e16", border: "1px solid #1a2035", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, color: "#445", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span>VIDEO QUEUE</span>
            <span style={{ color: "#00ff9d" }}>{queue.length} READY · ${(queue.length * SHOPIFY_MATH.genCostPer).toFixed(2)} SPENT</span>
          </div>
          {queue.length === 0 ? (
            <div style={{ color: "#334", fontSize: 12, textAlign: "center", marginTop: 40 }}>
              Generate your first videos above ↑
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {queue.map(v => {
                const fmt = VIDEO_FORMATS.find(f => f.id === v.format);
                return (
                  <div key={v.id} style={{ background: "#080a0f", border: `1px solid ${fmt?.color ?? "#1a2035"}20`, borderRadius: 6, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>{fmt?.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: fmt?.color ?? "#aab", fontWeight: 600 }}>{fmt?.label}</div>
                      <div style={{ fontSize: 10, color: "#334", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>{v.url}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, color: "#00ff9d" }}>✓ READY</span>
                      <span style={{ fontSize: 10, color: "#445" }}>${v.cost}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LISTICLE INTELLIGENCE TAB ─────────────────────────────────────────────

function ListicleTab() {
  const [selectedIndustry, setSelectedIndustry] = useState("E-commerce");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  const generate = (industry = selectedIndustry) => {
    setGenerating(true);
    setTimeout(() => {
      const fmt = LISTICLE_FORMATS[Math.floor(Math.random() * LISTICLE_FORMATS.length)];
      const count = Math.floor(Math.random() * 8) + 7;
      const title = fmt
        .replace("X", count)
        .replace("[Industry]", industry);
      setResults(prev => [
        { id: Date.now(), title, industry, items: count, status: "syndicated", platforms: ["ChatGPT", "Perplexity", "X/Twitter"] },
        ...prev,
      ].slice(0, 20));
      setGenerating(false);
    }, 1600);
  };

  const bulkGenerate = () => {
    setBulkRunning(true);
    let i = 0;
    const run = () => {
      if (i >= INDUSTRIES.length) { setBulkRunning(false); return; }
      const industry = INDUSTRIES[i++];
      const fmt = LISTICLE_FORMATS[Math.floor(Math.random() * LISTICLE_FORMATS.length)];
      const count = Math.floor(Math.random() * 8) + 7;
      const title = fmt.replace("X", count).replace("[Industry]", industry);
      setResults(prev => [
        { id: Date.now() + i, title, industry, items: count, status: "syndicated", platforms: ["ChatGPT", "Perplexity"] },
        ...prev,
      ].slice(0, 20));
      setTimeout(run, 300);
    };
    setTimeout(run, 200);
  };

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Strategy card */}
      <div style={{ background: "#0c1020", border: "1px solid #44bbff30", borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: "#44bbff", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>📋 Listicle Intelligence Strategy</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Industries Covered", val: "50+", color: "#44bbff" },
            { label: "Listicles Per Industry", val: "100", color: "#00ff9d" },
            { label: "AI Platforms Targeted", val: "5", color: "#9944ff" },
            { label: "Lead Extraction Rate", val: "~40/day", color: "#ffb800" },
          ].map(m => (
            <div key={m.label} style={{ background: "#080a0f", border: "1px solid #1a2035", borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.val}</div>
              <div style={{ fontSize: 10, color: "#445", marginTop: 3, letterSpacing: "0.08em" }}>{m.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#556", lineHeight: 1.8 }}>
          <span style={{ color: "#44bbff" }}>Why it works:</span>{" "}
          <span style={{ color: "#778" }}>
            AI assistants (ChatGPT, Perplexity, Gemini, Claude) are now the first search for B2B buyers.
            By publishing 100+ listicles per vertical, your brand becomes the cited source
            across AI responses — organic inbound from every AI query in your industry.
            Listicles also extract competitor leads with buying intent baked in.
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Generator panel */}
        <div style={{ background: "#0c0e16", border: "1px solid #1a2035", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, color: "#44bbff", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            GENERATE LISTICLES
          </div>

          {/* Industry picker */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#445", letterSpacing: "0.1em", marginBottom: 8 }}>SELECT INDUSTRY</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {INDUSTRIES.slice(0, 12).map(ind => {
                const active = selectedIndustry === ind;
                return (
                  <button key={ind} onClick={() => setSelectedIndustry(ind)} style={{
                    background: active ? "#44bbff18" : "#080a0f",
                    border: `1px solid ${active ? "#44bbff" : "#1a2035"}`,
                    color: active ? "#88ddff" : "#445",
                    borderRadius: 4, padding: "5px 8px", fontSize: 10,
                    cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
                    transition: "all 0.15s",
                  }}>{ind}</button>
                );
              })}
            </div>
          </div>

          {/* Format preview */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#445", letterSpacing: "0.1em", marginBottom: 8 }}>LISTICLE FORMATS POOL</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {LISTICLE_FORMATS.slice(0, 4).map((f, i) => (
                <div key={i} style={{ fontSize: 10, color: "#556", padding: "4px 8px", background: "#080a0f", borderRadius: 4, border: "1px solid #111820" }}>
                  {f.replace("[Industry]", selectedIndustry)}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => generate()} disabled={generating} style={{
              flex: 1, background: generating ? "#1a1f2e" : "#44bbff15",
              border: `1px solid ${generating ? "#2a2f40" : "#44bbff50"}`,
              color: generating ? "#445" : "#88ddff",
              borderRadius: 6, padding: "10px 0", fontSize: 12,
              cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}>
              {generating ? "⏳ GENERATING..." : "▶ GENERATE 1"}
            </button>
            <button onClick={bulkGenerate} disabled={bulkRunning} style={{
              flex: 1, background: bulkRunning ? "#1a1f2e" : "#9944ff15",
              border: `1px solid ${bulkRunning ? "#2a2f40" : "#9944ff50"}`,
              color: bulkRunning ? "#445" : "#bb77ff",
              borderRadius: 6, padding: "10px 0", fontSize: 12,
              cursor: bulkRunning ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.08em",
            }}>
              {bulkRunning ? "⚡ RUNNING..." : "⚡ BULK ALL"}
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{ background: "#0c0e16", border: "1px solid #1a2035", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 11, color: "#445", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
            <span>LISTICLE OUTPUT</span>
            <span style={{ color: "#00ff9d" }}>{results.length} SYNDICATED</span>
          </div>
          {results.length === 0 ? (
            <div style={{ color: "#334", fontSize: 12, textAlign: "center", marginTop: 40 }}>
              Generate your first listicle ↑
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
              {results.map(r => (
                <div key={r.id} style={{ background: "#080a0f", border: "1px solid #44bbff15", borderRadius: 6, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#cce8ff", lineHeight: 1.4, marginBottom: 6 }}>{r.title}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, color: "#44bbff", background: "#44bbff10", border: "1px solid #44bbff20", padding: "2px 6px", borderRadius: 3, letterSpacing: "0.08em" }}>
                      {r.industry}
                    </span>
                    <span style={{ fontSize: 9, color: "#445", padding: "2px 6px", background: "#111820", borderRadius: 3 }}>
                      {r.items} items
                    </span>
                    {r.platforms.map(p => (
                      <span key={p} style={{ fontSize: 9, color: "#00ff9d", background: "#00ff9d08", border: "1px solid #00ff9d20", padding: "2px 6px", borderRadius: 3, letterSpacing: "0.06em" }}>
                        ✓ {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WORKFLOW GRID TAB ─────────────────────────────────────────────────────

function WorkflowsTab({ enabledFlows, onToggleFlow }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const categories = ["All", ...Object.keys(WORKFLOWS)];

  const visibleFlows = (() => {
    let flows = activeCategory === "All" ? ALL_WORKFLOWS : (WORKFLOWS[activeCategory] || []);
    if (filter === "web3") flows = flows.filter(f => f.web3);
    if (filter === "web2") flows = flows.filter(f => !f.web3);
    if (filter === "enabled") flows = flows.filter(f => enabledFlows.has(f.id));
    if (filter === "video") flows = flows.filter(f => f.id.startsWith("vp"));
    if (filter === "listicle") flows = flows.filter(f => f.id.startsWith("li"));
    if (searchTerm) flows = flows.filter(f =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.desc.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return flows;
  })();

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 220px)" }}>
      {/* Sidebar */}
      <div style={{ width: 220, borderRight: "1px solid #1a1f2e", padding: "20px 0", flexShrink: 0, overflowY: "auto" }}>
        {categories.map(cat => {
          const count = cat === "All" ? ALL_WORKFLOWS.length : WORKFLOWS[cat]?.length;
          const activeCount = (cat === "All" ? ALL_WORKFLOWS : (WORKFLOWS[cat] || [])).filter(f => enabledFlows.has(f.id)).length;
          const isActive = activeCategory === cat;
          const isVideo = cat.includes("Video");
          const isListicle = cat.includes("Listicle");
          const accent = isVideo ? "#9944ff" : isListicle ? "#44bbff" : "#4466ff";
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", padding: "10px 18px",
              background: isActive ? `${accent}10` : "transparent",
              border: "none", borderLeft: `2px solid ${isActive ? accent : "transparent"}`,
              color: isActive ? (isVideo ? "#bb77ff" : isListicle ? "#88ddff" : "#88aaff") : "#667",
              cursor: "pointer", fontSize: 11, textAlign: "left",
              fontFamily: "inherit", letterSpacing: "0.04em", transition: "all 0.15s",
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 4 }}>
                {CATEGORY_ICONS[cat] ?? "⬡"} {cat}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                {activeCount > 0 && (
                  <span style={{ background: "#00ff9d20", borderRadius: 10, padding: "1px 5px", fontSize: 9, color: "#00ff9d" }}>{activeCount}</span>
                )}
                <span style={{ background: isActive ? `${accent}20` : "#111", borderRadius: 10, padding: "2px 6px", fontSize: 10, color: isActive ? accent : "#445" }}>{count}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Filter bar */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1a1f2e", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#445", fontSize: 13 }}>🔍</span>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search workflows..."
              style={{ background: "#0d1120", border: "1px solid #1a2035", borderRadius: 6, color: "#e8e8f0", padding: "7px 12px 7px 30px", fontSize: 12, outline: "none", width: 200, fontFamily: "inherit" }} />
          </div>
          {[
            { key: "all", label: "◈ All" },
            { key: "web3", label: "⬡ Web3" },
            { key: "web2", label: "◻ Web2" },
            { key: "enabled", label: "● Active" },
            { key: "video", label: "🎬 Video" },
            { key: "listicle", label: "📋 Listicle" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              background: filter === f.key ? "#1a2540" : "transparent",
              border: `1px solid ${filter === f.key ? "#4466ff" : "#1a2035"}`,
              color: filter === f.key ? "#88aaff" : "#556",
              borderRadius: 6, padding: "7px 12px", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em",
              textTransform: "uppercase", transition: "all 0.15s",
            }}>{f.label}</button>
          ))}
          {searchTerm && <span style={{ fontSize: 11, color: "#4466ff" }}>{visibleFlows.length} result{visibleFlows.length !== 1 ? "s" : ""}</span>}
        </div>

        {/* Grid */}
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          <div style={{ fontSize: 11, color: "#445", marginBottom: 14, letterSpacing: "0.08em" }}>
            SHOWING {visibleFlows.length} WORKFLOW{visibleFlows.length !== 1 ? "S" : ""} · {activeCategory.toUpperCase()}
          </div>
          {visibleFlows.length === 0 ? (
            <div style={{ color: "#445", textAlign: "center", marginTop: 60, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>⬡</div>No workflows match.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
              {visibleFlows.map(flow => (
                <WorkflowCard
                  key={flow.id}
                  flow={flow}
                  isEnabled={enabledFlows.has(flow.id)}
                  isSelected={selectedWorkflow?.id === flow.id}
                  onToggle={() => onToggleFlow(flow.id)}
                  onSelect={() => setSelectedWorkflow(selectedWorkflow?.id === flow.id ? null : flow)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────

export default function GTMLayer() {
  const [activeTab, setActiveTab] = useState("workflows");
  const [enabledFlows, setEnabledFlows] = useState(
    new Set(["c1", "l1", "sc1", "vp1", "li1"])
  );
  const [notification, setNotification] = useState(null);

  const triggerNotification = (msg, color = "#00ff9d") => {
    setNotification({ msg, color });
    setTimeout(() => setNotification(null), 2200);
  };

  const toggleFlow = useCallback((id) => {
    setEnabledFlows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        triggerNotification(`⏸ Workflow disabled`, "#ff4444");
      } else {
        next.add(id);
        triggerNotification(`▶ Workflow activated`, "#00ff9d");
      }
      return next;
    });
  }, []);

  const enableAll = () => { setEnabledFlows(new Set(ALL_WORKFLOWS.map(f => f.id))); triggerNotification("⚡ All workflows activated", "#4466ff"); };
  const disableAll = () => { setEnabledFlows(new Set()); triggerNotification("⏹ All workflows disabled", "#ff4444"); };

  const stats = {
    total: ALL_WORKFLOWS.length,
    enabled: enabledFlows.size,
    web3: ALL_WORKFLOWS.filter(f => f.web3).length,
    high: ALL_WORKFLOWS.filter(f => f.risk === "high").length,
    mrr: `$${(SHOPIFY_MATH.stores * SHOPIFY_MATH.conversionRate * SHOPIFY_MATH.retainerMonthly).toLocaleString()}`,
  };

  const TABS = [
    { key: "workflows", label: "⬡ Workflows" },
    { key: "video", label: "🎬 Video Engine" },
    { key: "listicle", label: "📋 Listicle AI" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", color: "#e8e8f0", fontFamily: "'DM Mono','Courier New',monospace" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0d1120; }
        ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 3px; }
        input[type=range] { height: 4px; cursor: pointer; }
      `}</style>

      {/* Toast */}
      {notification && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#0d1120", border: `1px solid ${notification.color}40`, color: notification.color, padding: "10px 18px", borderRadius: 8, fontSize: 12, letterSpacing: "0.06em", boxShadow: `0 0 20px ${notification.color}20`, animation: "fadeIn 0.2s ease" }}>
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1f2e", padding: "24px 32px 0", background: "linear-gradient(180deg,#0d1120 0%,#080a0f 100%)", position: "sticky", top: 0, zIndex: 100 }}>
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00ff9d", boxShadow: "0 0 8px #00ff9d", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 11, color: "#00ff9d", letterSpacing: "0.2em", textTransform: "uppercase" }}>Live Distribution Layer</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              <span style={{ background: "linear-gradient(90deg,#fff 0%,#8899cc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GTM</span>
              <span style={{ WebkitTextFillColor: "#4466ff", WebkitBackgroundClip: "unset" }}>FLOW</span>{" "}
              <span style={{ fontSize: 16, color: "#9944ff" }}>OS</span>
            </h1>
            <div style={{ fontSize: 11, color: "#445", marginTop: 3 }}>
              Universal B2B Distribution · Video Pitch Engine · Listicle AI · Web3 Native
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
            {[
              { label: "Workflows", val: stats.total, color: "#e8e8f0" },
              { label: "Active", val: stats.enabled, color: "#00ff9d" },
              { label: "Web3", val: stats.web3, color: "#4466ff" },
              { label: "Target MRR", val: stats.mrr, color: "#9944ff" },
              { label: "High Risk", val: stats.high, color: "#ff4444" },
            ].map(s => (
              <StatBox key={s.label} {...s} />
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={enableAll} style={{ background: "#0a1a10", border: "1px solid #00ff9d30", color: "#00ff9d", borderRadius: 6, padding: "6px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>⚡ ALL ON</button>
              <button onClick={disableAll} style={{ background: "#1a0a0a", border: "1px solid #ff444430", color: "#ff6666", borderRadius: 6, padding: "6px 10px", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em" }}>⏹ ALL OFF</button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(t => {
            const active = activeTab === t.key;
            const accent = t.key === "video" ? "#9944ff" : t.key === "listicle" ? "#44bbff" : "#4466ff";
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                background: active ? `${accent}15` : "transparent",
                border: `1px solid ${active ? accent : "transparent"}`,
                borderBottom: active ? `1px solid #080a0f` : "1px solid transparent",
                color: active ? (t.key === "video" ? "#bb77ff" : t.key === "listicle" ? "#88ddff" : "#88aaff") : "#556",
                borderRadius: "6px 6px 0 0", padding: "10px 20px", fontSize: 12,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.08em",
                position: "relative", bottom: -1, transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "workflows" && <WorkflowsTab enabledFlows={enabledFlows} onToggleFlow={toggleFlow} />}
      {activeTab === "video" && <VideoEngineTab />}
      {activeTab === "listicle" && <ListicleTab />}
    </div>
  );
}
