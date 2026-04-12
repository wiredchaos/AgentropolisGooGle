"""
core/agent.py — Full agent with all 7 strategies + accumulator + AI layer

Strategies:
  1. polymarket_mispricing    — log-normal fair value, Kelly sizing
  2. crypto_momentum          — EMA crossover + RSI
  3. crypto_mean_reversion    — Bollinger Bands + RSI
  4. tv_signal_follower       — TradingView MCP signals
  5. funding_rate_arb         — Binance perp funding rates
  6. liquidation_hunter       — OI drop + cascade detection
  7. combinatorial_arb        — $40M paper: single/multi/cross-market arb
"""

import asyncio
import json
import logging
import signal
import time
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import aiohttp

log = logging.getLogger("agent")


class AgentState(Enum):
    BOOTING    = "booting"
    SCANNING   = "scanning"
    ANALYZING  = "analyzing"
    EXECUTING  = "executing"
    COOLDOWN   = "cooldown"
    PAUSED     = "paused"
    STOPPED    = "stopped"


@dataclass
class Trade:
    id: str
    source: str
    strategy: str
    symbol: str
    side: str
    size_usdc: float
    entry_price: float
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    status: str = "open"
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    tv_signal: Optional[dict] = None


@dataclass
class AgentStats:
    total_trades: int = 0
    winning_trades: int = 0
    total_pnl_usdc: float = 0.0
    daily_pnl_usdc: float = 0.0
    active_positions: int = 0
    last_cycle_ms: float = 0.0
    uptime_seconds: float = 0.0
    state: str = "booting"
    scan_count: int = 0


class TradingAgent:
    def __init__(self, config: dict):
        self.config          = config
        self.state           = AgentState.BOOTING
        self.stats           = AgentStats()
        self.trades          = []
        self.open_positions  = {}
        self._start_time     = time.time()
        self._running        = False
        self._cycle_lock     = asyncio.Lock()
        self.strategies      = []
        self.tv_signals      = {}
        self._accumulator    = None
        self._ai_layer       = None

    async def run(self):
        from strategies.polymarket_mispricing import PolymarketMispricingStrategy
        from strategies.crypto_momentum import CryptoMomentumStrategy
        from strategies.crypto_mean_reversion import CryptoMeanReversionStrategy
        from strategies.tv_signal_follower import TVSignalFollowerStrategy
        from strategies.funding_rate_arb import FundingRateArbStrategy
        from strategies.liquidation_hunter import LiquidationHunterStrategy
        from strategies.combinatorial_arb import CombinatorialArbStrategy
        from core.accumulator import USDCAccumulator
        from core.ai_signal import AISignalLayer

        self.strategies = [
            PolymarketMispricingStrategy(self.config, self),
            CryptoMomentumStrategy(self.config, self),
            CryptoMeanReversionStrategy(self.config, self),
            TVSignalFollowerStrategy(self.config, self),
            FundingRateArbStrategy(self.config, self),
            LiquidationHunterStrategy(self.config, self),
            CombinatorialArbStrategy(self.config, self),
        ]
        self._accumulator = USDCAccumulator(self.config)
        self._ai_layer    = AISignalLayer(self.config)

        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, lambda: asyncio.create_task(self.stop()))

        self._running = True
        self.state    = AgentState.SCANNING
        log.info("Agent running — %d strategies", len(self.strategies))
        await asyncio.gather(self._cycle_loop(), self._stats_reporter(), self._accumulator.run())

    async def stop(self):
        self._running = False
        self.state    = AgentState.STOPPED

    def inject_tv_signal(self, symbol: str, signal_data: dict):
        self.tv_signals[symbol] = {**signal_data, "received_at": time.time()}

    def record_trade(self, trade: Trade):
        self.trades.append(trade)
        if trade.status == "open":
            self.open_positions[trade.id] = trade
        self.stats.total_trades    += 1
        self.stats.active_positions = len(self.open_positions)
        log.info("Trade: %s %s %s $%.2f", trade.strategy, trade.side, trade.symbol, trade.size_usdc)

    def close_trade(self, trade_id: str, exit_price: float):
        if trade_id not in self.open_positions:
            return
        trade             = self.open_positions.pop(trade_id)
        trade.exit_price  = exit_price
        trade.status      = "closed"
        trade.pnl = (
            (exit_price - trade.entry_price) / trade.entry_price * trade.size_usdc
            if trade.side in ("buy", "yes") else
            (trade.entry_price - exit_price) / trade.entry_price * trade.size_usdc
        )
        self.stats.total_pnl_usdc   += trade.pnl
        self.stats.daily_pnl_usdc   += trade.pnl
        self.stats.active_positions  = len(self.open_positions)
        if trade.pnl > 0:
            self.stats.winning_trades += 1
            if self._accumulator and trade.source == "polymarket":
                self._accumulator.deposit(max(trade.pnl, 0), source=trade.strategy)

    def get_dashboard_state(self) -> dict:
        self.stats.uptime_seconds = time.time() - self._start_time
        self.stats.state          = self.state.value
        closed = self.stats.total_trades - self.stats.active_positions
        wr     = (self.stats.winning_trades / max(1, closed)) * 100
        return {
            "stats":          asdict(self.stats),
            "win_rate":       round(wr, 1),
            "recent_trades":  [asdict(t) for t in self.trades[-50:]],
            "open_positions": {k: asdict(v) for k, v in self.open_positions.items()},
            "tv_signals":     self.tv_signals,
            "strategies":     [s.status() for s in self.strategies],
            "accumulator":    self._accumulator.status if self._accumulator else {},
            "ai_signal":      self._ai_layer.status if self._ai_layer else {},
            "timestamp":      datetime.now(timezone.utc).isoformat(),
        }

    async def _cycle_loop(self):
        interval = self.config.get("cycle_interval_seconds", 30)
        while self._running:
            t0 = time.time()
            async with self._cycle_lock:
                await self._run_cycle()
            self.stats.last_cycle_ms = (time.time() - t0) * 1000
            self.stats.scan_count   += 1
            await asyncio.sleep(interval)

    async def _run_cycle(self):
        self.state = AgentState.SCANNING
        try:
            results = await asyncio.gather(
                *[s.scan() for s in self.strategies if s.enabled],
                return_exceptions=True,
            )
            opps = [o for r in results if isinstance(r, list) for o in r]
            if not opps:
                self.state = AgentState.COOLDOWN
                return

            self.state = AgentState.ANALYZING
            if self._ai_layer and self._ai_layer.enabled:
                validated = []
                for opp in opps:
                    e = await self._ai_layer.validate_opportunity(opp)
                    if e.get("ai_conviction", 1.0) >= 0.5:
                        validated.append(e)
                opps = validated

            self.state = AgentState.EXECUTING
            max_trades = self.config.get("max_concurrent_trades", 5)
            for opp in sorted(opps, key=lambda o: o.get("edge_score", 0), reverse=True)[:max_trades]:
                await self._execute_opportunity(opp)
        except Exception as e:
            log.error("Cycle: %s", e, exc_info=True)
        finally:
            self.state = AgentState.SCANNING

    async def _execute_opportunity(self, opp: dict):
        for s in self.strategies:
            if s.name == opp.get("strategy"):
                await s.execute(opp)
                break

    async def _stats_reporter(self):
        url = self.config.get("dashboard_api_url", "http://localhost:8765")
        async with aiohttp.ClientSession() as session:
            while self._running:
                try:
                    async with session.post(
                        f"{url}/agent-state",
                        json=self.get_dashboard_state(),
                        timeout=aiohttp.ClientTimeout(total=2),
                    ) as _:
                        pass
                except Exception:
                    pass
                await asyncio.sleep(5)
