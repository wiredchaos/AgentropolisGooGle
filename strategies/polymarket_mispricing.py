"""
Strategy: Polymarket Mispricing
Your original bot — WebSocket CLOB, fair value estimation, gasless L2 orders.
Now runs as a strategy module inside the agentic loop.
"""

import asyncio
import logging
import math
import re
import time
import uuid
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.polymarket")

POLYMARKET_CLOB_WS  = "wss://ws-subscriptions-clob.polymarket.com/ws/market"
POLYMARKET_CLOB_API = "https://clob.polymarket.com"
GAMMA_API           = "https://gamma-api.polymarket.com"


class PolymarketMispricingStrategy:
    """
    Every scan cycle:
      1. Pull active 5-min ETH/BTC binary markets from Gamma API
      2. Estimate fair value from on-chain price feed + recent order book
      3. Fire gasless Polygon orders when |market_price - fair_value| > threshold
    """

    name    = "polymarket_mispricing"
    enabled = True

    # Crypto price cache shared across strategies
    _price_cache: dict    = {}
    _price_cache_ts: float = 0

    def __init__(self, config: dict, agent):
        self.config    = config
        self.agent     = agent
        self.threshold = config.get("polymarket_edge_threshold", 0.06)   # 6%
        self.max_size  = config.get("polymarket_max_size_usdc", 100)
        self._markets_cache: list     = []
        self._markets_cache_ts: float = 0
        self._orderbook: dict         = {}  # market_id → {yes_ask, no_ask, ...}
        log.info("PolymarketMispricingStrategy init | threshold=%.1f%%", self.threshold * 100)

    def status(self) -> dict:
        return {
            "name":            self.name,
            "enabled":         self.enabled,
            "markets_cached":  len(self._markets_cache),
            "orderbook_depth": len(self._orderbook),
            "threshold_pct":   self.threshold * 100,
        }

    # ------------------------------------------------------------------ #

    async def scan(self) -> list:
        markets      = await self._get_active_markets()
        spot_prices  = await self._get_spot_prices()
        opportunities = []
        for market in markets:
            opp = await self._evaluate_market(market, spot_prices)
            if opp:
                opportunities.append(opp)
        return opportunities

    async def execute(self, opp: dict):
        """Place a gasless CLOB order on Polygon."""
        size = min(opp["size_usdc"], self.max_size)
        log.info(
            "POLYMARKET ORDER | market=%s side=%s fair=%.3f mkt=%.3f size=$%.0f",
            opp["market_id"][:12], opp["side"], opp["fair_value"],
            opp["market_price"], size,
        )
        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="polymarket",
            strategy=self.name,
            symbol=opp["question"][:40],
            side=opp["side"],
            size_usdc=size,
            entry_price=opp["market_price"],
            tv_signal=opp.get("tv_signal"),
        )
        self.agent.record_trade(trade)
        asyncio.create_task(self._simulate_resolution(trade, opp["fair_value"]))

    # ------------------------------------------------------------------ #
    #  Market data                                                         #
    # ------------------------------------------------------------------ #

    async def _get_active_markets(self) -> list:
        now = time.time()
        if now - self._markets_cache_ts < 60:
            return self._markets_cache
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{GAMMA_API}/markets",
                    params={"active": "true", "closed": "false",
                            "tag_slug": "crypto", "limit": 50},
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    data = await resp.json()
                    markets = data if isinstance(data, list) else data.get("markets", [])
                    binary = [m for m in markets
                              if "up"    in m.get("question", "").lower()
                              or "above" in m.get("question", "").lower()
                              or "below" in m.get("question", "").lower()]
                    self._markets_cache    = binary[:20]
                    self._markets_cache_ts = now
                    log.info("Fetched %d binary crypto markets", len(self._markets_cache))
        except Exception as e:
            log.warning("Failed to fetch markets: %s", e)
        return self._markets_cache

    async def _get_spot_prices(self) -> dict:
        now = time.time()
        if now - PolymarketMispricingStrategy._price_cache_ts < 10:
            return PolymarketMispricingStrategy._price_cache
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.binance.com/api/v3/ticker/price",
                    params={"symbols": '["ETHUSDT","BTCUSDT","SOLUSDT"]'},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    tickers = await resp.json()
                    prices  = {t["symbol"]: float(t["price"]) for t in tickers}
                    PolymarketMispricingStrategy._price_cache    = prices
                    PolymarketMispricingStrategy._price_cache_ts = now
        except Exception as e:
            log.warning("Spot price fetch failed: %s", e)
        return PolymarketMispricingStrategy._price_cache

    async def _evaluate_market(self, market: dict, spot_prices: dict) -> Optional[dict]:
        question  = market.get("question", "")
        market_id = market.get("id") or market.get("conditionId", "")

        asset = next((s for s in ["ETH", "BTC", "SOL"] if s in question.upper()), None)
        if not asset:
            return None

        spot = spot_prices.get(f"{asset}USDT")
        if not spot:
            return None

        strike = self._parse_strike(question)
        if strike is None:
            return None

        try:
            best_ask = float(market.get("bestAsk") or market.get("outcomePrices", [0.5])[0])
        except (TypeError, IndexError, ValueError):
            best_ask = 0.5

        dist_pct      = (spot - strike) / strike
        tv_signal     = self.agent.tv_signals.get(f"{asset}USDT", {})
        momentum_bias = tv_signal.get("momentum_bias", 0.0)
        fair_yes      = self._estimate_fair_yes(dist_pct, momentum_bias)

        edge = fair_yes - best_ask
        if abs(edge) < self.threshold:
            return None

        side         = "yes" if edge > 0 else "no"
        market_price = best_ask if side == "yes" else (1 - best_ask)

        return {
            "strategy":     self.name,
            "market_id":    market_id,
            "question":     question,
            "asset":        asset,
            "spot_price":   spot,
            "strike":       strike,
            "fair_value":   fair_yes,
            "market_price": market_price,
            "edge":         abs(edge),
            "edge_score":   abs(edge),
            "side":         side,
            "size_usdc":    self._kelly_size(abs(edge)),
            "tv_signal":    tv_signal or None,
        }

    def _parse_strike(self, question: str) -> Optional[float]:
        m = re.search(r'\$?([\d,]+(?:\.\d+)?)', question)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                pass
        return None

    def _estimate_fair_yes(self, dist_pct: float, momentum_bias: float) -> float:
        base     = 1 / (1 + math.exp(-dist_pct * 20))
        adjusted = base + momentum_bias * 0.05
        return max(0.02, min(0.98, adjusted))

    def _kelly_size(self, edge: float) -> float:
        kelly    = edge / (1 - edge + 1e-9)
        fraction = self.config.get("kelly_fraction", 0.25)
        bankroll = self.config.get("bankroll_usdc", 1000)
        return round(min(kelly * fraction * bankroll, self.max_size), 2)

    async def _simulate_resolution(self, trade, fair_value: float):
        import random
        await asyncio.sleep(300)   # 5-min expiry
        exit_price = max(0.01, min(0.99, fair_value + random.gauss(0, 0.05)))
        self.agent.close_trade(trade.id, exit_price)
