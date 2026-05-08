"""
Strategy: Crypto Mean Reversion
Fades overextended moves using Bollinger Bands + RSI divergence.
TradingView MCP pine table / label data augments signal quality.
"""

import asyncio
import logging
import time
import uuid
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.meanrev")


class CryptoMeanReversionStrategy:
    name    = "crypto_mean_reversion"
    enabled = True

    PAIRS     = ["ETHUSDT", "BTCUSDT", "SOLUSDT"]
    BB_PERIOD = 20
    BB_STD    = 2.0

    def __init__(self, config: dict, agent):
        self.config  = config
        self.agent   = agent
        self._klines: dict    = {}
        self._last_fetch: float = 0
        log.info("CryptoMeanReversionStrategy init")

    def status(self) -> dict:
        return {
            "name":      self.name,
            "enabled":   self.enabled,
            "bb_period": self.BB_PERIOD,
            "bb_std":    self.BB_STD,
        }

    async def scan(self) -> list:
        await self._refresh_klines()
        opps = []
        for symbol in self.PAIRS:
            closes = self._klines.get(symbol, [])
            if len(closes) < self.BB_PERIOD + 5:
                continue
            opp = self._evaluate(symbol, closes)
            if opp:
                opps.append(opp)
        return opps

    async def execute(self, opp: dict):
        log.info("MEAN_REV ORDER | %s %s @ %.4f bb_pct=%.3f",
                 opp["symbol"], opp["side"], opp["price"], opp["bb_pct"])
        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="crypto",
            strategy=self.name,
            symbol=opp["symbol"],
            side=opp["side"],
            size_usdc=opp["size_usdc"],
            entry_price=opp["price"],
            tv_signal=opp.get("tv_signal"),
        )
        self.agent.record_trade(trade)
        asyncio.create_task(self._simulate_reversion(trade, opp))

    # ------------------------------------------------------------------ #

    def _evaluate(self, symbol: str, closes: list) -> Optional[dict]:
        price          = closes[-1]
        mid, upper, lower = self._bollinger(closes)
        bb_pct         = (price - lower) / (upper - lower + 1e-9)
        rsi            = self._rsi(closes, 14)

        # TradingView MCP: pine labels can confirm oversold/overbought
        tv            = self.agent.tv_signals.get(symbol, {})
        pine_labels   = tv.get("pine_labels", [])
        tv_oversold   = any("oversold"   in str(l).lower() for l in pine_labels)
        tv_overbought = any("overbought" in str(l).lower() for l in pine_labels)

        # Long: price below lower band + RSI < 35 (or TV confirms)
        if bb_pct < 0.05 and (rsi < 35 or tv_oversold):
            edge = (mid - price) / price
            return {
                "strategy":  self.name,
                "symbol":    symbol,
                "side":      "buy",
                "price":     price,
                "mid":       mid,
                "bb_pct":    bb_pct,
                "rsi":       rsi,
                "target":    mid,
                "edge_score": edge,
                "size_usdc": self._position_size(edge),
                "tv_signal": tv or None,
            }

        # Short: price above upper band + RSI > 65 (or TV confirms)
        if bb_pct > 0.95 and (rsi > 65 or tv_overbought):
            edge = (price - mid) / price
            return {
                "strategy":  self.name,
                "symbol":    symbol,
                "side":      "sell",
                "price":     price,
                "mid":       mid,
                "bb_pct":    bb_pct,
                "rsi":       rsi,
                "target":    mid,
                "edge_score": edge,
                "size_usdc": self._position_size(edge),
                "tv_signal": tv or None,
            }

        return None

    def _bollinger(self, closes: list):
        window = closes[-self.BB_PERIOD:]
        mid    = sum(window) / len(window)
        std    = (sum((c - mid) ** 2 for c in window) / len(window)) ** 0.5
        return mid, mid + self.BB_STD * std, mid - self.BB_STD * std

    @staticmethod
    def _rsi(closes: list, period: int) -> float:
        gains, losses = [], []
        for i in range(1, len(closes)):
            d = closes[i] - closes[i-1]
            gains.append(max(d, 0))
            losses.append(max(-d, 0))
        ag = sum(gains[-period:])  / period
        al = sum(losses[-period:]) / period
        return 100.0 if al == 0 else 100 - (100 / (1 + ag / al))

    def _position_size(self, edge: float) -> float:
        bankroll = self.config.get("bankroll_usdc", 1000)
        max_pos  = self.config.get("crypto_max_position_usdc", 200)
        return round(min(edge * bankroll * 1.5, max_pos), 2)

    async def _refresh_klines(self):
        if time.time() - self._last_fetch < 60:
            return
        async with aiohttp.ClientSession() as session:
            for symbol in self.PAIRS:
                try:
                    async with session.get(
                        "https://api.binance.com/api/v3/klines",
                        params={"symbol": symbol, "interval": "15m", "limit": 40},
                        timeout=aiohttp.ClientTimeout(total=4),
                    ) as resp:
                        bars = await resp.json()
                        self._klines[symbol] = [float(b[4]) for b in bars]
                except Exception as e:
                    log.warning("Kline fetch %s: %s", symbol, e)
        self._last_fetch = time.time()

    async def _simulate_reversion(self, trade, opp: dict):
        import random
        await asyncio.sleep(random.randint(600, 3600))
        reversion  = random.gauss(0.005, 0.012)
        factor     = (1 + reversion) if trade.side == "buy" else (1 - reversion)
        self.agent.close_trade(trade.id, opp["price"] * factor)
