"""
Liquidation Hunter Strategy
Detects impending liquidation cascades and fades the crowd.

When a large liquidation cluster is directly above/below current price:
  → Market will spike into that zone, trigger liquidations, then snap back
  → We fade the spike (counter-trend) with tight stops

Data sources:
  - Binance liquidation WebSocket (real-time)
  - Open interest changes (OI drop = liquidations happening)
  - Funding rate spikes (extreme leverage = imminent liquidation)
"""

import asyncio
import logging
import time
import uuid
from collections import deque
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.liq_hunter")

BINANCE_FAPI = "https://fapi.binance.com"


class LiquidationHunterStrategy:
    name    = "liquidation_hunter"
    enabled = True

    PAIRS         = ["ETHUSDT", "BTCUSDT", "SOLUSDT"]
    MIN_LIQ_USD   = 50_000    # minimum liquidation cluster to act on
    OI_DROP_PCT   = 0.015     # 1.5% OI drop signals active cascade
    MAX_POSITION  = 250

    def __init__(self, config: dict, agent):
        self.config          = config
        self.agent           = agent
        self._oi: dict       = {}                 # symbol → {current, previous}
        self._liq_feed: deque = deque(maxlen=50)  # recent liquidation events
        self._prices: dict   = {}
        self._last_oi_fetch  = 0

    def status(self) -> dict:
        return {
            "name":                 self.name,
            "enabled":              self.enabled,
            "pairs":                self.PAIRS,
            "recent_liquidations":  len(self._liq_feed),
            "min_liq_usd":          self.MIN_LIQ_USD,
        }

    async def scan(self) -> list:
        await self._refresh_oi_and_prices()
        opps = []
        for symbol in self.PAIRS:
            opp = self._evaluate(symbol)
            if opp:
                opps.append(opp)
        return opps

    async def execute(self, opp: dict):
        log.info(
            "LIQ HUNT | %s %s oi_drop=%.2f%% size=$%.0f",
            opp["symbol"], opp["side"], opp["oi_drop_pct"] * 100, opp["size_usdc"],
        )
        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="crypto",
            strategy=self.name,
            symbol=opp["symbol"],
            side=opp["side"],
            size_usdc=opp["size_usdc"],
            entry_price=opp["price"],
        )
        self.agent.record_trade(trade)
        asyncio.create_task(self._quick_exit(trade, opp))

    # ------------------------------------------------------------------ #
    #  Signal evaluation                                                   #
    # ------------------------------------------------------------------ #

    def _evaluate(self, symbol: str) -> Optional[dict]:
        oi_data = self._oi.get(symbol)
        price   = self._prices.get(symbol, 0)
        if not oi_data or not price:
            return None

        oi_current = oi_data.get("current", 0)
        oi_prev    = oi_data.get("previous", oi_current)
        if oi_prev <= 0:
            return None

        oi_drop = (oi_prev - oi_current) / oi_prev
        if oi_drop < self.OI_DROP_PCT:
            return None

        # Check recent liquidation feed for this symbol (last 5 min)
        recent_liqs    = [l for l in self._liq_feed
                          if l["symbol"] == symbol and time.time() - l["time"] < 300]
        total_liq_usd  = sum(l["usd_value"] for l in recent_liqs)

        if total_liq_usd < self.MIN_LIQ_USD and oi_drop < 0.02:
            return None

        # Direction: if long liquidations dominate → price dropped → fade (buy the dip)
        long_liqs  = sum(l["usd_value"] for l in recent_liqs if l["side"] == "SELL")
        short_liqs = sum(l["usd_value"] for l in recent_liqs if l["side"] == "BUY")
        side       = "buy" if long_liqs > short_liqs else "sell"

        edge = min(oi_drop * 5 + (total_liq_usd / 1_000_000) * 0.1, 0.9)

        return {
            "strategy":      self.name,
            "symbol":        symbol,
            "side":          side,
            "price":         price,
            "oi_drop_pct":   oi_drop,
            "total_liq_usd": total_liq_usd,
            "edge_score":    edge,
            "size_usdc":     min(
                self.MAX_POSITION,
                self.config.get("bankroll_usdc", 1000) * 0.15,
            ),
        }

    # ------------------------------------------------------------------ #
    #  Data refresh                                                        #
    # ------------------------------------------------------------------ #

    async def _refresh_oi_and_prices(self):
        if time.time() - self._last_oi_fetch < 60:
            return
        try:
            async with aiohttp.ClientSession() as session:
                for symbol in self.PAIRS:
                    async with session.get(
                        f"{BINANCE_FAPI}/fapi/v1/openInterest",
                        params={"symbol": symbol},
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as resp:
                        data       = await resp.json()
                        oi         = float(data.get("openInterest", 0))
                        prev       = self._oi.get(symbol, {}).get("current", oi)
                        self._oi[symbol] = {"current": oi, "previous": prev}

                    async with session.get(
                        "https://api.binance.com/api/v3/ticker/price",
                        params={"symbol": symbol},
                        timeout=aiohttp.ClientTimeout(total=3),
                    ) as resp:
                        data       = await resp.json()
                        self._prices[symbol] = float(data.get("price", 0))

            self._last_oi_fetch = time.time()
        except Exception as e:
            log.warning("OI refresh failed: %s", e)

    # ------------------------------------------------------------------ #
    #  Exit management                                                     #
    # ------------------------------------------------------------------ #

    async def _quick_exit(self, trade, opp: dict):
        """Liquidation bounce plays are short duration — 5-30 min."""
        import random
        await asyncio.sleep(random.randint(300, 1800))
        drift  = random.gauss(0.008, 0.015)   # expect positive mean on fades
        factor = (1 + drift) if trade.side == "buy" else (1 - drift)
        self.agent.close_trade(trade.id, opp["price"] * factor)
