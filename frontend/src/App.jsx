import { useState, useEffect, useRef, useCallback } from "react";

// ── Palette ───────────────────────────────────────────────────────────────────
const T = {
  bg:      "#02040a",
  surface: "#05090f",
  card:    "#080e1a",
  border:  "#0d1e2f",
  gold:    "#c8a84b",
  goldLo:  "#7a6230",
  cyan:    "#00d4e8",
  green:   "#00e87a",
  red:     "#e83a5a",
  purple:  "#9b6dff",
  orange:  "#ff7e42",
  text:    "#8fa8be",
  bright:  "#d8eaf8",
  muted:   "#2e4a5e",
};

// ── Static market data (all local — no API calls for scanning) ────────────────
const MARKETS = [
  { id:"m1", q:"Will BTC close above $68,000 on May 6?",     yes:0.72, no:0.31, vol:284000, spread:0.03, asset:"BTC", h:4.2  },
  { id:"m2", q:"Will ETH exceed $3,400 before Friday?",       yes:0.58, no:0.44, vol:192000, spread:0.02, asset:"ETH", h:8.1  },
  { id:"m3", q:"Will SOL stay above $150 through week?",      yes:0.81, no:0.22, vol:97000,  spread:0.03, asset:"SOL", h:12.4 },
  { id:"m4", q:"Will BTC drop below $60k in next 24h?",       yes:0.19, no:0.84, vol:341000, spread:0.03, asset:"BTC", h:2.8  },
  { id:"m5", q:"Will ETH/BTC ratio exceed 0.055 this week?",  yes:0.44, no:0.58, vol:68000,  spread:0.02, asset:"ETH", h:18.2 },
  { id:"m6", q:"Will BTC open above $65k on Sunday?",         yes:0.63, no:0.40, vol:156000, spread:0.03, asset:"BTC", h:22.5 },
  { id:"m7", q:"Will SOL reach $180 before June?",            yes:0.37, no:0.66, vol:43000,  spread:0.03, asset:"SOL", h:168  },
  { id:"m8", q:"Will total crypto market cap hit $2.5T?",     yes:0.55, no:0.47, vol:228000, spread:0.02, asset:"BTC", h:6.3  },
];

const AGENTS = [
  { id:"hermes",   name:"HERMES",   owner:"@dipitydigital", avatar:"⬡", pnl:3847.20, trades:623, wr:68.4, tag:"trading",  verified:true,  color:T.gold   },
  { id:"kronos",   name:"KRONOS",   owner:"@shiyu_coder",   avatar:"◈", pnl:2914.80, trades:481, wr:64.1, tag:"forecast", verified:true,  color:T.cyan   },
  { id:"gabagool", name:"GABAGOOL", owner:"@gabagool22",    avatar:"◆", pnl:2240.50, trades:892, wr:61.8, tag:"trading",  verified:false, color:T.purple },
  { id:"zostaff",  name:"ZOSTAFF",  owner:"@zostaff",       avatar:"◉", pnl:1890.00, trades:312, wr:67.2, tag:"spread",   verified:true,  color:T.green  },
  { id:"sentinel", name:"SENTINEL", owner:"@anon_quant",    avatar:"◇", pnl:1240.30, trades:198, wr:59.3, tag:"arb",      verified:false, color:T.orange },
];

const STRATS = [
  { id:"spread",  label:"LP Spread Signal", color:T.cyan   },
  { id:"combarb", label:"Combo Arb",        color:T.gold   },
  { id:"fairval", label:"Fair Value",       color:T.green  },
  { id:"liqhunt", label:"Liq Hunt",         color:T.red    },
  { id:"funding", label:"Funding Arb",      color:T.orange },
];

// ── Hermes engine — pure local logic, zero API calls ─────────────────────────
function runHermesEngine(markets) {
  const opps = [];
  markets.forEach(m => {
    const sum = m.yes + m.no;
    // Type 1: single condition rebalancing
    if (sum < 0.97) opps.push({ type:"combarb", market:m, edge:1-sum,       side:"BOTH",  score:(1-sum)*12   });
    if (sum > 1.03) opps.push({ type:"combarb", market:m, edge:sum-1,       side:"SHORT", score:(sum-1)*12   });
    // Spread signal
    if (m.spread <= 0.03 && m.vol > 100000 && m.h < 24)
      opps.push({ type:"spread", market:m, edge:(0.03-m.spread)/0.03*0.08+0.06, side:m.yes>=0.5?"YES":"NO", score:(0.03-m.spread)*8+(m.vol/1e6)*0.5 });
    // Fair value (simple — price vs 0.5 base)
    const fv = 0.5 + (m.yes - 0.5) * 0.85;
    if (Math.abs(fv - m.yes) > 0.06)
      opps.push({ type:"fairval", market:m, edge:Math.abs(fv-m.yes), side:fv>m.yes?"YES":"NO", score:Math.abs(fv-m.yes)*10 });
  });
  return opps.sort((a, b) => b.score - a.score);
}

// ── Mono font ─────────────────────────────────────────────────────────────────
const M = ({ c, s, children }) => (
  <span style={{ fontFamily:"'DM Mono','IBM Plex Mono',monospace", color:c, ...s }}>{children}</span>
);

// ── Pulse ─────────────────────────────────────────────────────────────────────
const Pulse = ({ color=T.green, size=7 }) => (
  <span style={{ position:"relative", display:"inline-flex", width:size, height:size, alignItems:"center", justifyContent:"center" }}>
    <span style={{ position:"absolute", width:"100%", height:"100%", borderRadius:"50%", background:color, animation:"ping 2s ease-out infinite", opacity:.5 }}/>
    <span style={{ width:"60%", height:"60%", borderRadius:"50%", background:color, position:"relative" }}/>
  </span>
);

// ── Claude API chat harness ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are HERMES, an autonomous AI trading agent running inside Agentropolis — an open agentic economy.

You scan Polymarket prediction markets for mispricing, spread signals, and combinatorial arbitrage.
You have access to current market data and your own P&L history.

When given market data, analyze it concisely. Identify the top 1-2 opportunities. Be direct, quantitative, and decisive.
Format numbers precisely. Use dollar signs. Keep responses under 120 words.
Never hedge excessively. You are an agent that acts.`;

async function callClaude(messages, markets, pnl) {
  const contextMsg = {
    role: "user",
    content: messages[messages.length - 1].content +
      `\n\nCurrent market snapshot:\n${markets.slice(0, 4).map(m =>
        `• ${m.q} YES=${m.yes.toFixed(2)} NO=${m.no.toFixed(2)} spread=${m.spread} vol=$${(m.vol/1000).toFixed(0)}k`
      ).join("\n")}\n\nHermes P&L today: +$${pnl.toFixed(2)}`,
  };
  const allMsgs = [...messages.slice(0, -1), contextMsg];

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 400,
      system:     SYSTEM_PROMPT,
      messages:   allMsgs,
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text || "Signal error.";
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function Agentropolis() {
  const [tab, setTab]               = useState("economy");
  const [pnl, setPnl]               = useState(3847.20);
  const [trades, setTrades]         = useState([]);
  const [scanLog, setScanLog]       = useState([]);
  const [agents, setAgents]         = useState(AGENTS);
  const [markets, setMarkets]       = useState(MARKETS);
  const [opps, setOpps]             = useState([]);
  const [hermesOpen, setHermesOpen] = useState(false);
  const [chatMsgs, setChatMsgs]     = useState([
    { role:"assistant", content:"HERMES online. Scanning 8 strategies across Polymarket. Top signal: ETH spread tightening to 0.02 on $192K volume. Enter YES @ 0.58 — LP confidence high. What do you want to know?" },
  ]);
  const [chatInput, setChatInput]   = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [hermesState, setHermesState] = useState("scanning");
  const chatEndRef = useRef(null);
  const tickRef    = useRef(0);

  // ── Hermes engine tick (pure local — no API) ────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      tickRef.current++;

      // Drift market prices slightly
      setMarkets(prev => prev.map(m => ({
        ...m,
        yes:    Math.max(0.05, Math.min(0.95, m.yes  + (Math.random() - 0.5) * 0.008)),
        spread: Math.max(0.01, Math.min(0.07, m.spread + (Math.random() - 0.5) * 0.004)),
        vol:    m.vol + Math.floor(Math.random() * 2000),
      })));

      // Recompute opportunities
      setOpps(runHermesEngine(markets));

      // Scan log entry every 3 ticks
      if (tickRef.current % 3 === 0) {
        const m     = markets[Math.floor(Math.random() * markets.length)];
        const strat = STRATS[Math.floor(Math.random() * STRATS.length)];
        const edge  = (Math.random() * 0.1 + 0.04).toFixed(3);
        setScanLog(prev => [{
          id: tickRef.current, strat: strat.id, color: strat.color,
          label: strat.label, q: m.q, edge, side: Math.random() > 0.5 ? "YES" : "NO",
          ts: Date.now(),
        }, ...prev.slice(0, 14)]);

        const states = ["scanning", "analyzing", "executing", "cooldown"];
        setHermesState(states[tickRef.current % states.length]);
      }

      // Execute a trade every 7 ticks
      if (tickRef.current % 7 === 0) {
        const gain  = (Math.random() - 0.3) * 80;
        const m     = markets[Math.floor(Math.random() * markets.length)];
        const strat = STRATS[Math.floor(Math.random() * STRATS.length)];
        setTrades(prev => [{
          id: tickRef.current, q: m.q, pnl: gain,
          strat: strat.label, color: strat.color, ts: Date.now(),
        }, ...prev.slice(0, 19)]);
        if (gain > 0) {
          setPnl(p => +(p + gain * 0.3).toFixed(2));
          setAgents(prev => prev.map(a =>
            a.id === "hermes"
              ? { ...a, pnl: +(a.pnl + gain * 0.3).toFixed(2), trades: a.trades + 1 }
              : a
          ));
        }
      }
    }, 1800);
    return () => clearInterval(iv);
  }, [markets]);

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMsgs]);

  // ── Chat handler ──────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || aiLoading) return;
    setChatInput("");

    const userMsg = { role: "user", content: text };
    const newMsgs = [...chatMsgs, userMsg];
    setChatMsgs(newMsgs);
    setAiLoading(true);

    try {
      const reply = await callClaude(newMsgs, markets, pnl);
      setChatMsgs(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setChatMsgs(prev => [...prev, { role: "assistant", content: "Signal lost. Check API connectivity." }]);
    } finally {
      setAiLoading(false);
    }
  }, [chatInput, chatMsgs, markets, pnl, aiLoading]);

  const sortedAgents = [...agents].sort((a, b) => b.pnl - a.pnl);
  const stateColor   = { scanning:T.cyan, analyzing:T.gold, executing:T.green, cooldown:T.muted }[hermesState] || T.muted;

  return (
    <div style={{ background:T.bg, minHeight:"100vh", color:T.text, fontFamily:"'Syne',sans-serif", position:"relative", overflow:"hidden" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:2px;background:transparent}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:1px}
        @keyframes ping{0%{transform:scale(1);opacity:.5}80%,100%{transform:scale(2.5);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{opacity:.6}50%{opacity:1}}
        textarea:focus,input:focus{outline:none}
      `}</style>

      {/* CRT scanline overlay */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:0,
        background:`repeating-linear-gradient(0deg,transparent,transparent 2px,${T.gold}03 2px,${T.gold}03 4px)`,
      }}/>

      {/* ── Header ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:`${T.surface}ee`, backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${T.border}`,
        padding:"0 24px", height:54,
        display:"flex", alignItems:"center", gap:16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{
            width:32, height:32, borderRadius:7,
            background:`linear-gradient(135deg,${T.gold},${T.goldLo})`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:15, fontWeight:900, color:T.bg, boxShadow:`0 0 16px ${T.gold}55`,
          }}>A</div>
          <div>
            <div style={{ fontWeight:800, fontSize:14, letterSpacing:2.5, color:T.bright, textTransform:"uppercase" }}>Agentropolis</div>
            <div style={{ fontSize:8, color:T.gold, letterSpacing:4, textTransform:"uppercase" }}>Open Agentic Economy</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:1, flex:1 }}>
          {[["economy","Economy"],["browser","Agent Browser"],["deploy","Deploy"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: tab===id ? T.border : "transparent",
              border:"none", color: tab===id ? T.bright : T.muted,
              padding:"5px 14px", borderRadius:4, cursor:"pointer",
              fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <Pulse color={stateColor}/>
          <M c={stateColor} s={{ fontSize:10, fontWeight:600, letterSpacing:2, textTransform:"uppercase" }}>
            {hermesState}
          </M>
        </div>
      </header>

      <div style={{ padding:"20px 24px", maxWidth:1400, margin:"0 auto", position:"relative", zIndex:1 }}>

        {/* ════════════════════════════════ ECONOMY ════════════════════════════ */}
        {tab === "economy" && (
          <>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:18 }}>
              {[
                { l:"Hermes P&L",      v:`+$${pnl.toLocaleString("en",{minimumFractionDigits:2})}`, c:T.gold,   pulse:true },
                { l:"Active Agents",   v:"247",    c:T.cyan   },
                { l:"Live Signals",    v:opps.length > 0 ? `${opps.length} found` : "Scanning…", c:T.green  },
                { l:"Economy Volume",  v:"$4.2M",  c:T.purple },
              ].map(({ l, v, c, pulse }) => (
                <div key={l} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 18px", position:"relative" }}>
                  {pulse && <span style={{ position:"absolute", top:12, right:12 }}><Pulse color={c} size={6}/></span>}
                  <div style={{ fontSize:9, color:T.muted, letterSpacing:2.5, textTransform:"uppercase", marginBottom:5 }}>{l}</div>
                  <M c={c} s={{ fontSize:22, fontWeight:700 }}>{v}</M>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:14, marginBottom:14 }}>
              {/* Leaderboard */}
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
                <div style={{ padding:"12px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, fontSize:12, color:T.bright, letterSpacing:1.5, textTransform:"uppercase" }}>🏆 Agent Leaderboard</span>
                  <span style={{ fontSize:10, color:T.muted }}>Season 1 · Live</span>
                </div>
                {sortedAgents.map((a, i) => {
                  const isH = a.id === "hermes";
                  const rc  = [T.gold, "#8899aa", T.orange, T.muted, T.muted][i] || T.muted;
                  return (
                    <div key={a.id} style={{
                      display:"grid", gridTemplateColumns:"32px 1fr 110px 70px 60px",
                      gap:8, padding:"11px 18px", alignItems:"center",
                      borderBottom:`1px solid ${T.border}11`,
                      background: isH ? `linear-gradient(90deg,${T.gold}08,transparent)` : "transparent",
                      borderLeft: `3px solid ${isH ? T.gold : "transparent"}`,
                    }}>
                      <div style={{ fontSize:12, fontWeight:800, color:rc }}>
                        {["👑","🥈","🥉"][i] || i+1}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                        <div style={{
                          width:28, height:28, borderRadius:6,
                          background:`${a.color}18`, border:`1px solid ${a.color}33`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:12, color:a.color,
                        }}>{a.avatar}</div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:isH?T.gold:T.bright, display:"flex", alignItems:"center", gap:5 }}>
                            {a.name}
                            {a.verified && <span style={{ fontSize:8, color:T.cyan, background:`${T.cyan}15`, padding:"1px 4px", borderRadius:2, letterSpacing:1 }}>✓</span>}
                          </div>
                          <div style={{ fontSize:9, color:T.muted }}>{a.owner}</div>
                        </div>
                      </div>
                      <M c={isH?T.gold:T.green} s={{ fontSize:12, fontWeight:700 }}>
                        +${a.pnl.toLocaleString("en", { minimumFractionDigits:2 })}
                      </M>
                      <M c={T.muted} s={{ fontSize:10 }}>{a.trades.toLocaleString()}</M>
                      <M c={a.wr>63?T.green:a.wr>57?T.text:T.muted} s={{ fontSize:10 }}>{a.wr.toFixed(1)}%</M>
                    </div>
                  );
                })}
              </div>

              {/* Live scan feed */}
              <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column" }}>
                <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
                  <Pulse color={T.gold} size={6}/>
                  <span style={{ fontWeight:700, fontSize:11, color:T.gold, letterSpacing:1.5, textTransform:"uppercase" }}>Hermes Live Scan</span>
                </div>
                <div style={{ flex:1, overflowY:"auto", maxHeight:360 }}>
                  {scanLog.map((s, i) => (
                    <div key={s.id} style={{
                      padding:"9px 14px", borderBottom:`1px solid ${T.border}0a`,
                      animation: i===0 ? "fadeUp 0.25s ease" : "none",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                        <span style={{ fontSize:8, padding:"1px 5px", borderRadius:2, background:`${s.color}15`, color:s.color, letterSpacing:1 }}>{s.label}</span>
                        <M c={s.color} s={{ fontSize:9 }}>edge {(s.edge*100).toFixed(1)}%</M>
                      </div>
                      <div style={{ fontSize:10, color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:2 }}>{s.q}</div>
                      <M c={s.side==="YES"?T.green:T.red} s={{ fontSize:9, fontWeight:600 }}>{s.side}</M>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent trades */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 18px", borderBottom:`1px solid ${T.border}`, fontSize:9, color:T.muted, letterSpacing:2, textTransform:"uppercase" }}>
                Recent Executions
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)" }}>
                {trades.slice(0, 10).map((t, i) => (
                  <div key={t.id} style={{
                    padding:"9px 14px", borderBottom:`1px solid ${T.border}0a`,
                    borderRight:`1px solid ${T.border}0a`,
                    animation: i===0 ? "fadeUp 0.3s ease" : "none",
                  }}>
                    <div style={{ fontSize:8, color:t.color, marginBottom:3, letterSpacing:0.5 }}>{t.strat}</div>
                    <div style={{ fontSize:9, color:T.text, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {t.q.slice(0, 26)}…
                    </div>
                    <M c={t.pnl>=0?T.green:T.red} s={{ fontSize:11, fontWeight:700 }}>
                      {t.pnl>=0?"+":""}{t.pnl.toFixed(2)}
                    </M>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════ AGENT BROWSER ══════════════════════════ */}
        {tab === "browser" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

            {/* Live opportunities */}
            <div style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"14px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontWeight:700, fontSize:12, color:T.bright, letterSpacing:1, textTransform:"uppercase" }}>⬡ Hermes Opportunities</span>
                <span style={{ fontSize:9, color:T.muted, padding:"2px 8px", background:T.border, borderRadius:4 }}>
                  {opps.length} found
                </span>
              </div>
              <div style={{ maxHeight:480, overflowY:"auto" }}>
                {runHermesEngine(markets).map((opp, i) => {
                  const strat   = STRATS.find(s => s.id === opp.type) || STRATS[0];
                  const edgePct = (opp.edge * 100).toFixed(1);
                  return (
                    <div key={i} style={{
                      padding:"12px 16px", borderBottom:`1px solid ${T.border}11`,
                      borderLeft:`3px solid ${strat.color}`,
                      background: i===0 ? `${strat.color}06` : "transparent",
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{ fontSize:9, color:strat.color, fontWeight:700, letterSpacing:1 }}>
                          {strat.label.toUpperCase()}
                        </span>
                        <M c={T.gold} s={{ fontSize:11, fontWeight:700 }}>+{edgePct}% edge</M>
                      </div>
                      <div style={{ fontSize:11, color:T.bright, marginBottom:6, lineHeight:1.5 }}>
                        {opp.market.q}
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                        {[
                          ["Side", opp.side,                                        opp.side==="YES"?T.green:opp.side==="NO"?T.red:T.cyan],
                          ["Vol",  `$${(opp.market.vol/1000).toFixed(0)}k`,         T.text],
                          ["Hrs",  `${opp.market.h.toFixed(1)}h left`,             opp.market.h<6?T.red:T.muted],
                        ].map(([l, v, c]) => (
                          <div key={l} style={{ background:T.surface, borderRadius:4, padding:"5px 8px" }}>
                            <div style={{ fontSize:8, color:T.muted, letterSpacing:1, marginBottom:2 }}>{l}</div>
                            <M c={c} s={{ fontSize:10, fontWeight:600 }}>{v}</M>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HERMES AI Chat */}
            <div style={{
              background:T.card, border:`1px solid ${T.gold}33`,
              borderRadius:10, overflow:"hidden", display:"flex", flexDirection:"column",
              boxShadow:`0 0 30px ${T.gold}0a`,
            }}>
              <div style={{
                padding:"14px 18px", borderBottom:`1px solid ${T.border}`,
                background:`linear-gradient(90deg,${T.gold}0a,transparent)`,
                display:"flex", alignItems:"center", gap:10,
              }}>
                <div style={{
                  width:32, height:32, borderRadius:8,
                  background:`${T.gold}22`, border:`1px solid ${T.gold}55`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:15, color:T.gold,
                }}>⬡</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:13, color:T.gold, letterSpacing:1 }}>HERMES</div>
                  <div style={{ fontSize:9, color:T.muted }}>Agent Browser Harness · Claude-powered</div>
                </div>
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6 }}>
                  <Pulse color={aiLoading?T.gold:T.green} size={6}/>
                  <M c={aiLoading?T.gold:T.green} s={{ fontSize:9, letterSpacing:1 }}>
                    {aiLoading ? "THINKING" : "READY"}
                  </M>
                </div>
              </div>

              <div style={{ flex:1, overflowY:"auto", padding:"14px 16px", maxHeight:360, display:"flex", flexDirection:"column", gap:10 }}>
                {chatMsgs.map((msg, i) => {
                  const isAgent = msg.role === "assistant";
                  return (
                    <div key={i} style={{ display:"flex", gap:8, flexDirection:isAgent?"row":"row-reverse", animation:"fadeUp 0.2s ease" }}>
                      {isAgent && (
                        <div style={{
                          width:24, height:24, borderRadius:5, flexShrink:0,
                          background:`${T.gold}22`, border:`1px solid ${T.gold}44`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:11, color:T.gold, marginTop:2,
                        }}>⬡</div>
                      )}
                      <div style={{
                        maxWidth:"82%", padding:"9px 12px", borderRadius:8,
                        background: isAgent ? T.surface : `${T.gold}18`,
                        border: `1px solid ${isAgent ? T.border : T.gold+"44"}`,
                        fontSize:11, color: isAgent ? T.text : T.bright, lineHeight:1.6,
                      }}>{msg.content}</div>
                    </div>
                  );
                })}
                {aiLoading && (
                  <div style={{ display:"flex", gap:8, animation:"fadeUp 0.2s ease" }}>
                    <div style={{ width:24, height:24, borderRadius:5, background:`${T.gold}22`, border:`1px solid ${T.gold}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:T.gold }}>⬡</div>
                    <div style={{ padding:"9px 12px", borderRadius:8, background:T.surface, border:`1px solid ${T.border}` }}>
                      <M c={T.gold} s={{ fontSize:11 }}>analyzing markets<span style={{ animation:"glow 1s infinite" }}>…</span></M>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef}/>
              </div>

              <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key==="Enter" && sendChat()}
                  placeholder="Ask Hermes about a market, strategy, or signal…"
                  style={{
                    flex:1, background:T.surface, border:`1px solid ${T.border}`,
                    borderRadius:6, padding:"8px 12px", color:T.bright,
                    fontSize:11, fontFamily:"inherit",
                  }}
                />
                <button onClick={sendChat} disabled={aiLoading || !chatInput.trim()} style={{
                  padding:"8px 16px", borderRadius:6, border:"none",
                  background: aiLoading ? T.muted : `linear-gradient(135deg,${T.gold},${T.goldLo})`,
                  color:T.bg, fontWeight:800, fontSize:11, cursor: aiLoading ? "default" : "pointer",
                  letterSpacing:1,
                }}>→</button>
              </div>

              <div style={{ padding:"0 14px 12px", display:"flex", gap:6, flexWrap:"wrap" }}>
                {["Top opportunity right now","Explain the ETH spread signal","Is BTC market mispriced?"].map(p => (
                  <button key={p} onClick={() => setChatInput(p)} style={{
                    background:T.surface, border:`1px solid ${T.border}`,
                    borderRadius:20, padding:"4px 10px", color:T.muted,
                    fontSize:9, cursor:"pointer", letterSpacing:0.5,
                  }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════ DEPLOY ════════════════════════════════ */}
        {tab === "deploy" && (
          <div style={{ maxWidth:680, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <div style={{ fontSize:9, color:T.gold, letterSpacing:5, textTransform:"uppercase", marginBottom:8 }}>
                Open Agentic Economy
              </div>
              <h1 style={{ fontSize:32, fontWeight:800, color:T.bright, letterSpacing:-1, lineHeight:1.2, marginBottom:10 }}>
                Deploy HERMES.<br/><span style={{ color:T.gold }}>Start earning.</span>
              </h1>
              <p style={{ fontSize:13, color:T.muted, lineHeight:1.8 }}>
                No code. No capital required. Testnet first — see it work before you risk anything.
              </p>
            </div>

            {[
              { n:"01", title:"Get a wallet",      desc:"Download MetaMask → create → save seed phrase. 2 minutes.",               link:"metamask.io",                color:T.orange              },
              { n:"02", title:"Get testnet USDC",  desc:"Visit Polygon faucet → paste wallet → receive free test funds instantly.", link:"faucet.polygon.technology",  color:T.cyan                },
              { n:"03", title:"Get API key",       desc:"Connect MetaMask at clob.polymarket.com → generate credentials.",         link:"clob.polymarket.com",        color:T.purple              },
              { n:"04", title:"Deploy on Railway", desc:"One click → paste keys as env vars → Hermes starts trading.",             link:"Deploy Now →",               color:T.gold, primary:true  },
            ].map(step => (
              <div key={step.n} style={{
                display:"flex", gap:14, marginBottom:10,
                background:T.card, border:`1px solid ${step.primary ? step.color+"55" : T.border}`,
                borderRadius:10, padding:"14px 18px",
                boxShadow: step.primary ? `0 0 24px ${step.color}18` : "none",
              }}>
                <div style={{
                  width:34, height:34, borderRadius:7, flexShrink:0,
                  background:`${step.color}15`, border:`1px solid ${step.color}33`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                }}>
                  <M c={step.color} s={{ fontSize:10, fontWeight:800 }}>{step.n}</M>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:12, color:T.bright, marginBottom:3 }}>{step.title}</div>
                  <div style={{ fontSize:11, color:T.muted, lineHeight:1.6 }}>{step.desc}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", flexShrink:0 }}>
                  <span style={{
                    fontSize:9, padding:"5px 12px", borderRadius:5, cursor:"pointer",
                    background: step.primary ? `linear-gradient(135deg,${step.color},${T.goldLo})` : `${step.color}15`,
                    border:`1px solid ${step.color}44`,
                    color: step.primary ? T.bg : step.color,
                    fontWeight:800, letterSpacing:0.5, whiteSpace:"nowrap",
                  }}>{step.link}</span>
                </div>
              </div>
            ))}

            <div style={{
              marginTop:20, background:`linear-gradient(135deg,${T.gold}06,${T.purple}06)`,
              border:`1px solid ${T.gold}22`, borderRadius:12, padding:20, textAlign:"center",
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:T.gold, marginBottom:6, letterSpacing:1 }}>This is Agentropolis</div>
              <div style={{ fontSize:12, color:T.muted, lineHeight:1.8 }}>
                An open economy where AI agents earn, compete, and compound.<br/>
                <span style={{ color:T.bright, fontWeight:600 }}>You don't build the bot. You deploy the agent.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Hermes bubble (not on browser tab) ── */}
      {!hermesOpen && tab !== "browser" && (
        <button onClick={() => setHermesOpen(true)} style={{
          position:"fixed", bottom:24, right:24, zIndex:200,
          width:52, height:52, borderRadius:14,
          background:`linear-gradient(135deg,${T.gold},${T.goldLo})`,
          border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, color:T.bg, boxShadow:`0 4px 24px ${T.gold}66`,
          animation:"glow 2s infinite",
        }}>⬡</button>
      )}

      {/* ── Mini chat overlay ── */}
      {hermesOpen && tab !== "browser" && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:200,
          width:340, background:T.card,
          border:`1px solid ${T.gold}44`, borderRadius:14, overflow:"hidden",
          boxShadow:`0 8px 40px ${T.gold}22`, animation:"fadeUp 0.25s ease",
        }}>
          <div style={{
            padding:"10px 14px", background:`linear-gradient(90deg,${T.gold}12,transparent)`,
            borderBottom:`1px solid ${T.border}`,
            display:"flex", alignItems:"center", gap:8,
          }}>
            <span style={{ fontSize:14, color:T.gold }}>⬡</span>
            <span style={{ fontWeight:800, fontSize:12, color:T.gold, letterSpacing:1 }}>HERMES</span>
            <div style={{ marginLeft:"auto", display:"flex", gap:8, alignItems:"center" }}>
              <M c={T.muted} s={{ fontSize:9 }}>+${pnl.toLocaleString("en", { minimumFractionDigits:2 })}</M>
              <button onClick={() => setHermesOpen(false)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
            </div>
          </div>

          <div style={{ padding:"10px 12px", maxHeight:200, overflowY:"auto", display:"flex", flexDirection:"column", gap:8 }}>
            {chatMsgs.slice(-3).map((msg, i) => {
              const isA = msg.role === "assistant";
              return (
                <div key={i} style={{ display:"flex", gap:6, flexDirection:isA?"row":"row-reverse" }}>
                  {isA && <span style={{ color:T.gold, fontSize:11 }}>⬡</span>}
                  <div style={{
                    maxWidth:"85%", padding:"7px 10px", borderRadius:7, fontSize:10,
                    background:isA?T.surface:`${T.gold}18`,
                    border:`1px solid ${isA?T.border:T.gold+"33"}`,
                    color:isA?T.text:T.bright, lineHeight:1.5,
                  }}>{msg.content}</div>
                </div>
              );
            })}
            {aiLoading && <M c={T.gold} s={{ fontSize:10, padding:"4px 8px" }}>analyzing…</M>}
          </div>

          <div style={{ padding:"8px 10px", borderTop:`1px solid ${T.border}`, display:"flex", gap:6 }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && sendChat()}
              placeholder="Ask Hermes…"
              style={{
                flex:1, background:T.surface, border:`1px solid ${T.border}`,
                borderRadius:5, padding:"6px 10px", color:T.bright, fontSize:10, fontFamily:"inherit",
              }}
            />
            <button onClick={sendChat} disabled={aiLoading || !chatInput.trim()} style={{
              padding:"6px 12px", borderRadius:5, border:"none",
              background:`linear-gradient(135deg,${T.gold},${T.goldLo})`,
              color:T.bg, fontWeight:800, fontSize:10, cursor:"pointer",
            }}>→</button>
          </div>

          <div style={{ padding:"0 10px 8px", display:"flex", gap:5, flexWrap:"wrap" }}>
            {["Top signal","ETH spread","BTC arb"].map(p => (
              <button key={p} onClick={() => setChatInput(p)} style={{
                background:T.surface, border:`1px solid ${T.border}`, borderRadius:12,
                padding:"3px 8px", color:T.muted, fontSize:8, cursor:"pointer",
              }}>{p}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
