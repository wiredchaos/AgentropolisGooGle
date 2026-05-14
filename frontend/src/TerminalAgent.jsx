import { useState, useEffect, useRef, useCallback } from "react";

// ─── CRT / terminal palette ───────────────────────────────────────────────────
const T = {
  bg:       "#020403",
  panel:    "#050a06",
  green:    "#00ff41",
  green2:   "#00cc33",
  green3:   "#008f20",
  dim:      "#003010",
  amber:    "#ffb000",
  cyan:     "#00e5ff",
  red:      "#ff3b5c",
  white:    "#c8ffc8",
  muted:    "#1a4a1a",
  border:   "#0a2a0a",
};

// ─── ASCII banner ─────────────────────────────────────────────────────────────
const BANNER = [
  "  ██╗  ██╗███████╗██████╗ ███╗   ███╗███████╗███████╗",
  "  ██║  ██║██╔════╝██╔══██╗████╗ ████║██╔════╝██╔════╝",
  "  ███████║█████╗  ██████╔╝██╔████╔██║█████╗  ███████╗",
  "  ██╔══██║██╔══╝  ██╔══██╗██║╚██╔╝██║██╔══╝  ╚════██║",
  "  ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║███████╗███████║",
  "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚══════╝",
  "",
  "  POLYMARKET + CRYPTO ARBITRAGE AGENT  //  v1.0.0",
  "  ─────────────────────────────────────────────────",
  "  type  help  for available commands",
  "",
];

// ─── Log-level colours ────────────────────────────────────────────────────────
const LOG_COLOR = {
  SCAN:  T.green3,
  EDGE:  T.cyan,
  EXEC:  T.amber,
  TRADE: T.amber,
  TV:    T.cyan,
  ARB:   T.green,
  FUND:  T.green2,
  LIQ:   T.red,
  AI:    "#b47cff",
  INFO:  T.green3,
  WARN:  T.amber,
  ERROR: T.red,
  CMD:   T.white,
  SYS:   T.muted,
};

// ─── Command help ─────────────────────────────────────────────────────────────
const COMMANDS = {
  help:      () => [
    "  available commands:",
    "  ─────────────────────────────────────────",
    "  status       current agent state + stats",
    "  positions    open positions",
    "  trades [n]   last n trades (default 10)",
    "  signals      live TV signal feed",
    "  strategies   strategy status",
    "  iv           implied volatility cache",
    "  accumulator  USDC accumulator balance",
    "  ai           AI signal layer stats",
    "  clear        clear terminal",
    "  scan         force a scan cycle",
    "  pause        pause trading",
    "  resume       resume trading",
    "  ─────────────────────────────────────────",
  ],
  clear:     () => "__CLEAR__",
};

// ─── Mock agent state ─────────────────────────────────────────────────────────
function mockAgentState() {
  return {
    stats: {
      state: ["scanning","executing","analyzing","cooldown"][Math.floor(Math.random()*4)],
      daily_pnl_usdc: 247.80 + (Math.random()-0.4)*20,
      total_pnl_usdc: 3241.40,
      total_trades: 480,
      winning_trades: 323,
      active_positions: 7,
      uptime_seconds: 15840 + Math.random()*10,
      scan_count: 528,
      last_cycle_ms: 240 + Math.random()*300,
    },
    win_rate: 67.3,
    recent_trades: Array.from({length:20}, (_,i) => {
      const strats = ["polymarket_mispricing","crypto_momentum","funding_rate_arb","tv_signal_follower","liquidation_hunter"];
      const syms   = ["ETH>$3200?","BTC<$65k?","ETHUSDT","BTCUSDT","SOLUSDT"];
      const pnl    = (Math.random()-0.35)*80;
      return {
        id: `t${(480-i).toString(16)}`,
        strategy: strats[i%strats.length],
        symbol: syms[i%syms.length],
        side: Math.random()>.5?"buy":"sell",
        size_usdc: Math.round(Math.random()*120+20),
        entry_price: 3200+Math.random()*200,
        pnl: i<15?pnl:null,
        status: i<15?"closed":"open",
      };
    }),
    strategies: [
      {name:"polymarket_mispricing", enabled:true, markets_cached:14, threshold_pct:6},
      {name:"crypto_momentum",       enabled:true, pairs:["ETHUSDT","BTCUSDT","SOLUSDT"], min_rsi:55},
      {name:"crypto_mean_reversion", enabled:true, bb_period:20, bb_std:2.0},
      {name:"tv_signal_follower",    enabled:true, signals_received:8, trades_taken:6},
      {name:"funding_rate_arb",      enabled:true, top_rates:{ETHUSDT:"0.0910%", BTCUSDT:"0.0720%"}},
      {name:"liquidation_hunter",    enabled:true, watching:["ETHUSDT","BTCUSDT","SOLUSDT"]},
      {name:"combinatorial_arb",     enabled:true, markets_scanned:22, arb_found:3},
    ],
    tv_signals: {
      ETHUSDT: {trend:"bull",  confidence:0.81, momentum_bias: 0.67, rsi:62.4, price:3247.5},
      BTCUSDT: {trend:"neutral",confidence:0.53,momentum_bias: 0.11, rsi:51.8, price:62140},
      SOLUSDT: {trend:"bear",  confidence:0.74, momentum_bias:-0.58, rsi:37.9, price:142.3},
    },
    accumulator: {balance_usdc:847.40, total_received:3240.80, dry_run:true, next_flush:"23:00 UTC"},
    ai_signal:   {enabled:true, model:"gpt-4o", calls:142, cost_usd:0.31},
  };
}

// ─── Log stream generator ─────────────────────────────────────────────────────
function generateLogLine(state) {
  if (!state) return null;
  const { stats, tv_signals, strategies } = state;
  const now = new Date().toLocaleTimeString("en-GB", {hour12:false});

  const pool = [
    () => ({ tag:"SCAN", msg:`cycle #${stats.scan_count}  state=${stats.state}  cycle=${Math.round(stats.last_cycle_ms)}ms` }),
    () => ({ tag:"EDGE", msg:`polymarket_mispricing  ETH>$3200  fair=0.672  mkt=0.580  edge=+9.2%` }),
    () => ({ tag:"EXEC", msg:`BUY YES  ETH>$3200  size=$${Math.round(30+Math.random()*60)}  kelly=0.22` }),
    () => ({ tag:"TV",   msg:`ETHUSDT  trend=${tv_signals?.ETHUSDT?.trend||"bull"}  conf=${(tv_signals?.ETHUSDT?.confidence||0.8).toFixed(2)}  rsi=${(tv_signals?.ETHUSDT?.rsi||62).toFixed(1)}` }),
    () => ({ tag:"SCAN", msg:`funding_rate_arb  ETHUSDT  rate=+0.091%  annualized=99.5%` }),
    () => ({ tag:"ARB",  msg:`combinatorial_arb  multi-condition  yes+no=0.94  profit=6.0%` }),
    () => ({ tag:"FUND", msg:`BNBUSDT  funding collected  $${(Math.random()*12+4).toFixed(2)}  periods=1` }),
    () => ({ tag:"SCAN", msg:`liquidation_hunter  SOLUSDT  OI drop 1.8%  cascade signal` }),
    () => ({ tag:"AI",   msg:`conviction=0.${71+Math.floor(Math.random()*20)}  risk=low  pass=true  cost=$0.002` }),
    () => ({ tag:"SCAN", msg:`crypto_momentum  ETHUSDT  ema9>ema21  rsi=62.4  edge=0.24%` }),
    () => ({ tag:"TRADE",msg:`CLOSE  ETHUSDT  side=buy  pnl=+$${(Math.random()*40+5).toFixed(2)}  held=18m` }),
    () => ({ tag:"TV",   msg:`SOLUSDT  trend=bear  conf=0.74  rsi=37.9  pine: "Resistance 148"` }),
    () => ({ tag:"SCAN", msg:`polymarket  markets=14  binary=9  above/below=5` }),
    () => ({ tag:"EDGE", msg:`crypto_mean_reversion  SOLUSDT  bb_pct=0.03  rsi=37.9  edge=buy` }),
    () => ({ tag:"AI",   msg:`market commentary refreshed  ETH constructive above 3200` }),
    () => ({ tag:"FUND", msg:`accumulator balance=$${(state.accumulator?.balance_usdc||800).toFixed(2)}  next_flush=23:00 UTC` }),
    () => ({ tag:"LIQ",  msg:`BTCUSDT  liq_feed=$${Math.round(50000+Math.random()*100000).toLocaleString()}  direction=long` }),
  ];

  const { tag, msg } = pool[Math.floor(Math.random() * pool.length)]();
  return { ts: now, tag, msg, color: LOG_COLOR[tag] || T.green3 };
}

// ─── Command processor ────────────────────────────────────────────────────────
function processCommand(input, agentState) {
  const [cmd, ...args] = input.trim().toLowerCase().split(/\s+/);

  if (COMMANDS[cmd]) {
    const result = COMMANDS[cmd](args, agentState);
    if (result === "__CLEAR__") return "__CLEAR__";
    return result.map(l => ({ ts:"", tag:"CMD", msg:l, color:T.white }));
  }

  const s = agentState?.stats;
  const now = new Date().toLocaleTimeString("en-GB", {hour12:false});

  if (cmd === "status" && s) {
    const up = s.uptime_seconds || 0;
    return [
      `  ┌── AGENT STATUS ─────────────────────────────`,
      `  │  state      ${s.state.toUpperCase()}`,
      `  │  daily pnl  $${(s.daily_pnl_usdc||0).toFixed(2)}`,
      `  │  total pnl  $${(s.total_pnl_usdc||0).toFixed(2)}`,
      `  │  win rate   ${agentState.win_rate?.toFixed(1)}%  (${s.winning_trades}/${s.total_trades})`,
      `  │  positions  ${s.active_positions} open`,
      `  │  cycle      ${Math.round(s.last_cycle_ms)}ms  scan #${s.scan_count}`,
      `  │  uptime     ${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m`,
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts: now, tag:"CMD", msg:l, color:T.white }));
  }

  if (cmd === "positions") {
    const open = (agentState?.recent_trades||[]).filter(t => t.status==="open");
    if (!open.length) return [{ ts:now, tag:"CMD", msg:"  no open positions", color:T.muted }];
    return [
      `  ┌── OPEN POSITIONS (${open.length}) ────────────────────`,
      ...open.map(t => `  │  ${t.id}  ${t.strategy.split("_")[0].toUpperCase().padEnd(8)}  ${t.symbol.padEnd(14)}  ${t.side.toUpperCase()}  $${t.size_usdc}`),
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.white }));
  }

  if (cmd === "trades") {
    const n = parseInt(args[0]) || 10;
    const trades = (agentState?.recent_trades||[]).filter(t => t.status==="closed").slice(-n).reverse();
    return [
      `  ┌── LAST ${n} CLOSED TRADES ──────────────────────`,
      ...trades.map(t => {
        const pnl = (t.pnl||0);
        const sign = pnl >= 0 ? "+" : "";
        return `  │  ${t.id}  ${t.symbol.padEnd(14)}  ${t.side.toUpperCase().padEnd(4)}  ${sign}$${pnl.toFixed(2).padStart(7)}`;
      }),
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.white }));
  }

  if (cmd === "signals") {
    const sigs = agentState?.tv_signals || {};
    return [
      `  ┌── TV SIGNALS ────────────────────────────────`,
      ...Object.entries(sigs).map(([sym, sig]) =>
        `  │  ${sym.padEnd(10)}  ${(sig.trend||"?").toUpperCase().padEnd(8)}  conf=${(sig.confidence||0).toFixed(2)}  rsi=${(sig.rsi||0).toFixed(1)}`
      ),
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.cyan }));
  }

  if (cmd === "strategies") {
    return [
      `  ┌── STRATEGIES ────────────────────────────────`,
      ...(agentState?.strategies||[]).map(s =>
        `  │  ${s.enabled?"●":"○"}  ${s.name.padEnd(26)}  ${s.enabled?"LIVE":"OFF"}`
      ),
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.green }));
  }

  if (cmd === "accumulator") {
    const acc = agentState?.accumulator || {};
    return [
      `  ┌── USDC ACCUMULATOR ──────────────────────────`,
      `  │  balance     $${(acc.balance_usdc||0).toFixed(2)}`,
      `  │  received    $${(acc.total_received||0).toFixed(2)}`,
      `  │  next flush  ${acc.next_flush||"--"}`,
      `  │  mode        ${acc.dry_run?"DRY RUN":"LIVE"}`,
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.amber }));
  }

  if (cmd === "ai") {
    const ai = agentState?.ai_signal || {};
    return [
      `  ┌── AI SIGNAL LAYER ───────────────────────────`,
      `  │  model   ${ai.model||"gpt-4o"}`,
      `  │  status  ${ai.enabled?"ACTIVE":"DISABLED"}`,
      `  │  calls   ${ai.calls||0}`,
      `  │  cost    $${(ai.cost_usd||0).toFixed(4)}`,
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:"#b47cff" }));
  }

  if (cmd === "iv") {
    return [
      `  ┌── IMPLIED VOLATILITY (OKX 5m klines) ───────`,
      `  │  BTC-USDT   IV=0.847  (cached 4m ago)`,
      `  │  ETH-USDT   IV=0.921  (cached 4m ago)`,
      `  │  SOL-USDT   IV=1.284  (cached 4m ago)`,
      `  │  cache ttl  300s`,
      `  └─────────────────────────────────────────────`,
    ].map(l => ({ ts:now, tag:"CMD", msg:l, color:T.cyan }));
  }

  if (cmd === "scan") {
    return [{ ts:now, tag:"SYS", msg:"  scan cycle triggered", color:T.amber }];
  }
  if (cmd === "pause") {
    return [{ ts:now, tag:"SYS", msg:"  agent paused — no new trades will be opened", color:T.amber }];
  }
  if (cmd === "resume") {
    return [{ ts:now, tag:"SYS", msg:"  agent resumed", color:T.green }];
  }
  if (cmd === "") {
    return [];
  }

  return [{ ts:now, tag:"SYS", msg:`  command not found: ${cmd}  (type help)`, color:T.muted }];
}

// ─── Terminal line renderer ───────────────────────────────────────────────────
function TermLine({ line, idx }) {
  if (!line) return null;
  const tag   = line.tag ? `[${line.tag.padEnd(5)}]` : "";
  const color = line.color || T.green3;
  return (
    <div style={{ display:"flex", gap:10, lineHeight:1.6, minHeight:"1.6em" }}>
      {line.ts ? (
        <span style={{ color:T.muted, flexShrink:0, userSelect:"none", fontSize:11 }}>{line.ts}</span>
      ) : (
        <span style={{ width:60, flexShrink:0 }}/>
      )}
      {line.tag ? (
        <span style={{ color, flexShrink:0, fontSize:11, fontWeight:600, width:62 }}>{tag}</span>
      ) : (
        <span style={{ width:62, flexShrink:0 }}/>
      )}
      <span style={{ color, fontSize:12, wordBreak:"break-all" }}>{line.msg}</span>
    </div>
  );
}

// ─── Cursor ───────────────────────────────────────────────────────────────────
function Cursor() {
  const [vis, setVis] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setVis(v => !v), 530);
    return () => clearInterval(t);
  }, []);
  return <span style={{ opacity: vis ? 1 : 0, color: T.green, fontWeight:700 }}>█</span>;
}

// ─── Main Terminal ────────────────────────────────────────────────────────────
export default function TerminalAgent() {
  const [lines, setLines]       = useState([]);
  const [input, setInput]       = useState("");
  const [history, setHistory]   = useState([]);
  const [histIdx, setHistIdx]   = useState(-1);
  const [agentState, setAgentState] = useState(null);
  const [connected, setConnected]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const mockRef   = useRef(null);

  // init banner
  useEffect(() => {
    const bannerLines = BANNER.map(l => ({ ts:"", tag:"", msg:l, color:T.green }));
    setLines(bannerLines);
  }, []);

  // WebSocket or mock
  useEffect(() => {
    let ws;
    const startMock = () => {
      setConnected(false);
      const s = mockAgentState();
      setAgentState(s);
      mockRef.current = setInterval(() => {
        setAgentState(prev => {
          const next = mockAgentState();
          const line = generateLogLine(next);
          if (line) setLines(prev => [...prev.slice(-400), line]);
          return next;
        });
      }, 2200);
    };
    try {
      ws = new WebSocket("ws://localhost:8765/ws");
      ws.onopen    = () => { setConnected(true); clearInterval(mockRef.current); };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "agent_state") {
          setAgentState(msg.data);
          const line = generateLogLine(msg.data);
          if (line) setLines(prev => [...prev.slice(-400), line]);
        }
      };
      ws.onerror = () => startMock();
      ws.onclose = () => { if (!connected) startMock(); };
    } catch { startMock(); }

    return () => { clearInterval(mockRef.current); ws?.close(); };
  }, []);

  // auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [lines]);

  const submit = useCallback(() => {
    const cmd = input.trim();
    const now = new Date().toLocaleTimeString("en-GB", {hour12:false});

    // echo command
    setLines(prev => [...prev, { ts:now, tag:"", msg:`hermes@agent:~$ ${cmd}`, color:T.white }]);
    setHistory(h => cmd ? [cmd, ...h.slice(0,49)] : h);
    setHistIdx(-1);
    setInput("");

    const result = processCommand(cmd, agentState);
    if (result === "__CLEAR__") {
      setLines(BANNER.map(l => ({ ts:"", tag:"", msg:l, color:T.green })));
      return;
    }
    if (result?.length) {
      setLines(prev => [...prev, ...result]);
    }
  }, [input, agentState]);

  const onKeyDown = (e) => {
    if (e.key === "Enter") { submit(); return; }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(idx);
      setInput(history[idx] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : history[idx] || "");
    }
  };

  const s = agentState?.stats;
  const stateColor = { scanning:T.green, executing:T.amber, analyzing:T.cyan, cooldown:T.muted }[s?.state] || T.muted;

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      style={{
        background: T.bg, minHeight:"100vh", display:"flex", flexDirection:"column",
        fontFamily:"'JetBrains Mono','Fira Code','Courier New',monospace",
        color: T.green, userSelect:"none", cursor:"text",
        position:"relative", overflow:"hidden",
      }}
    >
      {/* CRT scanline overlay */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:10,
        background:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
      }}/>
      {/* CRT vignette */}
      <div style={{
        position:"fixed", inset:0, pointerEvents:"none", zIndex:9,
        background:"radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)",
      }}/>

      {/* Status bar */}
      <div style={{
        borderBottom:`1px solid ${T.border}`, padding:"4px 16px",
        display:"flex", alignItems:"center", gap:20, flexShrink:0,
        background: T.panel, position:"sticky", top:0, zIndex:20,
      }}>
        <span style={{ color:T.green, fontWeight:700, fontSize:11, letterSpacing:2 }}>HERMES</span>
        <span style={{ color:T.muted, fontSize:10 }}>trading agent</span>
        <div style={{ flex:1 }}/>
        {s && <>
          <span style={{ color:stateColor, fontSize:10, letterSpacing:1 }}>
            ● {(s.state||"--").toUpperCase()}
          </span>
          <span style={{ color:T.muted, fontSize:10 }}>|</span>
          <span style={{ color:(s.daily_pnl_usdc||0)>=0?T.green:T.red, fontSize:10 }}>
            PNL {(s.daily_pnl_usdc||0)>=0?"+":""}${(s.daily_pnl_usdc||0).toFixed(2)}
          </span>
          <span style={{ color:T.muted, fontSize:10 }}>|</span>
          <span style={{ color:T.muted, fontSize:10 }}>
            {s.active_positions} pos  ·  {Math.floor((s.uptime_seconds||0)/3600)}h uptime
          </span>
        </>}
        <span style={{ color:T.muted, fontSize:10 }}>|</span>
        <span style={{ color:connected?T.green:T.amber, fontSize:10 }}>
          {connected?"● LIVE":"● DEMO"}
        </span>
      </div>

      {/* Log area */}
      <div style={{
        flex:1, overflowY:"auto", padding:"12px 20px 0",
        display:"flex", flexDirection:"column", gap:0,
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');
          * { box-sizing:border-box; }
          ::-webkit-scrollbar { width:4px; background:${T.bg}; }
          ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:2px; }
          @keyframes flicker { 0%,100%{opacity:1} 92%{opacity:1} 93%{opacity:.95} 96%{opacity:1} }
        `}</style>

        {lines.map((line, i) => <TermLine key={i} line={line} idx={i} />)}
        <div ref={bottomRef}/>
      </div>

      {/* Input line */}
      <div style={{
        borderTop:`1px solid ${T.border}`, padding:"10px 20px",
        display:"flex", alignItems:"center", gap:10,
        background: T.panel, flexShrink:0, position:"sticky", bottom:0, zIndex:20,
      }}>
        <span style={{ color:T.green, fontSize:12, flexShrink:0 }}>hermes@agent:~$</span>
        <div style={{ flex:1, position:"relative", display:"flex", alignItems:"center" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            style={{
              background:"transparent", border:"none", outline:"none",
              color:T.white, fontFamily:"inherit", fontSize:12,
              width:"100%", caretColor:"transparent",
            }}
          />
          {/* custom caret */}
          <span style={{
            position:"absolute",
            left: `${input.length}ch`,
            pointerEvents:"none",
          }}>
            <Cursor/>
          </span>
        </div>
      </div>
    </div>
  );
}
