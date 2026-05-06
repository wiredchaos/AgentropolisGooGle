import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

const C = {
  bg:     "#04070c",
  panel:  "#080f18",
  card:   "#0c1522",
  border: "#172233",
  accent: "#00e5ff",
  green:  "#00ff9d",
  red:    "#ff3055",
  yellow: "#ffcc00",
  purple: "#9d6fff",
  orange: "#ff8c42",
  text:   "#ccd8e8",
  muted:  "#3d5066",
  dim:    "#101c2a",
};

const SEGMENT_COLORS = {
  btc_5m:   "#f7931a",
  eth_5m:   "#627eea",
  btc_15m:  "#f7931a88",
  eth_15m:  "#627eea88",
  sol_5m:   "#9945ff",
  sol_15m:  "#9945ff88",
  funding:  C.orange,
  liq_hunt: C.red,
};

const SEGMENT_LABELS = {
  btc_5m:   "BTC 5m",
  eth_5m:   "ETH 5m",
  btc_15m:  "BTC 15m",
  eth_15m:  "ETH 15m",
  sol_5m:   "SOL 5m",
  sol_15m:  "SOL 15m",
  funding:  "Funding Arb",
  liq_hunt: "Liq Hunt",
};

const Mono = ({ children, style }) => (
  <span style={{ fontFamily: "'JetBrains Mono',monospace", ...style }}>{children}</span>
);

// ─── Mock data generators ─────────────────────────────────────────────────────

function mockFarmState() {
  const segments = Object.keys(SEGMENT_LABELS);
  const workers  = segments.map((seg, i) => ({
    id:                 `w_${seg.replace("_", "")}${i}`,
    segment:            seg,
    status:             Math.random() > 0.1 ? "active" : "connecting",
    trades_today:       Math.floor(Math.random() * 80 + 20),
    pnl_today:          (Math.random() - 0.3) * 400,
    active_positions:   Math.floor(Math.random() * 8 + 1),
    last_heartbeat_ago: Math.random() * 10,
  }));

  const totalPnl    = workers.reduce((s, w) => s + w.pnl_today, 0);
  const totalTrades = workers.reduce((s, w) => s + w.trades_today, 0);

  return {
    stats: {
      total_workers:      workers.length,
      active_workers:     workers.filter(w => w.status === "active").length,
      total_trades:       totalTrades,
      daily_pnl:          totalPnl,
      total_pnl:          totalPnl * 7.3,
      active_positions:   workers.reduce((s, w) => s + w.active_positions, 0),
      opportunities_seen:   totalTrades * 8,
      opportunities_taken:  totalTrades,
      uptime:             172800 + Math.random() * 1000,
    },
    workers: Object.fromEntries(workers.map(w => [w.id, w])),
    capital: {
      total: 5000,
      allocations: {
        btc_5m: 1250, eth_5m: 1250, btc_15m: 1000, eth_15m: 1000,
        sol_5m:  750, sol_15m:  750, funding:  500, liq_hunt:  500,
      },
    },
    recent_trades: Array.from({ length: 20 }, (_, i) => ({
      id:         `t${i}`,
      worker_id:  workers[i % workers.length].id,
      segment:    segments[i % segments.length],
      strategy:   `polymarket_${segments[i % 4]}`,
      side:       Math.random() > 0.5 ? "yes" : "no",
      size_usdc:  Math.round(Math.random() * 120 + 20),
      edge_score: Math.random() * 0.12 + 0.06,
      timestamp:  Date.now() - (20 - i) * 180000,
    })),
    timestamp: new Date().toISOString(),
  };
}

function mockPnl() {
  let v = 0;
  return Array.from({ length: 48 }, (_, i) => {
    v += (Math.random() - 0.4) * 80;
    return { t: i, pnl: Math.round(v * 100) / 100 };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WorkerCard({ worker }) {
  const color  = SEGMENT_COLORS[worker.segment] || C.accent;
  const alive  = worker.status === "active" && worker.last_heartbeat_ago < 30;
  const pnlPos = worker.pnl_today >= 0;
  return (
    <div style={{
      background: C.card, borderRadius: 8, padding: "12px 14px",
      border: `1px solid ${alive ? color + "44" : C.border}`,
      borderTop: `2px solid ${alive ? color : C.muted}`,
      opacity: alive ? 1 : 0.6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {SEGMENT_LABELS[worker.segment] || worker.segment}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: alive ? C.green : C.muted,
            animation: alive ? "workerPulse 2s infinite" : "none",
          }} />
          <span style={{ fontSize: 9, color: alive ? C.green : C.muted, letterSpacing: 1 }}>
            {alive ? "LIVE" : "DEAD"}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: pnlPos ? C.green : C.red, marginBottom: 4 }}>
        <Mono>{pnlPos ? "+" : ""}${worker.pnl_today.toFixed(2)}</Mono>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.muted }}>
        <span>{worker.trades_today} trades</span>
        <span>{worker.active_positions} open</span>
        <span style={{ color: C.muted, fontSize: 9 }}>{worker.last_heartbeat_ago.toFixed(0)}s ago</span>
      </div>
      <div style={{
        marginTop: 8, fontSize: 9, color: C.muted, fontFamily: "monospace",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {worker.id}
      </div>
    </div>
  );
}

function CapitalBar({ segment, allocated, total }) {
  const color = SEGMENT_COLORS[segment] || C.accent;
  const pct   = (allocated / total) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 70, fontSize: 10, color, textAlign: "right", flexShrink: 0 }}>
        {SEGMENT_LABELS[segment] || segment}
      </div>
      <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3 }} />
      </div>
      <div style={{ width: 50, fontSize: 10, color: C.text, fontFamily: "monospace", textAlign: "right", flexShrink: 0 }}>
        ${allocated}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FarmDashboard() {
  const [farm, setFarm]   = useState(null);
  const [pnlH, setPnlH]  = useState([]);
  const [conn, setConn]  = useState(false);
  const mockRef          = useRef(null);

  useEffect(() => {
    let ws;
    const startMock = () => {
      setConn(false);
      setFarm(mockFarmState());
      setPnlH(mockPnl());
      mockRef.current = setInterval(() => {
        setFarm(mockFarmState());
        setPnlH(p => {
          const last = p[p.length - 1] || { t: 0, pnl: 0 };
          return [
            ...p.slice(-47),
            { t: last.t + 1, pnl: Math.round((last.pnl + (Math.random() - 0.4) * 80) * 100) / 100 },
          ];
        });
      }, 4000);
    };

    try {
      ws             = new WebSocket("ws://localhost:8765/ws/dashboard");
      ws.onopen      = () => { setConn(true); clearInterval(mockRef.current); };
      ws.onmessage   = e => { const m = JSON.parse(e.data); if (m.type === "farm_state") setFarm(m.data); };
      ws.onerror     = () => startMock();
      ws.onclose     = () => startMock();
    } catch { startMock(); }

    return () => { clearInterval(mockRef.current); ws?.close(); };
  }, []);

  if (!farm) return (
    <div style={{ background: C.bg, height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: C.accent, fontFamily: "monospace", animation: "workerPulse 1.5s infinite" }}>
        Connecting to farm...
      </div>
    </div>
  );

  const { stats, workers = {}, capital = {}, recent_trades = [] } = farm;
  const workerList = Object.values(workers);
  const pnlColor   = (stats.daily_pnl || 0) >= 0 ? C.green : C.red;
  const takeRate   = stats.opportunities_seen > 0
    ? ((stats.opportunities_taken / stats.opportunities_seen) * 100).toFixed(1)
    : "0";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px;background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        @keyframes workerPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
      `}</style>

      {/* Header */}
      <div style={{
        background: C.panel, borderBottom: `1px solid ${C.border}`,
        padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `linear-gradient(135deg,${C.accent},${C.purple})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800,
        }}>⬡</div>
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>NEURO FARM</span>
        <div style={{
          background: C.dim, borderRadius: 20, padding: "3px 10px",
          fontSize: 10, color: C.accent, border: `1px solid ${C.accent}44`,
        }}>
          {stats.active_workers}/{stats.total_workers} workers
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 10, color: conn ? C.green : C.yellow }}>
          ● {conn ? "LIVE" : "DEMO"}
        </div>
        <div style={{ fontSize: 10, color: C.muted }}>
          ↑{Math.floor((stats.uptime || 0) / 3600)}h uptime
        </div>
      </div>

      <div style={{ padding: 20, maxWidth: 1600, margin: "0 auto" }}>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10, marginBottom: 18 }}>
          {[
            { l: "Farm PnL",      v: `${(stats.daily_pnl || 0) >= 0 ? "+" : ""}$${(stats.daily_pnl || 0).toFixed(2)}`, c: pnlColor, pulse: true },
            { l: "Total PnL",     v: `$${(stats.total_pnl || 0).toFixed(0)}`,       c: C.text },
            { l: "Active Workers",v: `${stats.active_workers}/${stats.total_workers}`, c: C.accent },
            { l: "Trades Today",  v: stats.total_trades,                             c: C.text },
            { l: "Open Positions",v: stats.active_positions,                         c: C.yellow },
            { l: "Take Rate",     v: `${takeRate}%`,                                 c: C.green },
            { l: "Capital",       v: `$${capital.total || 0}`,                       c: C.purple },
          ].map(({ l, v, c, pulse }) => (
            <div key={l} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "12px 14px", position: "relative",
            }}>
              {pulse && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  width: 6, height: 6, borderRadius: "50%",
                  background: c, animation: "workerPulse 2s infinite",
                }} />
              )}
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: c }}><Mono>{v}</Mono></div>
            </div>
          ))}
        </div>

        {/* PnL chart + capital allocation */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14, marginBottom: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              Combined Farm PnL
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={pnlH}>
                <defs>
                  <linearGradient id="farmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={pnlColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={pnlColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis
                  width={50}
                  tick={{ fill: C.muted, fontSize: 9 }}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip
                  contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11 }}
                  formatter={v => [`$${v.toFixed(2)}`, "Farm PnL"]}
                />
                <ReferenceLine y={0} stroke={C.border} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="pnl" stroke={pnlColor} strokeWidth={2} fill="url(#farmGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              Capital Allocation
            </div>
            {Object.entries(capital.allocations || {}).map(([seg, amt]) => (
              <CapitalBar key={seg} segment={seg} allocated={amt} total={capital.total || 5000} />
            ))}
          </div>
        </div>

        {/* Worker grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
            Workers ({workerList.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
            {workerList.map(w => <WorkerCard key={w.id} worker={w} />)}
          </div>
        </div>

        {/* Recent trades */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <div style={{
            padding: "10px 14px", borderBottom: `1px solid ${C.border}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>
              Recent Farm Trades
            </span>
            <span style={{ fontSize: 10, color: C.muted }}>{recent_trades.length} shown</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {[...recent_trades].reverse().map((t, i) => {
              const color = SEGMENT_COLORS[t.segment] || C.accent;
              return (
                <div key={t.id || i} style={{
                  display: "grid", gridTemplateColumns: "90px 70px 80px 60px 70px 1fr",
                  gap: 8, padding: "7px 14px",
                  borderBottom: `1px solid ${C.border}11`, fontSize: 11, alignItems: "center",
                }}>
                  <div style={{ color, fontSize: 9, fontWeight: 600, letterSpacing: 0.5 }}>
                    {SEGMENT_LABELS[t.segment] || t.segment}
                  </div>
                  <div style={{ color: C.muted, fontSize: 9, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.worker_id}
                  </div>
                  <div style={{ color: C.text, fontFamily: "monospace", fontSize: 10 }}>
                    {t.symbol || "–"}
                  </div>
                  <div style={{ color: t.side === "yes" ? C.green : C.red, fontWeight: 600 }}>
                    {(t.side || "–").toUpperCase()}
                  </div>
                  <div style={{ color: C.muted, fontFamily: "monospace" }}>${t.size_usdc || 0}</div>
                  <div style={{ color: C.accent, fontSize: 10, fontFamily: "monospace" }}>
                    edge: {((t.edge_score || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deploy instructions */}
        <div style={{
          marginTop: 16, background: C.dim, border: `1px solid ${C.border}`,
          borderRadius: 8, padding: 18,
        }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 }}>
            Railway Deploy — Full Farm
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 8 }}>
                1. Orchestrator service
              </div>
              <div style={{ background: C.bg, borderRadius: 4, padding: 10, fontSize: 10, color: C.green, fontFamily: "monospace", lineHeight: 2 }}>
                START_CMD=python -m uvicorn core.farm_orchestrator:app --host 0.0.0.0 --port $PORT<br />
                TOTAL_BANKROLL_USDC=5000<br />
                EDGE_THRESHOLD=0.06
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: C.purple, fontWeight: 600, marginBottom: 8 }}>
                2. Worker services (one per segment)
              </div>
              <div style={{ background: C.bg, borderRadius: 4, padding: 10, fontSize: 10, color: C.green, fontFamily: "monospace", lineHeight: 2 }}>
                START_CMD=python core/farm_worker.py<br />
                ORCHESTRATOR_URL=https://your-orch.railway.app<br />
                WORKER_SEGMENT=btc_5m  # change per worker<br />
                DRY_RUN=1
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
            Deploy 8 worker services, one per segment. Each costs ~$5/mo on Railway Hobby.
            Total farm cost: ~$45/mo for full 24/7 coverage across all windows.
          </div>
        </div>

      </div>
    </div>
  );
}
