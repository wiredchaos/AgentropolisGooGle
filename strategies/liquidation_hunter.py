"""
Liquidation Hunter Strategy
Detects impending liquidation cascades by monitoring:
  - Open Interest (OI) sudden drops (> threshold in short window)
  - Binance liquidation stream for large individual liquidations
  - Price acceleration in the direction of the cascade

When a cascade is detected, the strategy enters in the cascade direction
expecting further forced liquidations to push price further.
"""

import logging

log = logging.getLogger("strategy.liquidation_hunter")


class LiquidationHunterStrategy:
    name    = "liquidation_hunter"
    enabled = True

    OI_DROP_THRESHOLD = 0.03   # 3% OI drop in 1 candle
    MIN_LIQ_SIZE_USDC = 50_000 # minimum liquidation size to trigger signal
    MAX_POSITION      = 400    # USDC

    def __init__(self, config: dict, agent):
        self.config = config
        self.agent  = agent
        log.info("LiquidationHunterStrategy init | oi_drop=%.0f%%", self.OI_DROP_THRESHOLD * 100)

    def status(self) -> dict:
        return {
            "name":             self.name,
            "enabled":          self.enabled,
            "oi_drop_pct":      self.OI_DROP_THRESHOLD * 100,
            "min_liq_size":     self.MIN_LIQ_SIZE_USDC,
        }

    async def scan(self) -> list:
        # Stub: full implementation subscribes to Binance WebSocket liquidation
        # stream and OI endpoint, emits cascade signals on large OI drops.
        return []

    async def execute(self, opp: dict):
        log.info("liquidation_hunter execute | %s %s", opp.get("side", ""), opp.get("symbol", ""))
