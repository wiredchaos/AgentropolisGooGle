"""
Strategy: TradingView Signal Follower
Consumes live signals from tradingview-mcp bridge.
Reads pine labels, study values, and OHLCV data from your TradingView Desktop
and converts them into trade entries.

Bridge setup:
  1. Clone https://github.com/tradesdontlie/tradingview-mcp
  2. Run: node src/server.js  (with TradingView open + CDP on port 9222)
  3. The /tv-signal endpoint in dashboard/server.py receives pushed signals
  4. This strategy reads agent.tv_signals[symbol] on each scan cycle
"""

import asyncio
import logging
import time
import uuid
from typing import Optional

log = logging.getLogger("strategy.tv_signal")


class TVSignalFollowerStrategy:
    name    = "tv_signal_follower"
    enabled = True

    MIN_CONFIDENCE = 0.65   # minimum signal strength to act on

    def __init__(self, config: dict, agent):
        self.config  = config
        self.agent   = agent
        self._acted: set = set()   # signal hashes already traded
        log.info("TVSignalFollowerStrategy init | min_confidence=%.2f", self.MIN_CONFIDENCE)

    def status(self) -> dict:
        return {
            "name":              self.name,
            "enabled":           self.enabled,
            "signals_received":  len(self.agent.tv_signals),
            "trades_taken":      len(self._acted),
            "min_confidence":    self.MIN_CONFIDENCE,
        }

    async def scan(self) -> list:
        opps = []
        for symbol, signal in self.agent.tv_signals.items():
            opp = self._evaluate_signal(symbol, signal)
            if opp:
                opps.append(opp)
        return opps

    async def execute(self, opp: dict):
        sig_hash = opp["signal_hash"]
        if sig_hash in self._acted:
            return
        self._acted.add(sig_hash)

        log.info("TV SIGNAL ORDER | %s %s conf=%.2f src=%s",
                 opp["symbol"], opp["side"], opp["confidence"], opp["signal_source"])

        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="crypto",
            strategy=self.name,
            symbol=opp["symbol"],
            side=opp["side"],
            size_usdc=opp["size_usdc"],
            entry_price=opp["price"],
            tv_signal=opp["raw_signal"],
        )
        self.agent.record_trade(trade)
        asyncio.create_task(self._manage_exit(trade, opp))

    # ------------------------------------------------------------------ #

    def _evaluate_signal(self, symbol: str, signal: dict) -> Optional[dict]:
        """
        Expected signal dict (from TradingView MCP bridge):
        {
          "trend":          "bull" | "bear" | "neutral",
          "momentum_bias":  float,          # -1 to +1
          "confidence":     float,          # 0 to 1
          "rsi":            float,
          "ema_cross":      "bullish" | "bearish" | None,
          "pine_labels":    [...],
          "pine_lines":     [...],
          "price":          float,
          "signal_source":  str,
          "received_at":    float,
        }
        """
        # Ignore stale signals (older than 5 minutes)
        age = time.time() - signal.get("received_at", 0)
        if age > 300:
            return None

        trend      = signal.get("trend", "neutral")
        confidence = signal.get("confidence", 0.0)
        price      = signal.get("price", 0.0)

        if confidence < self.MIN_CONFIDENCE:
            return None
        if trend == "neutral":
            return None
        if price <= 0:
            return None

        side     = "buy" if trend == "bull" else "sell"
        sig_hash = f"{symbol}:{trend}:{round(price, 2)}:{signal.get('received_at', 0)}"

        if sig_hash in self._acted:
            return None

        edge_score = confidence * abs(signal.get("momentum_bias", 0.5))

        return {
            "strategy":      self.name,
            "symbol":        symbol,
            "side":          side,
            "price":         price,
            "confidence":    confidence,
            "edge_score":    edge_score,
            "size_usdc":     self._position_size(confidence),
            "signal_hash":   sig_hash,
            "signal_source": signal.get("signal_source", "tradingview-mcp"),
            "raw_signal":    signal,
        }

    def _position_size(self, confidence: float) -> float:
        bankroll = self.config.get("bankroll_usdc", 1000)
        max_pos  = self.config.get("tv_max_position_usdc", 150)
        return round(min(confidence * bankroll * 0.15, max_pos), 2)

    async def _manage_exit(self, trade, opp: dict):
        """
        In production: re-read TradingView chart state via MCP to decide exit.
        Simulation: hold 15-60 min then close with slight positive drift.
        """
        import random
        await asyncio.sleep(random.randint(900, 3600))
        drift  = random.gauss(0.006, 0.018)
        factor = (1 + drift) if trade.side == "buy" else (1 - drift)
        self.agent.close_trade(trade.id, opp["price"] * factor)
