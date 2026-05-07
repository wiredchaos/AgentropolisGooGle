import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, RadarChart, Radar, PolarGrid, PolarAngleAxis } from "recharts";

const C = {
  bg:      "#05080d",
  panel:   "#0a0f18",
  card:    "#0e1520",
  border:  "#1c2a3a",
  accent:  "#00e5ff",
  green:   "#00ff9d",
  red:     "#ff3055",
  yellow:  "#ffcc00",
  purple:  "#9d6fff",
  orange:  "#ff8c42",
  text:    "#d0dae8",
  muted:   "#4a5c6e",
  dim:     "#131e2b",
};

const STRAT_COLORS = {
  polymarket_mispricing:  C.accent,
  crypto_momentum:        C.green,
  crypto_mean_reversion:  C.yellow,
  tv_signal_follower:     C.purple,
  funding_rate_arb:       C.orange,
  liquidation_hunter:     C.red,
};

// ─── Mock data ────────────────────────────────────────────────────────────────
function mockState() {
  const strats = Object.keys(STRAT_COLORS);
  const symbols = ["ETHUSDT","BTCUSDT","SOLUSDT","ETH>$3200?","BTC<$65k?","SOL>$150?"];
  const trades = Array.from({length:50}, (_,i) => {
    const s = strats[i % strats.length];
    const pnl = (Math.random()-0.38)*90;
    return {
      id: `t${i.toString(16)}`, strategy: s,
      symbol: symbols[Math.floor(Math.random()*symbols.length)],
      side: Math.random()>.5?"buy":"sell",
      size_usdc: Math.round(Math.random()*180+20),
      entry_price: Math.random()*3000+1500,
      pnl: i<38 ? pnl : null,
      status: i<38?"closed":"open",
      source: s.includes("poly")?"polymarket":"crypto",
      timestamp: new Date(Date.now()-(50-i)*180000).toISOString(),
      ai_conviction: Math.random()*0.5+0.5,
    };
  });
  const closed = trades.filter(t=>t.status==="closed");
  const totalPnl = closed.reduce((s,t)=>s+(t.pnl||0),0);
  const winners = closed.filter(t=>(t.pnl||0)>0).length;

  return {
    stats: {
      total_trades: trades.length, winning_trades: winners,
      total_pnl_usdc: totalPnl, daily_pnl_usdc: totalPnl*0.35,
      active_positions: 12, last_cycle_ms: Math.random()*600+150,
      uptime_seconds: 14400+Math.random()*1000, scan_count: 480+Math.floor(Math.random()*5),
      state: ["scanning","executing","analyzing","cooldown"][Math.floor(Math.random()*4)],
    },
    win_rate: (winners/Math.max(closed.length,1))*100,
    recent_trades: trades,
    strategies: strats.map(n => ({
      name: n, enabled: true,
      trades_today: Math.floor(Math.random()*25+5),
      pnl_today: (Math.random()-0.3)*200,
      win_rate: Math.random()*30+50,
      avg_edge: Math.random()*0.08+0.04,
    })),
    tv_signals: {
      ETHUSDT: {trend:"bull",confidence:0.81,momentum_bias:0.67,rsi:62.4,price:3247.5,signal_source:"tradingview-mcp"},
      BTCUSDT: {trend:"neutral",confidence:0.53,momentum_bias:0.11,rsi:51.8,price:62140,signal_source:"tradingview-mcp"},
      SOLUSDT: {trend:"bear",confidence:0.74,momentum_bias:-0.58,rsi:37.9,price:142.3,signal_source:"tradingview-mcp"},
    },
    accumulator: {
      balance_usdc: 847.40, total_received: 3240.80,
      flush_hour_utc: 23, next_flush: "2026-04-11T23:00:00Z", dry_run: true,
    },
    ai_signal: {
      enabled: true, model: "gpt-4o", calls: 142, cost_usd: 0.31,
      commentary: "ETH momentum remains constructive above 3200 with funding neutral. BTC consolidating — watch for breakout above 63k. SOL showing distribution pattern; mean reversion setup forming near 138 support.",
    },
    leaderboard: [
      {rank:1, name:"NEURO", pnl:3241.80, trades:480, win_rate:67.2, badge:"👑"},
      {rank:2, name:"stargate5", pnl:2180.40, trades:312, win_rate:63.1, badge:"🥈"},
      {rank:3, name:"alphazero", pnl:1840.20, trades:291, win_rate:61.8, badge:"🥉"},
      {rank:4, name:"gridmaster", pnl:1220.50, trades:198, win_rate:58.4, badge:""},
      {rank:5, name:"voltbot", pnl:980.30, trades:167, win_rate:55.9, badge:""},
    ],
    timestamp: new Date().toISOString(),
  };
}

function mockPnlHistory() {
  let pnl=0;
  return Array.from({length:96}, (_,i) => {
    pnl += (Math.random()-0.42)*35;
    return {t:i, pnl:Math.round(pnl*100)/100, label: i%12===0 ? `${Math.floor(i/4)}h` : ""};
  });
}

// ─── Shared components ────────────────────────────────────────────────────────
const Mono = ({children,style}) => (
  <span style={{fontFamily:"'JetBrains Mono','Fira Code',monospace",...style}}>{children}</span>
);

function Badge({label, color=C.accent, size=11}) {
  return (
    <span style={{
      background:color+"22", border:`1px solid ${color}55`, color,
      borderRadius:4, padding:"1px 7px", fontSize:size,
      fontWeight:600, letterSpacing:0.8, textTransform:"uppercase",
    }}>{label}</span>
  );
}

function StateOrb({state}) {
  const map = {scanning:C.accent,executing:C.green,analyzing:C.yellow,cooldown:C.muted,paused:C.yellow,stopped:C.red,booting:C.purple};
  const color = map[state]||C.muted;
  return (
    <div style={{display:"flex",alignItems:"center",gap:6}}>
      <div style={{width:8,height:8,borderRadius:"50%",background:color,animation:"pulse 2s infinite"}}/>
      <span style={{color,fontSize:11,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase"}}>{state}</span>
    </div>
  );
}

function MiniChart({data, color=C.accent, height=50}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{top:2,right:0,bottom:0,left:0}}>
        <defs>
          <linearGradient id={`g${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={color} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="pnl" stroke={color} strokeWidth={1.5}
              fill={`url(#g${color.replace("#","")})`}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [state, setState]       = useState(null);
  const [pnlHist, setPnlHist]   = useState([]);
  const [tab, setTab]           = useState("arena");
  const [connected, setConn]    = useState(false);
  const [alerts, setAlerts]     = useState([]);
  const [mobile, setMobile]     = useState(window.innerWidth < 768);
  const mockRef = useRef(null);

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let ws;
    const startMock = () => {
      setConn(false);
      setState(mockState());
      setPnlHist(mockPnlHistory());
      mockRef.current = setInterval(() => {
        setState(mockState());
        setPnlHist(prev => {
          const last = prev[prev.length-1]||{t:0,pnl:0};
          return [...prev.slice(-95), {t:last.t+1, pnl:Math.round((last.pnl+(Math.random()-.42)*35)*100)/100}];
        });
        if (Math.random() > 0.85) {
          const symbols = ["ETHUSDT","BTCUSDT","SOLUSDT"];
          const sym = symbols[Math.floor(Math.random()*symbols.length)];
          setAlerts(prev => [{
            id: Date.now(), type: Math.random()>.5?"trade":"signal",
            msg: Math.random()>.5 ? `New edge: ${sym} +${(Math.random()*8+6).toFixed(1)}%` : `TV signal: ${sym} momentum shift`,
            ts: new Date().toISOString(),
          }, ...prev.slice(0,9)]);
        }
      }, 3000);
    };
    try {
      ws = new WebSocket("ws://localhost:8765/ws");
      ws.onopen  = () => { setConn(true); clearInterval(mockRef.current); };
      ws.onmessage = e => { const m=JSON.parse(e.data); if(m.type==="agent_state") setState(m.data); };
      ws.onerror = () => startMock();
      ws.onclose = () => startMock();
    } catch { startMock(); }
    return () => { clearInterval(mockRef.current); ws?.close(); };
  }, []);

  if (!state) return (
    <div style={{background:C.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:C.accent,fontFamily:"monospace",fontSize:16,animation:"pulse 1.5s infinite"}}>
        NEURO initializing...
      </div>
    </div>
  );

  const {stats,win_rate,recent_trades=[],strategies=[],tv_signals={},accumulator={},ai_signal={},leaderboard=[]} = state;
  const pnlColor = (stats.daily_pnl_usdc||0)>=0 ? C.green : C.red;
  const tabs = mobile
    ? ["arena","trades","signals"]
    : ["arena","trades","strategies","signals","accumulator","ai"];

  return (
    <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif",fontSize:13}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes glow{0%,100%{box-shadow:0 0 8px ${C.accent}44}50%{box-shadow:0 0 20px ${C.accent}88}}
      `}</style>

      {/* Alert toasts */}
      <div style={{position:"fixed",top:70,right:16,zIndex:999,display:"flex",flexDirection:"column",gap:6}}>
        {alerts.slice(0,3).map(a => (
          <div key={a.id} style={{
            background:C.panel, border:`1px solid ${a.type==="trade"?C.green:C.purple}55`,
            borderRadius:6, padding:"8px 14px", fontSize:11, color:C.text,
            animation:"slideIn 0.3s ease", maxWidth:260,
          }}>
            <span style={{color:a.type==="trade"?C.green:C.purple,marginRight:6}}>
              {a.type==="trade"?"⚡":"📡"}
            </span>
            {a.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        background:C.panel, borderBottom:`1px solid ${C.border}`,
        padding:"0 16px", height:54, display:"flex", alignItems:"center", gap:16,
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{
            width:30,height:30,borderRadius:8,
            background:`linear-gradient(135deg,${C.accent},${C.purple})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:14,fontWeight:800,animation:"glow 3s infinite",
          }}>N</div>
          {!mobile && <span style={{fontWeight:700,fontSize:14,letterSpacing:1}}>NEURO</span>}
        </div>

        <div style={{display:"flex",gap:2,flex:1,overflowX:"auto"}}>
          {tabs.map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              background:tab===t?C.dim:"transparent",
              border:"none", color:tab===t?C.accent:C.muted,
              padding:"5px 12px", borderRadius:4, cursor:"pointer",
              fontSize:11, fontWeight:600, textTransform:"uppercase",
              letterSpacing:1, whiteSpace:"nowrap",
            }}>
              {t==="arena"?"🏟 Arena":t==="signals"?"📡 TV":t==="accumulator"?"💰 USDC":t==="ai"?"🤖 AI":t}
            </button>
          ))}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
          <StateOrb state={stats.state}/>
          <div style={{fontSize:10,color:connected?C.green:C.yellow}}>
            {connected?"● LIVE":"● DEMO"}
          </div>
        </div>
      </div>

      <div style={{padding:mobile?"12px":"20px",maxWidth:1600,margin:"0 auto"}}>

        {/* ── ARENA TAB ─────────────────────────────────────────────── */}
        {tab==="arena" && (
          <>
            {/* Top stats — mobile: 2 col, desktop: 6 col */}
            <div style={{
              display:"grid",
              gridTemplateColumns:mobile?"1fr 1fr":"repeat(6,1fr)",
              gap:10, marginBottom:16,
            }}>
              {[
                {label:"Daily PnL", value:`${(stats.daily_pnl_usdc||0)>=0?"+":""}$${(stats.daily_pnl_usdc||0).toFixed(2)}`, color:pnlColor, pulse:true},
                {label:"Win Rate", value:`${(win_rate||0).toFixed(1)}%`, color:(win_rate||0)>55?C.green:(win_rate||0)>45?C.yellow:C.red},
                {label:"Total Trades", value:stats.total_trades, sub:`${stats.active_positions} open`},
                {label:"Total PnL", value:`$${(stats.total_pnl_usdc||0).toFixed(0)}`, color:C.text},
                {label:"Cycle", value:`${Math.round(stats.last_cycle_ms||0)}ms`, color:C.accent},
                {label:"Uptime", value:`${Math.floor((stats.uptime_seconds||0)/3600)}h`, color:C.muted},
              ].map(({label,value,sub,color=C.text,pulse}) => (
                <div key={label} style={{
                  background:C.card, border:`1px solid ${C.border}`, borderRadius:8,
                  padding:"12px 16px", position:"relative",
                }}>
                  {pulse && <div style={{position:"absolute",top:10,right:10,width:6,height:6,borderRadius:"50%",background:color,animation:"pulse 2s infinite"}}/>}
                  <div style={{color:C.muted,fontSize:10,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>{label}</div>
                  <div style={{color,fontSize:mobile?18:22,fontWeight:700}}><Mono>{value}</Mono></div>
                  {sub && <div style={{color:C.muted,fontSize:10,marginTop:2}}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* PnL chart + Leaderboard */}
            <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 300px",gap:14,marginBottom:14}}>
              {/* PnL curve */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase"}}>PnL Curve (24h)</span>
                  <span style={{fontSize:12,color:pnlColor,fontWeight:600}}>
                    <Mono>{(stats.daily_pnl_usdc||0)>=0?"+":""}${(stats.daily_pnl_usdc||0).toFixed(2)}</Mono>
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={mobile?120:160}>
                  <AreaChart data={pnlHist}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={pnlColor} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={pnlColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" hide={!pnlHist.some(d=>d.label)} tick={{fill:C.muted,fontSize:9}}/>
                    <YAxis width={45} tick={{fill:C.muted,fontSize:9}} tickFormatter={v=>`$${v}`}/>
                    <Tooltip
                      contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:4,fontSize:11}}
                      formatter={v=>[`$${v.toFixed(2)}`,"PnL"]}/>
                    <ReferenceLine y={0} stroke={C.border} strokeDasharray="3 3"/>
                    <Area type="monotone" dataKey="pnl" stroke={pnlColor} strokeWidth={2} fill="url(#pnlGrad)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Leaderboard */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16}}>
                <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>
                  🏆 Season Leaderboard
                </div>
                {leaderboard.map((p,i) => (
                  <div key={p.name} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"8px 0",
                    borderBottom:i<leaderboard.length-1?`1px solid ${C.border}22`:"none",
                  }}>
                    <div style={{
                      width:24,height:24,borderRadius:4,flexShrink:0,
                      background:i===0?`linear-gradient(135deg,${C.yellow},${C.orange})`:C.dim,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,fontWeight:700,color:i===0?C.bg:C.muted,
                    }}>
                      {p.badge||p.rank}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{
                        fontSize:12,fontWeight:p.name==="NEURO"?700:400,
                        color:p.name==="NEURO"?C.accent:C.text,
                      }}>{p.name}</div>
                      <div style={{fontSize:10,color:C.muted}}>{p.trades} trades · {p.win_rate.toFixed(0)}% wr</div>
                    </div>
                    <div style={{color:C.green,fontWeight:600,fontSize:12}}>
                      <Mono>+${p.pnl.toLocaleString()}</Mono>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy performance bars */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:16,marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:12}}>
                Strategy Performance
              </div>
              <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(6,1fr)",gap:8}}>
                {strategies.map(s => {
                  const color = STRAT_COLORS[s.name]||C.accent;
                  const pnlPos = (s.pnl_today||0)>=0;
                  return (
                    <div key={s.name} style={{
                      background:C.dim, borderRadius:6, padding:"10px 12px",
                      borderTop:`2px solid ${color}`,
                    }}>
                      <div style={{fontSize:10,color,fontWeight:600,marginBottom:6,
                        textOverflow:"ellipsis",overflow:"hidden",whiteSpace:"nowrap"}}>
                        {s.name.replace(/_/g," ").toUpperCase()}
                      </div>
                      <div style={{color:pnlPos?C.green:C.red,fontWeight:700,fontSize:14}}>
                        <Mono>{pnlPos?"+":""}${(s.pnl_today||0).toFixed(0)}</Mono>
                      </div>
                      <div style={{color:C.muted,fontSize:10,marginTop:3}}>
                        {s.trades_today} trades · {(s.win_rate||0).toFixed(0)}% wr
                      </div>
                      <div style={{
                        marginTop:6,height:3,borderRadius:2,background:C.border,
                        position:"relative",overflow:"hidden",
                      }}>
                        <div style={{
                          position:"absolute",left:0,top:0,height:"100%",
                          width:`${Math.min((s.win_rate||50),100)}%`,
                          background:color, borderRadius:2,
                        }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI commentary */}
            {ai_signal?.commentary && (
              <div style={{
                background:C.dim, border:`1px solid ${C.purple}44`,
                borderRadius:8, padding:"12px 16px",
                display:"flex",gap:10,alignItems:"flex-start",
              }}>
                <span style={{fontSize:16,flexShrink:0}}>🤖</span>
                <div>
                  <div style={{fontSize:10,color:C.purple,fontWeight:600,marginBottom:4,letterSpacing:1}}>
                    GPT-4o MARKET COMMENTARY
                  </div>
                  <div style={{color:C.text,fontSize:12,lineHeight:1.6}}>{ai_signal.commentary}</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TRADES TAB ────────────────────────────────────────────── */}
        {tab==="trades" && (
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8}}>
            <div style={{
              display:"grid",
              gridTemplateColumns:mobile?"80px 1fr 50px 60px":"80px 1fr 60px 60px 70px 70px 70px",
              gap:8, padding:"8px 12px",
              borderBottom:`1px solid ${C.border}`,
              fontSize:9,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",
            }}>
              <div>Strategy</div><div>Symbol</div><div>Side</div>
              <div>Size</div>{!mobile&&<><div>Status</div><div>AI</div></>}<div>PnL</div>
            </div>
            <div style={{maxHeight:"70vh",overflowY:"auto"}}>
              {[...recent_trades].reverse().map(t => {
                const sc = STRAT_COLORS[t.strategy]||C.accent;
                const pnlC = (t.pnl??0)>=0?C.green:C.red;
                return (
                  <div key={t.id} style={{
                    display:"grid",
                    gridTemplateColumns:mobile?"80px 1fr 50px 60px":"80px 1fr 60px 60px 70px 70px 70px",
                    gap:8, padding:"7px 12px",
                    borderBottom:`1px solid ${C.border}11`,fontSize:11,alignItems:"center",
                  }}>
                    <div style={{color:sc,fontSize:9,letterSpacing:0.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {t.strategy.replace("crypto_","").replace("polymarket_","pm_").toUpperCase()}
                    </div>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}><Mono>{t.symbol}</Mono></div>
                    <div style={{color:t.side==="buy"||t.side==="yes"?C.green:C.red,fontWeight:600}}>{t.side.toUpperCase()}</div>
                    <div style={{color:C.muted}}><Mono>${t.size_usdc}</Mono></div>
                    {!mobile && <>
                      <div style={{color:t.status==="open"?C.yellow:C.muted}}>{t.status}</div>
                      <div style={{color:t.ai_conviction>.7?C.green:t.ai_conviction>.5?C.yellow:C.red,fontSize:10}}>
                        {t.ai_conviction ? `${Math.round(t.ai_conviction*100)}%` : "–"}
                      </div>
                    </>}
                    <div style={{color:pnlC,fontWeight:t.pnl!==null?600:400}}>
                      {t.pnl!==null?<Mono>{t.pnl>=0?"+":""}{t.pnl.toFixed(2)}</Mono>:"–"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TV SIGNALS TAB ────────────────────────────────────────── */}
        {tab==="signals" && (
          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
            {Object.entries(tv_signals).map(([sym,sig]) => {
              const tColor = sig.trend==="bull"?C.green:sig.trend==="bear"?C.red:C.muted;
              const conf = Math.round((sig.confidence||0)*100);
              return (
                <div key={sym} style={{background:C.card,border:`1px solid ${tColor}44`,borderRadius:8,padding:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
                    <span style={{fontWeight:700,fontSize:18}}><Mono>{sym}</Mono></span>
                    <span style={{color:tColor,fontWeight:700,fontSize:16}}>
                      {sig.trend==="bull"?"▲":sig.trend==="bear"?"▼":"●"} {sig.trend.toUpperCase()}
                    </span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    {[
                      ["Price",`$${(sig.price||0).toLocaleString()}`,C.text],
                      ["Confidence",`${conf}%`,conf>70?C.green:C.yellow],
                      ["RSI",`${(sig.rsi||50).toFixed(1)}`,sig.rsi>65?C.red:sig.rsi<35?C.green:C.text],
                      ["Momentum",`${(sig.momentum_bias||0).toFixed(2)}`,sig.momentum_bias>0?C.green:C.red],
                      ["Source",(sig.signal_source||"").replace("tradingview-","tv-"),C.muted],
                    ].map(([l,v,c])=>(
                      <div key={l} style={{background:C.dim,borderRadius:4,padding:"8px 10px"}}>
                        <div style={{fontSize:9,color:C.muted,marginBottom:2,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                        <div style={{fontSize:12,color:c||C.text,fontWeight:600}}><Mono>{v}</Mono></div>
                      </div>
                    ))}
                  </div>
                  {/* Confidence bar */}
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${conf}%`,background:tColor,borderRadius:2}}/>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── STRATEGIES TAB (desktop only) ─────────────────────────── */}
        {tab==="strategies" && !mobile && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {strategies.map(s => {
              const color = STRAT_COLORS[s.name]||C.accent;
              return (
                <div key={s.name} style={{
                  background:C.card,border:`1px solid ${C.border}`,
                  borderLeft:`4px solid ${color}`,borderRadius:8,padding:18,
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                    <span style={{fontWeight:700,fontSize:13,color}}>{s.name.replace(/_/g," ").toUpperCase()}</span>
                    <Badge label={s.enabled?"LIVE":"OFF"} color={s.enabled?C.green:C.red}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {Object.entries(s).filter(([k])=>!["name","enabled"].includes(k)).map(([k,v])=>(
                      <div key={k} style={{background:C.dim,borderRadius:4,padding:"8px 10px"}}>
                        <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:2}}>{k.replace(/_/g," ")}</div>
                        <div style={{fontSize:12,color:C.text}}><Mono>{Array.isArray(v)?v.join(", "):String(v)}</Mono></div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ACCUMULATOR TAB ───────────────────────────────────────── */}
        {tab==="accumulator" && !mobile && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>
                💰 USDC Accumulator
              </div>
              <div style={{
                background:`linear-gradient(135deg,${C.green}11,${C.accent}11)`,
                border:`1px solid ${C.green}44`, borderRadius:8, padding:20, marginBottom:16,
              }}>
                <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Current Balance</div>
                <div style={{fontSize:36,fontWeight:800,color:C.green}}>
                  <Mono>${(accumulator.balance_usdc||0).toFixed(2)}</Mono>
                </div>
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                  Total received: <Mono style={{color:C.text}}>${(accumulator.total_received||0).toFixed(2)}</Mono>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["Flush Hour","11:00 PM UTC"],
                  ["Next Flush", new Date(accumulator.next_flush||Date.now()).toLocaleTimeString()],
                  ["Mode", accumulator.dry_run?"Dry Run":"LIVE"],
                  ["Min Flush","$100 USDC"],
                ].map(([l,v])=>(
                  <div key={l} style={{background:C.dim,borderRadius:4,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:12,color:C.text}}><Mono>{v}</Mono></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>
                Why This Fixes Your Bank Problem
              </div>
              {[
                ["Before","80 × $40 deposits/day","Looks like structuring → SAR flag → account freeze"],
                ["After","1 × $3,200 deposit/day","Normal trader behavior → no flag"],
              ].map(([label,was,result]) => (
                <div key={label} style={{
                  background:C.dim,borderRadius:6,padding:14,marginBottom:10,
                  borderLeft:`3px solid ${label==="After"?C.green:C.red}`,
                }}>
                  <div style={{fontSize:10,fontWeight:600,color:label==="After"?C.green:C.red,marginBottom:6,letterSpacing:1}}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:4}}><Mono>{was}</Mono></div>
                  <div style={{fontSize:11,color:C.muted}}>{result}</div>
                </div>
              ))}
              <div style={{background:C.dim,borderRadius:6,padding:12,marginTop:6,fontSize:11,color:C.muted,lineHeight:1.7}}>
                Bridge: Polygon → Ethereum via Across Protocol<br/>
                Fee: ~0.1% + gas (~$2-4 per flush)<br/>
                Tax: unchanged — 80 trades still on your books
              </div>
            </div>
          </div>
        )}

        {/* ── AI TAB ────────────────────────────────────────────────── */}
        {tab==="ai" && !mobile && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>
                🤖 GPT-4o Signal Layer
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[
                  ["Model","GPT-4o",C.accent],
                  ["Status",ai_signal.enabled?"Active":"Disabled",ai_signal.enabled?C.green:C.red],
                  ["API Calls",ai_signal.calls||0,C.text],
                  ["Cost Today",`$${(ai_signal.cost_usd||0).toFixed(4)}`,C.yellow],
                ].map(([l,v,c])=>(
                  <div key={l} style={{background:C.dim,borderRadius:4,padding:"10px 12px"}}>
                    <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{l}</div>
                    <div style={{fontSize:14,color:c,fontWeight:600}}><Mono>{v}</Mono></div>
                  </div>
                ))}
              </div>
              <div style={{background:C.dim,borderRadius:6,padding:14,border:`1px solid ${C.purple}33`}}>
                <div style={{fontSize:10,color:C.purple,fontWeight:600,marginBottom:8,letterSpacing:1}}>CURRENT COMMENTARY</div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.8}}>{ai_signal.commentary}</div>
              </div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:C.muted,letterSpacing:1.5,textTransform:"uppercase",marginBottom:16}}>
                What the AI Layer Does
              </div>
              {[
                ["Signal Validator","Reviews every trade opportunity before execution. Scores conviction 0–1. Trades below 0.5 are skipped, 0.5–0.7 get reduced size."],
                ["Edge Scorer","Asks GPT-4o: is this edge real or noise? Returns a multiplier that adjusts position sizing."],
                ["Market Narrator","Generates 2-3 sentence market commentary every 5 minutes based on agent state + TV signals."],
              ].map(([title,desc]) => (
                <div key={title} style={{background:C.dim,borderRadius:6,padding:14,marginBottom:10}}>
                  <div style={{fontSize:11,color:C.purple,fontWeight:600,marginBottom:6}}>{title}</div>
                  <div style={{fontSize:11,color:C.muted,lineHeight:1.6}}>{desc}</div>
                </div>
              ))}
              <div style={{
                background:C.dim,borderRadius:6,padding:12,marginTop:6,
                border:`1px solid ${C.yellow}33`,
              }}>
                <div style={{fontSize:10,color:C.yellow,fontWeight:600,marginBottom:4}}>SETUP</div>
                <div style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>
                  OPENAI_API_KEY=sk-... python main.py
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
