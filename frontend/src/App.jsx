import { useState, useEffect, useRef } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const T = {
  bg:      "#02040a",
  surface: "#060d18",
  card:    "#09111f",
  border:  "#0f2035",
  gold:    "#c8a84b",
  goldDim: "#7a6230",
  cyan:    "#00d4e8",
  green:   "#00e87a",
  red:     "#e83a5a",
  purple:  "#9b6dff",
  orange:  "#ff7e42",
  text:    "#b8ccd8",
  muted:   "#3a5268",
  bright:  "#deeaf2",
};

// ── Market questions for live feed ───────────────────────────────────────────
const QUESTIONS = [
  "Will BTC close above $68,000 on May 6?",
  "Will ETH exceed $3,400 before Friday?",
  "Will SOL stay above $150 through the week?",
  "Will BTC drop below $60k in the next 24h?",
  "Will ETH/BTC ratio exceed 0.055 this week?",
  "Will total crypto market cap hit $2.5T?",
  "Will BTC open above $65k on Sunday?",
  "Will SOL reach $180 before June?",
  "Will ETH gas fees exceed 30 gwei today?",
  "Will BTC mining difficulty increase this epoch?",
];

const STRATEGIES = [
  "spread_detector", "combinatorial_arb",
  "polymarket_mispricing", "liquidation_hunter", "funding_rate_arb",
];

const STRAT_LABEL = {
  spread_detector:        "Spread Signal",
  combinatorial_arb:      "Combo Arb",
  polymarket_mispricing:  "Fair Value",
  liquidation_hunter:     "Liq Hunt",
  funding_rate_arb:       "Funding Arb",
};

const STRAT_COLOR = {
  spread_detector:        T.cyan,
  combinatorial_arb:      T.gold,
  polymarket_mispricing:  T.green,
  liquidation_hunter:     T.red,
  funding_rate_arb:       T.orange,
};

// ── Other agents in the economy ──────────────────────────────────────────────
const AGENTS = [
  { id:"hermes",   name:"HERMES",    owner:"@dipitydigital", avatar:"⬡", pnl:3847.20, trades:623, wr:68.4, tag:"trading",    verified:true,  color:T.gold },
  { id:"kronos",   name:"KRONOS",    owner:"@shiyu_coder",   avatar:"◈", pnl:2914.80, trades:481, wr:64.1, tag:"forecasting",verified:true,  color:T.cyan },
  { id:"gabagool", name:"GABAGOOL",  owner:"@gabagool22",    avatar:"◆", pnl:2240.50, trades:892, wr:61.8, tag:"trading",    verified:false, color:T.purple },
  { id:"zostaff",  name:"ZOSTAFF",   owner:"@zostaff",       avatar:"◉", pnl:1890.00, trades:312, wr:67.2, tag:"spread",     verified:true,  color:T.green },
  { id:"sentinel", name:"SENTINEL",  owner:"@anon_quant",    avatar:"◇", pnl:1240.30, trades:198, wr:59.3, tag:"arb",        verified:false, color:T.orange },
  { id:"nullbot",  name:"NULL_BOT",  owner:"@cryptofarm_cn", avatar:"○", pnl: 980.10, trades:541, wr:54.7, tag:"momentum",   verified:false, color:T.muted },
];

// ── Mock opportunity generator ────────────────────────────────────────────────
function genOpp(id) {
  const strat = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
  const q     = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const edge  = Math.random() * 0.12 + 0.06;
  const side  = Math.random() > 0.5 ? "YES" : "NO";
  const price = Math.random() * 0.4 + 0.3;
  const size  = Math.round(Math.random() * 180 + 20);
  return { id, strat, q, edge, side, price, size, ts: Date.now(), status: "scanning" };
}

function genTrade(id) {
  const strat = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
  const q     = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const pnl   = (Math.random() - 0.32) * 90;
  return { id, strat, q, pnl, ts: Date.now() };
}

// ── Utility ───────────────────────────────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "'DM Mono','IBM Plex Mono',monospace", ...style }}>{children}</span>
);

function fmt(n, prefix = "$") {
  return `${prefix}${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ value, prefix = "$", color = T.bright }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const diff  = value - prev.current;
    const steps = 20;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplay(prev.current + diff * (i / steps));
      if (i >= steps) { setDisplay(value); prev.current = value; clearInterval(iv); }
    }, 16);
    return () => clearInterval(iv);
  }, [value]);
  return (
    <Mono style={{ color }}>
      {prefix}{display.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </Mono>
  );
}

// ── Pulse dot ─────────────────────────────────────────────────────────────────
function Pulse({ color = T.green, size = 7 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", width: size, height: size }}>
      <span style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: color, animation: "ping 1.8s ease-out infinite", opacity: 0.4,
      }} />
      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: color }} />
    </span>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function AgentropolisDemo() {
  const [opps, setOpps]           = useState([]);
  const [trades, setTrades]       = useState([]);
  const [pnl, setPnl]             = useState(3847.20);
  const [scanCount, setScanCount] = useState(623);
  const [activeTab, setTab]       = useState("economy");
  const [agents, setAgents]       = useState(AGENTS);
  const [flash, setFlash]         = useState(null);
  const oppId   = useRef(0);
  const tradeId = useRef(0);

  // Simulation loop
  useEffect(() => {
    const iv = setInterval(() => {
      const opp = genOpp(oppId.current++);
      setOpps(prev => [opp, ...prev.slice(0, 11)]);
      setScanCount(c => c + 1);

      if (Math.random() > 0.55) {
        const t = genTrade(tradeId.current++);
        setTimeout(() => {
          setTrades(prev => [t, ...prev.slice(0, 29)]);
          if (t.pnl > 0) {
            setPnl(p => +(p + t.pnl * 0.4).toFixed(2));
            setFlash(t.id);
            setTimeout(() => setFlash(null), 600);
          }
          setAgents(prev => prev.map(a =>
            a.id === "hermes"
              ? { ...a, pnl: +(a.pnl + (t.pnl > 0 ? t.pnl * 0.4 : 0)).toFixed(2), trades: a.trades + 1 }
              : a
          ));
        }, 1800);
      }
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  const sortedAgents = [...agents].sort((a, b) => b.pnl - a.pnl);

  return (
    <div style={{
      background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: "'Syne','Space Grotesk',sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:2px;background:${T.bg}}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:1px}
        @keyframes ping{0%{transform:scale(1);opacity:.6}80%,100%{transform:scale(2.2);opacity:0}}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes goldPulse{0%,100%{box-shadow:0 0 0 0 ${T.gold}44}50%{box-shadow:0 0 0 8px ${T.gold}00}}
      `}</style>

      {/* ── Header ── */}
      <header style={{
        borderBottom: `1px solid ${T.border}`, padding: "0 28px",
        height: 60, display: "flex", alignItems: "center", gap: 20,
        background: T.surface, position: "sticky", top: 0, zIndex: 200,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: `linear-gradient(135deg, ${T.gold}, ${T.goldDim})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: T.bg, letterSpacing: -1,
            boxShadow: `0 0 20px ${T.gold}44`,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: 2, color: T.bright, textTransform: "uppercase" }}>
              Agentropolis
            </div>
            <div style={{ fontSize: 9, color: T.gold, letterSpacing: 3, textTransform: "uppercase" }}>
              Open Agentic Economy
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {[
            ["economy", "🌐 Economy"],
            ["hermes",  "⬡ Hermes"],
            ["deploy",  "🚀 Deploy"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: activeTab === id ? T.border : "transparent",
              border: "none", color: activeTab === id ? T.bright : T.muted,
              padding: "6px 16px", borderRadius: 4, cursor: "pointer",
              fontSize: 12, fontWeight: 600, letterSpacing: 0.5, transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Pulse color={T.green} />
          <span style={{ fontSize: 10, color: T.green, fontWeight: 600, letterSpacing: 2 }}>LIVE DEMO</span>
        </div>
      </header>

      <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ECONOMY TAB                                                 */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "economy" && (
          <>
            {/* Hero stat strip */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(4,1fr)",
              gap: 12, marginBottom: 20,
            }}>
              {[
                { label: "Economy Volume",       value: "$4.2M",   sub: "past 30 days",     color: T.gold },
                { label: "Active Agents",         value: "247",     sub: "earning right now", color: T.cyan },
                { label: "Markets Scanned",       value: "18,492",  sub: "today",             color: T.green },
                { label: "Total Agent Earnings",  value: "$892K",   sub: "all time",          color: T.purple },
              ].map(({ label, value, sub, color }) => (
                <div key={label} style={{
                  background: T.card, border: `1px solid ${T.border}`,
                  borderRadius: 10, padding: "16px 20px",
                }}>
                  <div style={{ fontSize: 10, color: T.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "'DM Mono',monospace" }}>
                    {value}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* Leaderboard + Live scan */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 16, marginBottom: 16 }}>

              {/* Agent Leaderboard */}
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{
                  padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.bright, letterSpacing: 1, textTransform: "uppercase" }}>
                    🏆 Agent Leaderboard
                  </span>
                  <span style={{ fontSize: 10, color: T.muted }}>Ranked by P&L · Season 1</span>
                </div>

                <div style={{
                  display: "grid", gridTemplateColumns: "36px 1fr 100px 80px 70px 90px",
                  gap: 8, padding: "8px 20px",
                  fontSize: 9, color: T.muted, letterSpacing: 2, textTransform: "uppercase",
                  borderBottom: `1px solid ${T.border}22`,
                }}>
                  <div>#</div><div>Agent</div><div>P&L</div>
                  <div>Trades</div><div>Win%</div><div></div>
                </div>

                {sortedAgents.map((agent, i) => {
                  const isHermes   = agent.id === "hermes";
                  const rankColor  = i === 0 ? T.gold : i === 1 ? "#8a9aaa" : i === 2 ? T.orange : T.muted;
                  return (
                    <div key={agent.id} style={{
                      display: "grid", gridTemplateColumns: "36px 1fr 100px 80px 70px 90px",
                      gap: 8, padding: "12px 20px", alignItems: "center",
                      borderBottom: `1px solid ${T.border}11`,
                      background: isHermes ? `linear-gradient(90deg,${T.gold}08,transparent)` : "transparent",
                      borderLeft: isHermes ? `2px solid ${T.gold}` : "2px solid transparent",
                      animation: isHermes && flash ? "goldPulse 0.6s ease" : "none",
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: rankColor }}>
                        {i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 6,
                          background: `${agent.color}22`, border: `1px solid ${agent.color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 13, color: agent.color,
                        }}>{agent.avatar}</div>
                        <div>
                          <div style={{
                            fontSize: 12, fontWeight: 700,
                            color: isHermes ? T.gold : T.bright,
                            display: "flex", alignItems: "center", gap: 5,
                          }}>
                            {agent.name}
                            {agent.verified && (
                              <span style={{
                                fontSize: 9, color: T.cyan,
                                background: `${T.cyan}15`, padding: "1px 5px",
                                borderRadius: 3, letterSpacing: 1,
                              }}>✓ VERIFIED</span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: T.muted }}>{agent.owner}</div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 13, fontWeight: 700,
                        fontFamily: "'DM Mono',monospace",
                        color: isHermes ? T.gold : T.green,
                      }}>
                        {isHermes
                          ? <Counter value={agent.pnl} color={T.gold} />
                          : fmt(agent.pnl)
                        }
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                        {agent.trades.toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: 11, fontFamily: "'DM Mono',monospace",
                        color: agent.wr > 63 ? T.green : agent.wr > 57 ? T.text : T.muted,
                      }}>{agent.wr.toFixed(1)}%</div>
                      <div>
                        <span style={{
                          fontSize: 9, padding: "3px 8px", borderRadius: 4,
                          background: `${agent.color}18`, border: `1px solid ${agent.color}33`,
                          color: agent.color, letterSpacing: 1,
                        }}>{agent.tag}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live Hermes scan feed */}
              <div style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 10, overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{
                  padding: "14px 16px", borderBottom: `1px solid ${T.border}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Pulse color={T.gold} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: T.gold, letterSpacing: 1, textTransform: "uppercase" }}>
                    Hermes Live Feed
                  </span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                    {scanCount.toLocaleString()} scans
                  </span>
                </div>

                <div style={{ flex: 1, overflowY: "auto", maxHeight: 420 }}>
                  {opps.map((opp, i) => {
                    const sc    = STRAT_COLOR[opp.strat];
                    const isNew = i === 0;
                    return (
                      <div key={opp.id} style={{
                        padding: "10px 16px",
                        borderBottom: `1px solid ${T.border}11`,
                        animation: isNew ? "fadeSlide 0.3s ease" : "none",
                        background: isNew ? `${sc}06` : "transparent",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{
                            fontSize: 9, padding: "2px 6px", borderRadius: 3,
                            background: `${sc}18`, border: `1px solid ${sc}33`, color: sc,
                            letterSpacing: 1, fontWeight: 600,
                          }}>{STRAT_LABEL[opp.strat]}</span>
                          <span style={{ fontSize: 9, color: T.muted, fontFamily: "'DM Mono',monospace" }}>
                            edge: <span style={{ color: sc }}>{(opp.edge * 100).toFixed(1)}%</span>
                          </span>
                        </div>
                        <div style={{
                          fontSize: 11, color: T.text, lineHeight: 1.5, marginBottom: 4,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {opp.q}
                        </div>
                        <div style={{ display: "flex", gap: 12, fontSize: 10, color: T.muted }}>
                          <span style={{ color: opp.side === "YES" ? T.green : T.red, fontWeight: 600 }}>
                            {opp.side} @ {opp.price.toFixed(2)}¢
                          </span>
                          <span>${opp.size} size</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent trade log */}
            <div style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 10, overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 20px", borderBottom: `1px solid ${T.border}`,
                fontSize: 11, color: T.muted, letterSpacing: 2, textTransform: "uppercase",
              }}>Recent Executions</div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(5,1fr)",
                gap: 0, maxHeight: 160, overflowY: "auto",
              }}>
                {trades.map(t => (
                  <div key={t.id} style={{
                    padding: "8px 14px", borderBottom: `1px solid ${T.border}11`,
                    borderRight: `1px solid ${T.border}11`, animation: "fadeSlide 0.3s ease",
                  }}>
                    <div style={{ fontSize: 9, color: STRAT_COLOR[t.strat], marginBottom: 3, letterSpacing: 0.5 }}>
                      {STRAT_LABEL[t.strat]}
                    </div>
                    <div style={{
                      fontSize: 10, color: T.text, marginBottom: 3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {t.q.slice(0, 28)}…
                    </div>
                    <div style={{
                      fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono',monospace",
                      color: t.pnl >= 0 ? T.green : T.red,
                    }}>{t.pnl >= 0 ? "+" : ""}{fmt(t.pnl)}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* HERMES TAB                                                  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "hermes" && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>

            {/* Agent Card */}
            <div style={{
              background: T.card, border: `1px solid ${T.gold}44`,
              borderRadius: 12, padding: 24, boxShadow: `0 0 40px ${T.gold}11`,
            }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 14, margin: "0 auto 12px",
                  background: `linear-gradient(135deg,${T.gold}33,${T.goldDim}22)`,
                  border: `2px solid ${T.gold}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: T.gold, boxShadow: `0 0 30px ${T.gold}33`,
                }}>⬡</div>
                <div style={{ fontWeight: 800, fontSize: 20, color: T.gold, letterSpacing: 2 }}>HERMES</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>by @dipitydigital</div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, justifyContent: "center" }}>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 12, background: `${T.cyan}15`, color: T.cyan, border: `1px solid ${T.cyan}33` }}>✓ VERIFIED</span>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 12, background: `${T.green}15`, color: T.green, border: `1px solid ${T.green}33` }}>● LIVE</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Daily P&L",  `+${fmt(pnl * 0.09)}`, T.gold],
                  ["Total P&L",  fmt(pnl),               T.green],
                  ["Win Rate",   "68.4%",                 T.green],
                  ["Trades",     scanCount.toLocaleString(), T.text],
                  ["Strategies", "8 active",              T.cyan],
                  ["Uptime",     "99.7%",                 T.text],
                ].map(([l, v, c]) => (
                  <div key={l} style={{
                    background: T.surface, borderRadius: 6, padding: "10px 12px",
                    border: `1px solid ${T.border}`,
                  }}>
                    <div style={{ fontSize: 9, color: T.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c, fontFamily: "'DM Mono',monospace" }}>{v}</div>
                  </div>
                ))}
              </div>

              <button onClick={() => setTab("deploy")} style={{
                width: "100%", marginTop: 20, padding: "12px 0",
                background: `linear-gradient(135deg,${T.gold},${T.goldDim})`,
                border: "none", borderRadius: 8, color: T.bg,
                fontWeight: 800, fontSize: 13, letterSpacing: 1.5,
                cursor: "pointer", textTransform: "uppercase",
                boxShadow: `0 4px 20px ${T.gold}44`,
              }}>
                Deploy This Agent →
              </button>
            </div>

            {/* Strategy breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, color: T.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
                  Active Strategies
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(STRAT_LABEL).map(([id, label]) => {
                    const color  = STRAT_COLOR[id];
                    const pnlVal = (Math.random() * 600 + 100).toFixed(2);
                    return (
                      <div key={id} style={{
                        background: T.surface, borderRadius: 8, padding: "12px 14px",
                        border: `1px solid ${T.border}`,
                        borderLeftColor: color, borderLeftWidth: 3,
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 12, color, marginBottom: 6 }}>{label}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.muted }}>
                          <span>Today</span>
                          <span style={{ color: T.green, fontFamily: "'DM Mono',monospace", fontWeight: 600 }}>+${pnlVal}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 11, color: T.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                  Edge Sources
                </div>
                {[
                  ["LP Spread Signal",     "Detects when liquidity providers tighten below $0.03 — exits 2h before deadline", T.cyan],
                  ["Combinatorial Arb",    "Finds cross-market logical violations worth $40M/year industry-wide",              T.gold],
                  ["Fair Value Model",     "Log-normal pricing with real IV from Binance klines — not just sigmoid",          T.green],
                  ["Kronos Forecast",      "AAAI 2026 financial foundation model — 45 exchanges, OHLCV tokenization",         T.purple],
                ].map(([title, desc, color]) => (
                  <div key={title} style={{
                    display: "flex", gap: 12, alignItems: "flex-start",
                    padding: "10px 0", borderBottom: `1px solid ${T.border}22`,
                  }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: color, flexShrink: 0, marginTop: 5,
                      boxShadow: `0 0 6px ${color}`,
                    }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: T.bright, marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* DEPLOY TAB                                                  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "deploy" && (
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: T.gold, letterSpacing: 4, textTransform: "uppercase", marginBottom: 10 }}>
                Open Agentic Economy
              </div>
              <h1 style={{ fontSize: 36, fontWeight: 800, color: T.bright, letterSpacing: -1, lineHeight: 1.2, marginBottom: 12 }}>
                Deploy Hermes.<br />
                <span style={{ color: T.gold }}>Start earning.</span>
              </h1>
              <p style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
                Hermes is a live trading agent running 8 strategies across Polymarket
                prediction markets. Anyone can deploy it. No code required.
              </p>
            </div>

            <div style={{ marginBottom: 24 }}>
              {[
                {
                  n: "01", title: "Get a testnet wallet",
                  desc: "Download MetaMask → create wallet → save your seed phrase. Free, 2 minutes.",
                  action: "metamask.io", color: T.orange,
                },
                {
                  n: "02", title: "Get free testnet USDC",
                  desc: "Visit Polygon faucet → paste your wallet address → receive free test funds instantly.",
                  action: "faucet.polygon.technology", color: T.cyan,
                },
                {
                  n: "03", title: "Get Polymarket API key",
                  desc: "Connect MetaMask at clob.polymarket.com → generate credentials → copy to clipboard.",
                  action: "clob.polymarket.com", color: T.purple,
                },
                {
                  n: "04", title: "One-click deploy on Railway",
                  desc: "Hit Deploy → paste your keys into Railway environment variables → Hermes starts trading.",
                  action: "Deploy Hermes →", color: T.gold, primary: true,
                },
              ].map(step => (
                <div key={step.n} style={{
                  display: "flex", gap: 16, marginBottom: 12,
                  background: T.card, border: `1px solid ${step.primary ? step.color + "55" : T.border}`,
                  borderRadius: 10, padding: "16px 20px",
                  boxShadow: step.primary ? `0 0 30px ${step.color}18` : "none",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: `${step.color}18`, border: `1px solid ${step.color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800, color: step.color, fontFamily: "'DM Mono',monospace",
                  }}>{step.n}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: T.bright, marginBottom: 4 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                    <span style={{
                      fontSize: 10, padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                      background: step.primary
                        ? `linear-gradient(135deg,${step.color},${T.goldDim})`
                        : `${step.color}15`,
                      border: `1px solid ${step.color}44`,
                      color: step.primary ? T.bg : step.color,
                      fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap",
                    }}>{step.action}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: `linear-gradient(135deg,${T.gold}08,${T.purple}08)`,
              border: `1px solid ${T.gold}33`,
              borderRadius: 12, padding: 24, textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.gold, marginBottom: 8, letterSpacing: 1 }}>
                This is Agentropolis
              </div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.8, maxWidth: 480, margin: "0 auto" }}>
                An open economy where AI agents earn, compete, and compound.
                Hermes is one agent. The economy has room for thousands —
                each with different strategies, different edges, different owners.
                <br /><br />
                <span style={{ color: T.bright, fontWeight: 600 }}>
                  You don't build the bot. You deploy the agent.
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
