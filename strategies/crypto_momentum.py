"""
Strategy: Crypto Momentum
Rides strong trend moves on Binance spot/perps.
Uses EMA crossover + RSI confirmation from TradingView MCP signals.
"""

import asyncio
import logging
import time
import uuid
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.momentum")

BINANCE_API = "https://api.binance.com/api/v3"


class CryptoMomentumStrategy:
    name    = "crypto_momentum"
    enabled = True

    PAIRS = ["ETHUSDT", "BTCUSDT", "SOLUSDT", "AVAXUSDT", "LINKUSDT"]

    def __init__(self, config: dict, agent):
        self.config   = config
        self.agent    = agent
        self.min_rsi  = config.get("momentum_min_rsi", 55)
        self.max_rsi  = config.get("momentum_max_rsi", 75)
        self.ema_span = config.get("momentum_ema_lookback", 20)
        self._klines: dict    = {}   # symbol → list of closes
        self._last_fetch: float = 0
        log.info("CryptoMomentumStrategy init | pairs=%s", self.PAIRS)

    def status(self) -> dict:
        return {
            "name":    self.name,
            "enabled": self.enabled,
            "pairs":   self.PAIRS,
            "min_rsi": self.min_rsi,
            "max_rsi": self.max_rsi,
        }

    async def scan(self) -> list:
        await self._refresh_klines()
        opportunities = []
        for symbol in self.PAIRS:
            closes = self._klines.get(symbol, [])
            if len(closes) < 30:
                continue
            opp = self._evaluate(symbol, closes)
            if opp:
                opportunities.append(opp)
        return opportunities

    async def execute(self, opp: dict):
        log.info("MOMENTUM ORDER | %s %s @ %.4f edge=%.3f",
                 opp["symbol"], opp["side"], opp["price"], opp["edge_score"])
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
        asyncio.create_task(self._simulate_momentum_exit(trade, opp))

    # ------------------------------------------------------------------ #

    def _evaluate(self, symbol: str, closes: list) -> Optional[dict]:
        rsi   = self._rsi(closes, 14)
        ema9  = self._ema(closes, 9)
        ema21 = self._ema(closes, 21)
        price = closes[-1]

        # TradingView MCP: lower RSI bar when TV confirms bull trend
        tv       = self.agent.tv_signals.get(symbol, {})
        tv_trend = tv.get("trend", "neutral")
        rsi_min  = self.min_rsi - (5 if tv_trend == "bull" else 0)
        rsi_max  = self.max_rsi + (5 if tv_trend == "bull" else 0)

        # Bullish momentum
        if ema9 > ema21 and rsi_min < rsi < rsi_max:
            edge = (ema9 - ema21) / ema21
            if edge > 0.001:
                return {
                    "strategy":  self.name,
                    "symbol":    symbol,
                    "side":      "buy",
                    "price":     price,
                    "rsi":       rsi,
                    "ema9":      ema9,
                    "ema21":     ema21,
                    "edge_score": edge,
                    "size_usdc": self._position_size(edge),
                    "tv_signal": tv or None,
                }

        # Bearish momentum
        if ema9 < ema21 and (100 - self.max_rsi) < (100 - rsi) < (100 - self.min_rsi + 10):
            edge = (ema21 - ema9) / ema21
            if edge > 0.001:
                return {
                    "strategy":  self.name,
                    "symbol":    symbol,
                    "side":      "sell",
                    "price":     price,
                    "rsi":       rsi,
                    "edge_score": edge,
                    "size_usdc": self._position_size(edge),
                    "tv_signal": tv or None,
                }
        return None

    async def _refresh_klines(self):
        if time.time() - self._last_fetch < 60:
            return
        async with aiohttp.ClientSession() as session:
            tasks = [self._fetch_kline(session, sym) for sym in self.PAIRS]
            await asyncio.gather(*tasks, return_exceptions=True)
        self._last_fetch = time.time()

    async def _fetch_kline(self, session, symbol: str):
        try:
            async with session.get(
                f"{BINANCE_API}/klines",
                params={"symbol": symbol, "interval": "5m", "limit": 50},
                timeout=aiohttp.ClientTimeout(total=4),
            ) as resp:
                bars = await resp.json()
                self._klines[symbol] = [float(b[4]) for b in bars]
        except Exception as e:
            log.warning("Kline fetch failed %s: %s", symbol, e)

    @staticmethod
    def _ema(closes: list, span: int) -> float:
        k   = 2 / (span + 1)
        ema = closes[0]
        for c in closes[1:]:
            ema = c * k + ema * (1 - k)
        return ema

    @staticmethod
    def _rsi(closes: list, period: int) -> float:
        gains, losses = [], []
        for i in range(1, len(closes)):
            d = closes[i] - closes[i-1]
            gains.append(max(d, 0))
            losses.append(max(-d, 0))
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        if avg_loss == 0:
            return 100.0
        return 100 - (100 / (1 + avg_gain / avg_loss))

    def _position_size(self, edge: float) -> float:
        bankroll = self.config.get("bankroll_usdc", 1000)
        max_pos  = self.config.get("crypto_max_position_usdc", 200)
        return round(min(edge * bankroll * 2, max_pos), 2)

    async def _simulate_momentum_exit(self, trade, opp: dict):
        import random
        await asyncio.sleep(random.randint(300, 1800))
        drift      = random.gauss(0.003, 0.015)
        exit_price = opp["price"] * (1 + drift if trade.side == "buy" else 1 - drift)
        self.agent.close_trade(trade.id, exit_price)
