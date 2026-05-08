import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bg:       "#080c10",
  panel:    "#0d1117",
  border:   "#1a2332",
  accent:   "#00e5ff",
  green:    "#00ff9d",
  red:      "#ff3b5c",
  yellow:   "#ffc940",
  purple:   "#b47cff",
  text:     "#c9d1d9",
  muted:    "#4a5568",
  dim:      "#1e2d3d",
};

const STRATEGY_COLORS = {
  polymarket_mispricing:  "#00e5ff",
  crypto_momentum:        "#00ff9d",
  crypto_mean_reversion:  "#ffc940",
  tv_signal_follower:     "#b47cff",
};

const TREND_ICON  = { bull: "▲", bear: "▼", neutral: "●" };
const TREND_COLOR = { bull: C.green, bear: C.red, neutral: C.muted };

// ─── Mock data generator (used when API is not running) ───────────────────────
function generateMockState() {
  const now = Date.now();
  const trades = Array.from({ length: 30 }, (_, i) => {
    const strategies = ["polymarket_mispricing","crypto_momentum","crypto_mean_reversion","tv_signal_follower"];
    const symbols    = ["ETHUSDT","BTCUSDT","SOLUSDT","ETH > $3200?","BTC < $65k?"];
    const strategy   = strategies[i % strategies.length];
    const pnl        = (Math.random() - 0.38) * 80;
    return {
      id:          `t${i.toString(16)}`,
      strategy,
      symbol:      symbols[Math.floor(Math.random() * symbols.length)],
      side:        Math.random() > 0.5 ? "buy" : "sell",
      size_usdc:   Math.round(Math.random() * 150 + 30),
      entry_price: Math.random() * 3000 + 1500,
      pnl:         i < 20 ? pnl : null,
      status:      i < 20 ? "closed" : "open",
      source:      strategy.includes("poly") ? "polymarket" : "crypto",
      timestamp:   new Date(now - (30 - i) * 180000).toISOString(),
    };
  });

  const closedTrades = trades.filter(t => t.status === "closed");
  const totalPnl     = closedTrades.reduce((s, t) => s + (t.pnl || 0), 0);
  const winners      = closedTrades.filter(t => (t.pnl || 0) > 0).length;

  return {
    stats: {
      total_trades:     trades.length,
      winning_trades:   winners,
      total_pnl_usdc:   totalPnl,
      daily_pnl_usdc:   totalPnl * 0.4,
      active_positions: 10,
      last_cycle_ms:    Math.random() * 800 + 200,
      uptime_seconds:   7200 + Math.random() * 1000,
      scan_count:       240 + Math.floor(Math.random() * 10),
      state:            ["scanning","analyzing","executing","cooldown"][Math.floor(Math.random()*4)],
    },
    win_rate: (winners / Math.max(closedTrades.length, 1)) * 100,
    recent_trades: trades,
    strategies: [
      { name: "polymarket_mispricing",  enabled: true,  threshold_pct: 6,   markets_cached: 14 },
      { name: "crypto_momentum",        enabled: true,  min_rsi: 55,        pairs: ["ETHUSDT","BTCUSDT","SOLUSDT"] },
      { name: "crypto_mean_reversion",  enabled: true,  bb_period: 20,      bb_std: 2.0 },
      { name: "tv_signal_follower",     enabled: true,  signals_received: 6, trades_taken: 4 },
    ],
    tv_signals: {
      ETHUSDT: { trend: "bull",    confidence: 0.78, momentum_bias:  0.62, rsi: 61.3, price: 3247.5, signal_source: "tradingview-mcp" },
      BTCUSDT: { trend: "neutral", confidence: 0.54, momentum_bias:  0.12, rsi: 51.8, price: 62140,  signal_source: "tradingview-mcp" },
      SOLUSDT: { trend: "bear",    confidence: 0.71, momentum_bias: -0.55, rsi: 38.2, price: 142.3,  signal_source: "tradingview-mcp" },
    },
    timestamp: new Date().toISOString(),
  };
}

function generateMockPnl() {
  let pnl = 0;
  return Array.from({ length: 48 }, (_, i) => {
    pnl += (Math.random() - 0.42) * 40;
    return { t: i, pnl: Math.round(pnl * 100) / 100 };
  });
}

// ─── Utility components ───────────────────────────────────────────────────────
const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", ...style }}>{children}</span>
);

function StatCard({ label, value, sub, color = C.text, pulse }) {
  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "16px 20px", position: "relative", overflow: "hidden",
    }}>
      {pulse && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 8, height: 8, borderRadius: "50%", background: color,
          animation: "pulse 2s infinite",
        }} />
      )}
      <div style={{ color: C.muted, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
        <Mono>{value}</Mono>
      </div>
      {sub && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function StateTag({ state }) {
  const colorMap = {
    scanning: C.accent, analyzing: C.yellow, executing: C.green,
    cooldown: C.muted, paused: C.yellow, stopped: C.red, booting: C.purple,
  };
  const color = colorMap[state] || C.muted;
  return (
    <span style={{
      background: color + "22", border: `1px solid ${color}55`,
      color, borderRadius: 4, padding: "2px 8px", fontSize: 11,
      textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600,
    }}>
      <Mono>{state}</Mono>
    </span>
  );
}

function TVSignalCard({ symbol, signal }) {
  const trend = signal.trend || "neutral";
  const color = TREND_COLOR[trend];
  const conf  = Math.round((signal.confidence || 0) * 100);
  return (
    <div style={{
      background: C.dim, border: `1px solid ${color}44`,
      borderRadius: 6, padding: "10px 14px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: C.text, fontWeight: 600, fontSize: 13 }}><Mono>{symbol}</Mono></span>
        <span style={{ color, fontSize: 13, fontWeight: 700 }}>
          {TREND_ICON[trend]} {trend.toUpperCase()}
        </span>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: C.muted }}>
        <span>Conf: <span style={{ color: conf > 70 ? C.green : C.yellow }}>{conf}%</span></span>
        <span>RSI: <Mono>{(signal.rsi || 50).toFixed(1)}</Mono></span>
        <span>Price: <Mono style={{ color: C.text }}>${(signal.price || 0).toLocaleString()}</Mono></span>
      </div>
      <div style={{ marginTop: 4, fontSize: 10, color: C.muted }}>
        ↪ {signal.signal_source || "tradingview-mcp"}
      </div>
    </div>
  );
}

function TradeRow({ trade }) {
  const color     = (trade.pnl ?? 0) >= 0 ? C.green : C.red;
  const stratColor = STRATEGY_COLORS[trade.strategy] || C.accent;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "80px 1fr 60px 60px 70px 70px",
      gap: 8, padding: "8px 12px", borderBottom: `1px solid ${C.border}22`,
      fontSize: 11, alignItems: "center",
    }}>
      <div style={{ color: stratColor, fontSize: 10, letterSpacing: 0.5 }}>
        {trade.strategy.replace("crypto_","").replace("polymarket_","poly_").toUpperCase().slice(0,12)}
      </div>
      <div style={{ color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <Mono>{trade.symbol}</Mono>
      </div>
      <div style={{ color: trade.side === "buy" || trade.side === "yes" ? C.green : C.red, fontWeight: 600 }}>
        {trade.side.toUpperCase()}
      </div>
      <div style={{ color: C.muted }}><Mono>${trade.size_usdc}</Mono></div>
      <div style={{ color: trade.status === "open" ? C.yellow : C.muted }}>
        {trade.status}
      </div>
      <div style={{ color, fontWeight: trade.pnl !== null ? 600 : 400 }}>
        {trade.pnl !== null ? <Mono>{trade.pnl >= 0 ? "+" : ""}{trade.pnl.toFixed(2)}</Mono> : "–"}
      </div>
    </div>
  );
}

function StrategyCard({ strategy }) {
  const color = STRATEGY_COLORS[strategy.name] || C.accent;
  const name  = strategy.name.replace(/_/g, " ");
  return (
    <div style={{
      background: C.dim, border: `1px solid ${color}33`,
      borderRadius: 6, padding: "10px 14px",
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: C.text, fontSize: 12, fontWeight: 600 }}>{name}</span>
        <span style={{
          fontSize: 10, padding: "1px 6px", borderRadius: 3,
          background: strategy.enabled ? C.green + "22" : C.red + "22",
          color: strategy.enabled ? C.green : C.red,
        }}>
          {strategy.enabled ? "LIVE" : "OFF"}
        </span>
      </div>
      <div style={{ fontSize: 10, color: C.muted }}>
        {Object.entries(strategy)
          .filter(([k]) => !["name","enabled"].includes(k))
          .map(([k, v]) => (
            <span key={k} style={{ marginRight: 12 }}>
              {k.replace(/_/g," ")}: <Mono style={{ color: C.text }}>{Array.isArray(v) ? v.join(",") : String(v)}</Mono>
            </span>
          ))}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [state, setState]       = useState(null);
  const [pnlHistory, setPnlHistory] = useState([]);
  const [connected, setConnected]   = useState(false);
  const [activeTab, setActiveTab]   = useState("overview");
  const wsRef       = useRef(null);
  const mockInterval = useRef(null);

  useEffect(() => {
    let ws;
    let useMock = false;

    function startMock() {
      useMock = true;
      setConnected(false);
      setState(generateMockState());
      setPnlHistory(generateMockPnl());
      mockInterval.current = setInterval(() => {
        setState(generateMockState());
        setPnlHistory(prev => {
          const last = prev[prev.length - 1] || { t: 0, pnl: 0 };
          const next = { t: last.t + 1, pnl: Math.round((last.pnl + (Math.random()-0.42)*40)*100)/100 };
          return [...prev.slice(-47), next];
        });
      }, 3000);
    }

    try {
      ws = new WebSocket("ws://localhost:8765/ws");
      wsRef.current = ws;
      ws.onopen    = () => { setConnected(true); clearInterval(mockInterval.current); };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "agent_state") setState(msg.data);
      };
      ws.onerror = () => startMock();
      ws.onclose = () => { if (!useMock) startMock(); };
    } catch { startMock(); }

    return () => {
      clearInterval(mockInterval.current);
      ws?.close();
    };
  }, []);

  if (!state) return (
    <div style={{ background: C.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, fontFamily: "monospace", fontSize: 18 }}>initializing agent...</div>
    </div>
  );

  const { stats, win_rate, recent_trades = [], strategies = [], tv_signals = {} } = state;
  const pnlColor = (stats.daily_pnl_usdc || 0) >= 0 ? C.green : C.red;
  const tabs = ["overview", "trades", "strategies", "tradingview"];

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.4); } }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 24, height: 56,
        background: C.panel,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
          }}>⬡</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.5 }}>ALPHA BOT</span>
        </div>

        <div style={{ display: "flex", gap: 2, flex: 1 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: activeTab === t ? C.dim : "transparent",
              border: "none", color: activeTab === t ? C.accent : C.muted,
              padding: "6px 16px", borderRadius: 4, cursor: "pointer",
              fontSize: 12, fontWeight: 500, textTransform: "uppercase",
              letterSpacing: 1, transition: "all 0.15s",
            }}>
              {t === "tradingview" ? "📡 TV MCP" : t}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StateTag state={stats.state} />
          <div style={{ fontSize: 11, color: C.muted }}>
            <span style={{ color: connected ? C.green : C.yellow }}>●</span>{" "}
            {connected ? "LIVE" : "DEMO"}
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            {Math.floor((stats.uptime_seconds || 0) / 3600)}h{" "}
            {Math.floor(((stats.uptime_seconds || 0) % 3600) / 60)}m
          </div>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto" }}>

        {/* ─── Overview Tab ─────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
              <StatCard
                label="Daily PnL"
                value={`${(stats.daily_pnl_usdc || 0) >= 0 ? "+" : ""}$${(stats.daily_pnl_usdc || 0).toFixed(2)}`}
                color={pnlColor} pulse
              />
              <StatCard
                label="Total PnL"
                value={`${(stats.total_pnl_usdc || 0) >= 0 ? "+" : ""}$${(stats.total_pnl_usdc || 0).toFixed(2)}`}
                color={C.text}
              />
              <StatCard
                label="Win Rate"
                value={`${(win_rate || 0).toFixed(1)}%`}
                sub={`${stats.winning_trades}/${stats.total_trades - stats.active_positions} closed`}
                color={(win_rate || 0) > 55 ? C.green : (win_rate || 0) > 45 ? C.yellow : C.red}
              />
              <StatCard
                label="Total Trades"
                value={stats.total_trades}
                sub={`${stats.active_positions} open`}
              />
              <StatCard
                label="Cycle Time"
                value={`${Math.round(stats.last_cycle_ms || 0)}ms`}
                sub={`scan #${stats.scan_count}`}
                color={C.accent}
              />
              <StatCard
                label="TV Signals"
                value={Object.keys(tv_signals).length}
                sub="active feeds"
                color={C.purple}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 16 }}>
              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
                  Daily PnL Curve
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={pnlHistory}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={C.accent} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="t" hide />
                    <YAxis width={50} tick={{ fill: C.muted, fontSize: 10 }} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4 }}
                      labelStyle={{ color: C.muted, fontSize: 10 }}
                      formatter={v => [`$${v.toFixed(2)}`, "PnL"]}
                    />
                    <ReferenceLine y={0} stroke={C.border} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="pnl" stroke={C.accent} strokeWidth={2} fill="url(#pnlGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                  📡 TradingView Signals
                </div>
                {Object.entries(tv_signals).length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 12, textAlign: "center", paddingTop: 40 }}>
                    No signals — connect tradingview-mcp
                  </div>
                ) : (
                  Object.entries(tv_signals).map(([sym, sig]) => (
                    <TVSignalCard key={sym} symbol={sym} signal={sig} />
                  ))
                )}
              </div>
            </div>

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                Strategy Status
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {strategies.map(s => <StrategyCard key={s.name} strategy={s} />)}
              </div>
            </div>
          </>
        )}

        {/* ─── Trades Tab ───────────────────────────────────────────── */}
        {activeTab === "trades" && (
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "80px 1fr 60px 60px 70px 70px",
              gap: 8, padding: "10px 12px",
              borderBottom: `1px solid ${C.border}`,
              fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase",
            }}>
              <div>Strategy</div><div>Symbol</div><div>Side</div>
              <div>Size</div><div>Status</div><div>PnL</div>
            </div>
            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              {[...recent_trades].reverse().map(t => <TradeRow key={t.id} trade={t} />)}
            </div>
          </div>
        )}

        {/* ─── Strategies Tab ───────────────────────────────────────── */}
        {activeTab === "strategies" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {strategies.map(s => (
              <div key={s.name} style={{
                background: C.panel, border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${STRATEGY_COLORS[s.name] || C.accent}`,
                borderRadius: 8, padding: 20,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: STRATEGY_COLORS[s.name] || C.accent }}>
                    {s.name.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                    background: s.enabled ? C.green + "22" : C.red + "22",
                    color: s.enabled ? C.green : C.red,
                  }}>
                    {s.enabled ? "LIVE" : "DISABLED"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(s).filter(([k]) => !["name","enabled"].includes(k)).map(([k, v]) => (
                    <div key={k} style={{ background: C.dim, borderRadius: 4, padding: "8px 12px" }}>
                      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>{k.replace(/_/g," ")}</div>
                      <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>
                        <Mono>{Array.isArray(v) ? v.join(", ") : String(v)}</Mono>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── TradingView MCP Tab ──────────────────────────────────── */}
        {activeTab === "tradingview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
                📡 Live TradingView Signals
              </div>
              {Object.entries(tv_signals).map(([sym, sig]) => {
                const trend = sig.trend || "neutral";
                const color = TREND_COLOR[trend];
                return (
                  <div key={sym} style={{
                    background: C.dim, border: `1px solid ${color}44`,
                    borderRadius: 8, padding: 16, marginBottom: 12,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}><Mono>{sym}</Mono></span>
                      <span style={{ color, fontWeight: 700, fontSize: 16 }}>{TREND_ICON[trend]} {trend.toUpperCase()}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        ["Price",      `$${(sig.price||0).toLocaleString()}`],
                        ["Confidence", `${Math.round((sig.confidence||0)*100)}%`],
                        ["RSI",        (sig.rsi||50).toFixed(1)],
                        ["Momentum",   (sig.momentum_bias||0).toFixed(2)],
                        ["EMA Cross",  sig.ema_cross || "none"],
                        ["Source",     (sig.signal_source||"").replace("tradingview-","tv-")],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: C.panel, borderRadius: 4, padding: "8px 10px" }}>
                          <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{label}</div>
                          <div style={{ fontSize: 12, color: C.text }}><Mono>{val}</Mono></div>
                        </div>
                      ))}
                    </div>
                    {sig.pine_labels?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>Pine Labels</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {sig.pine_labels.map((l, i) => (
                            <span key={i} style={{
                              background: C.purple + "22", border: `1px solid ${C.purple}44`,
                              color: C.purple, borderRadius: 3, padding: "2px 8px", fontSize: 10,
                            }}>{l}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {Object.keys(tv_signals).length === 0 && (
                <div style={{ color: C.muted, textAlign: "center", padding: 40, fontSize: 13 }}>
                  No signals yet
                </div>
              )}
            </div>

            <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
                Setup Guide
              </div>
              {[
                ["1", "Clone tradingview-mcp",      "git clone https://github.com/tradesdontlie/tradingview-mcp"],
                ["2", "Install deps",               "cd tradingview-mcp && npm install"],
                ["3", "Launch TradingView with CDP","./scripts/launch_tv_debug_mac.sh"],
                ["4", "Start MCP server",           "node src/server.js"],
                ["5", "Start this bot",             "python main.py --demo"],
                ["6", "Start TV bridge",            "python connectors/tv_mcp_bridge.py"],
              ].map(([step, title, cmd]) => (
                <div key={step} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: C.accent + "22", border: `1px solid ${C.accent}55`,
                    color: C.accent, fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{step}</div>
                  <div>
                    <div style={{ fontSize: 12, color: C.text, marginBottom: 4 }}>{title}</div>
                    <div style={{
                      background: C.bg, border: `1px solid ${C.border}`,
                      borderRadius: 4, padding: "4px 10px", fontSize: 11, color: C.green,
                    }}>
                      <Mono>{cmd}</Mono>
                    </div>
                  </div>
                </div>
              ))}

              <div style={{
                marginTop: 16, background: C.dim, borderRadius: 6, padding: 14,
                border: `1px solid ${C.purple}33`,
              }}>
                <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 6 }}>
                  What the bridge reads from TradingView
                </div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.8 }}>
                  • chart_get_state → symbol, timeframe, indicators<br />
                  • data_get_study_values → RSI, MACD, EMA values<br />
                  • data_get_pine_labels → support/resistance text<br />
                  • data_get_pine_lines → key price levels<br />
                  • quote_get → live price feed<br />
                  • capture_screenshot → visual AI analysis
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
