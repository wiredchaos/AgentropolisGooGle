"""
Funding Rate Arbitrage Strategy
Exploits persistent funding rate imbalances between Binance perps and spot.

When funding is highly positive:
  → Longs are paying shorts → short perp + long spot (cash and carry)
When funding is highly negative:
  → Shorts are paying longs → long perp + short spot (reverse carry)

Edge: funding collected every 8 hours = annualized 3x daily rate
"""

import asyncio
import logging
import time
import uuid
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.funding_arb")

BINANCE_FAPI = "https://fapi.binance.com"


class FundingRateArbStrategy:
    name    = "funding_rate_arb"
    enabled = True

    PAIRS             = ["ETHUSDT", "BTCUSDT", "SOLUSDT", "BNBUSDT", "AVAXUSDT"]
    MIN_FUNDING_RATE  = 0.0008   # 0.08% per 8h ≈ 87% annualised
    MAX_POSITION_USDC = 300

    def __init__(self, config: dict, agent):
        self.config      = config
        self.agent       = agent
        self._rates: dict = {}   # symbol → {funding_rate, mark_price, next_funding_time}
        self._last_fetch  = 0

    def status(self) -> dict:
        top = sorted(
            self._rates.items(),
            key=lambda x: abs(x[1].get("funding_rate", 0)),
            reverse=True,
        )[:3]
        return {
            "name":                   self.name,
            "enabled":                self.enabled,
            "min_funding_threshold":  self.MIN_FUNDING_RATE,
            "top_rates": {k: round(v.get("funding_rate", 0) * 100, 4) for k, v in top},
        }

    async def scan(self) -> list:
        await self._refresh_rates()
        opps = []
        for symbol, data in self._rates.items():
            opp = self._evaluate(symbol, data)
            if opp:
                opps.append(opp)
        return opps

    async def execute(self, opp: dict):
        log.info(
            "FUNDING ARB | %s rate=%.4f%% side=%s size=$%.0f",
            opp["symbol"], opp["funding_rate_pct"], opp["side"], opp["size_usdc"],
        )
        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="crypto",
            strategy=self.name,
            symbol=opp["symbol"],
            side=opp["side"],
            size_usdc=opp["size_usdc"],
            entry_price=opp["mark_price"],
        )
        self.agent.record_trade(trade)
        asyncio.create_task(self._collect_funding(trade, opp))

    # ------------------------------------------------------------------ #
    #  Signal evaluation                                                   #
    # ------------------------------------------------------------------ #

    def _evaluate(self, symbol: str, data: dict) -> Optional[dict]:
        rate    = data.get("funding_rate", 0)
        mark    = data.get("mark_price", 0)
        next_ft = data.get("next_funding_time", 0)

        if abs(rate) < self.MIN_FUNDING_RATE:
            return None
        if mark <= 0:
            return None

        # Prefer positions with >1h until settlement (avoid late entry)
        time_to_funding = max(0, next_ft / 1000 - time.time())
        if time_to_funding < 3600:
            return None

        # Positive rate → longs paying → short perp + long spot
        # Negative rate → shorts paying → long perp + short spot
        side       = "sell" if rate > 0 else "buy"
        annualized = abs(rate) * 3 * 365   # 3 settlements/day × 365

        return {
            "strategy":         self.name,
            "symbol":           symbol,
            "side":             side,
            "mark_price":       mark,
            "funding_rate":     rate,
            "funding_rate_pct": rate * 100,
            "annualized_yield": annualized,
            "time_to_funding_h": round(time_to_funding / 3600, 1),
            "edge_score":       abs(rate) * 10,
            "size_usdc":        min(
                self.MAX_POSITION_USDC,
                self.config.get("bankroll_usdc", 1000) * 0.2,
            ),
        }

    # ------------------------------------------------------------------ #
    #  Data refresh                                                        #
    # ------------------------------------------------------------------ #

    async def _refresh_rates(self):
        if time.time() - self._last_fetch < 120:
            return
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{BINANCE_FAPI}/fapi/v1/premiumIndex",
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    data = await resp.json()

            for item in data:
                sym = item.get("symbol", "")
                if sym in self.PAIRS:
                    self._rates[sym] = {
                        "funding_rate":      float(item.get("lastFundingRate", 0)),
                        "mark_price":        float(item.get("markPrice", 0)),
                        "next_funding_time": int(item.get("nextFundingTime", 0)),
                    }
            self._last_fetch = time.time()
            log.debug("Funding rates refreshed for %d pairs", len(self._rates))
        except Exception as e:
            log.warning("Funding rate fetch failed: %s", e)

    # ------------------------------------------------------------------ #
    #  Exit management                                                     #
    # ------------------------------------------------------------------ #

    async def _collect_funding(self, trade, opp: dict):
        """Hold through 1-3 funding periods (8h each)."""
        import random
        periods       = random.randint(1, 3)
        await asyncio.sleep(periods * 28800)
        price_drift   = random.gauss(0, 0.008)
        factor        = (1 - price_drift) if trade.side == "sell" else (1 + price_drift)
        self.agent.close_trade(trade.id, opp["mark_price"] * factor)
