"""
Funding Rate Arbitrage Strategy
Monitors Binance perpetual funding rates.
When the annualised funding rate exceeds a threshold, the strategy takes the
opposite side of the dominant position (short when rate is high / longs are
paying shorts) and holds until the next funding settlement.
"""

import logging

log = logging.getLogger("strategy.funding_rate_arb")


class FundingRateArbStrategy:
    name    = "funding_rate_arb"
    enabled = True

    MIN_ANNUALISED_RATE = 0.50   # 50% annualised = ~0.0556% per 8h
    MAX_POSITION        = 500    # USDC
    BINANCE_API         = "https://fapi.binance.com"

    def __init__(self, config: dict, agent):
        self.config = config
        self.agent  = agent
        log.info("FundingRateArbStrategy init | min_rate=%.0f%% annualised", self.MIN_ANNUALISED_RATE * 100)

    def status(self) -> dict:
        return {
            "name":                self.name,
            "enabled":             self.enabled,
            "min_annualised_rate": self.MIN_ANNUALISED_RATE,
        }

    async def scan(self) -> list:
        # Stub: full implementation fetches /fapi/v1/premiumIndex for all
        # USDT-margined perpetuals, computes annualised rate, and emits arb
        # signals for symbols where |rate| > MIN_ANNUALISED_RATE.
        return []

    async def execute(self, opp: dict):
        log.info("funding_rate_arb execute | %s rate=%.4f", opp.get("symbol", ""), opp.get("rate", 0))
