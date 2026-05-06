"""
Crypto Momentum Strategy
EMA crossover (fast/slow) filtered by RSI to avoid entries in overbought/oversold conditions.
Trades perpetual futures on Binance; sizes via fixed fractional Kelly.
"""

import logging

log = logging.getLogger("strategy.crypto_momentum")


class CryptoMomentumStrategy:
    name    = "crypto_momentum"
    enabled = True

    EMA_FAST     = 9
    EMA_SLOW     = 21
    RSI_PERIOD   = 14
    RSI_LOW      = 40
    RSI_HIGH     = 60
    MAX_POSITION = 300  # USDC

    def __init__(self, config: dict, agent):
        self.config = config
        self.agent  = agent
        log.info("CryptoMomentumStrategy init | EMA %d/%d RSI %d", self.EMA_FAST, self.EMA_SLOW, self.RSI_PERIOD)

    def status(self) -> dict:
        return {
            "name":    self.name,
            "enabled": self.enabled,
            "ema":     f"{self.EMA_FAST}/{self.EMA_SLOW}",
            "rsi":     self.RSI_PERIOD,
        }

    async def scan(self) -> list:
        # Stub: full implementation streams OHLCV from Binance, computes EMA
        # crossover + RSI, emits signal dicts when conditions align.
        return []

    async def execute(self, opp: dict):
        log.info("crypto_momentum execute | %s %s", opp.get("side", ""), opp.get("symbol", ""))
