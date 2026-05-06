"""
TradingView Signal Follower Strategy
Consumes signals injected by the TradingView MCP webhook endpoint.
Signals arrive via agent.inject_tv_signal() and are acted on within
the next scan cycle if they are fresh (< max_signal_age_seconds old).
"""

import logging
import time

log = logging.getLogger("strategy.tv_signal_follower")


class TVSignalFollowerStrategy:
    name    = "tv_signal_follower"
    enabled = True

    MAX_SIGNAL_AGE = 120  # seconds — discard stale signals
    MAX_POSITION   = 400  # USDC

    def __init__(self, config: dict, agent):
        self.config = config
        self.agent  = agent
        log.info("TVSignalFollowerStrategy init | max_age=%ds", self.MAX_SIGNAL_AGE)

    def status(self) -> dict:
        return {
            "name":          self.name,
            "enabled":       self.enabled,
            "pending":       len(self.agent.tv_signals),
            "max_signal_age": self.MAX_SIGNAL_AGE,
        }

    async def scan(self) -> list:
        now  = time.time()
        opps = []
        for symbol, sig in list(self.agent.tv_signals.items()):
            age = now - sig.get("received_at", 0)
            if age > self.MAX_SIGNAL_AGE:
                del self.agent.tv_signals[symbol]
                continue
            opps.append({
                "strategy":   self.name,
                "symbol":     symbol,
                "side":       sig.get("action", "buy").lower(),
                "size_usdc":  self.config.get("tv_position_usdc", self.MAX_POSITION),
                "edge_score": sig.get("strength", 0.5),
                "tv_signal":  sig,
            })
        return opps

    async def execute(self, opp: dict):
        log.info("tv_signal_follower execute | %s %s", opp.get("side", ""), opp.get("symbol", ""))
        # Full implementation would place the order via a Binance/exchange connector.
