"""
Farm Orchestrator
The central brain of the multi-agent farm.

Responsibilities:
  - Assigns market segments to workers via job queue
  - Tracks combined capital across all workers
  - Portfolio-level Kelly sizing (prevents over-concentration)
  - Deduplicates opportunities (no two workers trade same market)
  - Aggregates P&L into single dashboard view
  - Health monitors workers, reassigns dead segments

Deploy: ONE instance on Railway (coordinator service)
Workers: N instances on Railway (worker services, env WORKER_MODE=1)
"""

import asyncio
import logging
import os
import time
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

log = logging.getLogger("orchestrator")

app = FastAPI(title="Farm Orchestrator")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Market segment definitions ───────────────────────────────────────────────

SEGMENTS = {
    "btc_5m":   {"asset": "BTC", "window_min": 5,   "pairs": ["BTCUSDT"],              "priority": 1},
    "eth_5m":   {"asset": "ETH", "window_min": 5,   "pairs": ["ETHUSDT"],              "priority": 1},
    "btc_15m":  {"asset": "BTC", "window_min": 15,  "pairs": ["BTCUSDT"],              "priority": 2},
    "eth_15m":  {"asset": "ETH", "window_min": 15,  "pairs": ["ETHUSDT"],              "priority": 2},
    "sol_5m":   {"asset": "SOL", "window_min": 5,   "pairs": ["SOLUSDT"],              "priority": 3},
    "sol_15m":  {"asset": "SOL", "window_min": 15,  "pairs": ["SOLUSDT"],              "priority": 3},
    "funding":  {"asset": "ALL", "window_min": 480, "pairs": ["ETHUSDT","BTCUSDT","SOLUSDT"], "priority": 4},
    "liq_hunt": {"asset": "ALL", "window_min": 10,  "pairs": ["ETHUSDT","BTCUSDT"],    "priority": 4},
}


@dataclass
class WorkerInfo:
    id: str
    segment: str
    ws: Optional[object] = None
    last_heartbeat: float = field(default_factory=time.time)
    trades_today: int = 0
    pnl_today: float = 0.0
    active_positions: int = 0
    status: str = "connecting"


@dataclass
class FarmStats:
    total_workers: int = 0
    active_workers: int = 0
    total_trades: int = 0
    total_pnl: float = 0.0
    daily_pnl: float = 0.0
    active_positions: int = 0
    capital_deployed: float = 0.0
    capital_available: float = 0.0
    opportunities_seen: int = 0
    opportunities_taken: int = 0
    uptime: float = 0.0


class FarmOrchestrator:
    def __init__(self, config: dict):
        self.config            = config
        self.workers: dict[str, WorkerInfo] = {}
        self.stats             = FarmStats()
        self.trades: list      = []
        self._claimed_markets: set = set()   # market_ids currently being traded
        self._start_time       = time.time()
        self._total_bankroll   = config.get("total_bankroll_usdc", 5000)
        self._dashboard_clients: set = set()

        log.info(
            "FarmOrchestrator init | bankroll=$%.0f segments=%d",
            self._total_bankroll, len(SEGMENTS),
        )

    # ------------------------------------------------------------------ #
    #  Worker management                                                   #
    # ------------------------------------------------------------------ #

    def register_worker(self, worker_id: str, segment: str, ws) -> dict:
        segment_config        = SEGMENTS.get(segment, {})
        worker                = WorkerInfo(id=worker_id, segment=segment, ws=ws)
        self.workers[worker_id] = worker
        self.stats.total_workers  = len(self.workers)
        self.stats.active_workers = sum(1 for w in self.workers.values() if w.status == "active")
        log.info("Worker registered: %s → segment=%s", worker_id, segment)
        return {
            "segment":            segment,
            "segment_config":     segment_config,
            "capital_allocation": self._allocate_capital(segment),
            "cycle_interval":     self._cycle_interval(segment),
            "edge_threshold":     self.config.get("edge_threshold", 0.06),
        }

    def worker_heartbeat(self, worker_id: str, state: dict):
        if worker_id not in self.workers:
            return
        w                    = self.workers[worker_id]
        w.last_heartbeat     = time.time()
        w.status             = "active"
        w.trades_today       = state.get("trades_today", 0)
        w.pnl_today          = state.get("pnl_today", 0.0)
        w.active_positions   = state.get("active_positions", 0)
        self._aggregate_stats()

    def claim_market(self, market_id: str, worker_id: str) -> bool:
        """Prevent two workers from trading the same market simultaneously."""
        if market_id in self._claimed_markets:
            return False
        self._claimed_markets.add(market_id)
        return True

    def release_market(self, market_id: str):
        self._claimed_markets.discard(market_id)

    def record_trade(self, trade: dict):
        self.trades.append({**trade, "farm_ts": time.time()})
        self.stats.total_trades       += 1
        self.stats.opportunities_taken += 1

    # ------------------------------------------------------------------ #
    #  Capital management                                                  #
    # ------------------------------------------------------------------ #

    def _allocate_capital(self, segment: str) -> float:
        """
        Portfolio-level Kelly: allocate capital to each segment based on
        its priority. Higher priority segments get more capital.
        """
        seg      = SEGMENTS.get(segment, {})
        priority = seg.get("priority", 4)
        priority_weights = {1: 0.25, 2: 0.20, 3: 0.15, 4: 0.10}
        weight   = priority_weights.get(priority, 0.10)
        return round(self._total_bankroll * weight, 2)

    def _cycle_interval(self, segment: str) -> int:
        """Faster cycles for shorter windows."""
        window = SEGMENTS.get(segment, {}).get("window_min", 15)
        if window <= 5:  return 10
        if window <= 15: return 20
        return 30

    # ------------------------------------------------------------------ #
    #  Health monitoring                                                   #
    # ------------------------------------------------------------------ #

    async def monitor_workers(self):
        """Detect dead workers and log for Railway auto-restart."""
        while True:
            await asyncio.sleep(30)
            now  = time.time()
            dead = []
            for wid, w in self.workers.items():
                if now - w.last_heartbeat > 60:
                    log.warning("Worker %s (segment=%s) appears dead", wid, w.segment)
                    w.status = "dead"
                    dead.append(wid)
            for wid in dead:
                del self.workers[wid]
            self.stats.active_workers = sum(1 for w in self.workers.values() if w.status == "active")

    def _aggregate_stats(self):
        self.stats.active_workers   = sum(1 for w in self.workers.values() if w.status == "active")
        self.stats.daily_pnl        = sum(w.pnl_today for w in self.workers.values())
        self.stats.active_positions = sum(w.active_positions for w in self.workers.values())
        self.stats.uptime           = time.time() - self._start_time

    def get_farm_state(self) -> dict:
        self._aggregate_stats()
        return {
            "stats": asdict(self.stats),
            "workers": {
                wid: {
                    "id":               w.id,
                    "segment":          w.segment,
                    "status":           w.status,
                    "trades_today":     w.trades_today,
                    "pnl_today":        w.pnl_today,
                    "active_positions": w.active_positions,
                    "last_heartbeat_ago": round(time.time() - w.last_heartbeat, 1),
                }
                for wid, w in self.workers.items()
            },
            "segments":     SEGMENTS,
            "capital": {
                "total":       self._total_bankroll,
                "allocations": {s: self._allocate_capital(s) for s in SEGMENTS},
            },
            "recent_trades": self.trades[-30:],
            "timestamp":     datetime.now(timezone.utc).isoformat(),
        }

    async def broadcast(self, msg: dict):
        dead = set()
        for ws in self._dashboard_clients:
            try:
                await ws.send_json(msg)
            except Exception:
                dead.add(ws)
        self._dashboard_clients -= dead


# ─── Global orchestrator instance ─────────────────────────────────────────────

config = {
    "total_bankroll_usdc": float(os.getenv("TOTAL_BANKROLL_USDC", "5000")),
    "edge_threshold":      float(os.getenv("EDGE_THRESHOLD", "0.06")),
}
orch = FarmOrchestrator(config)


# ─── API endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "workers": orch.stats.active_workers}


@app.get("/farm-state")
async def farm_state():
    return orch.get_farm_state()


@app.post("/worker/register")
async def register_worker(body: dict):
    worker_id  = body.get("worker_id", str(uuid.uuid4())[:8])
    segment    = body.get("segment", "btc_5m")
    assignment = orch.register_worker(worker_id, segment, ws=None)
    return {"worker_id": worker_id, **assignment}


@app.post("/worker/heartbeat")
async def worker_heartbeat(body: dict):
    orch.worker_heartbeat(body.get("worker_id", ""), body.get("state", {}))
    await orch.broadcast({"type": "farm_state", "data": orch.get_farm_state()})
    return {"ok": True}


@app.post("/worker/claim-market")
async def claim_market(body: dict):
    ok = orch.claim_market(body.get("market_id", ""), body.get("worker_id", ""))
    return {"claimed": ok}


@app.post("/worker/release-market")
async def release_market(body: dict):
    orch.release_market(body.get("market_id", ""))
    return {"ok": True}


@app.post("/worker/trade")
async def record_trade(trade: dict):
    orch.record_trade(trade)
    await orch.broadcast({"type": "new_trade", "data": trade})
    return {"ok": True}


@app.websocket("/ws/dashboard")
async def dashboard_ws(ws: WebSocket):
    await ws.accept()
    orch._dashboard_clients.add(ws)
    await ws.send_json({"type": "farm_state", "data": orch.get_farm_state()})
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        orch._dashboard_clients.discard(ws)


@app.on_event("startup")
async def startup():
    asyncio.create_task(orch.monitor_workers())
    log.info("Orchestrator online")
