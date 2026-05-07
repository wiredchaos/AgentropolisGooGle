"""
Fair Value Model v3 — now powered by OKX MCP
Replaces Binance klines with OKX candlesticks via agent-trade-kit.
Single shared OKXMCPConnector instance → batch price fetches → minimal API calls.
"""

import math
import logging
import time
from typing import Optional

log = logging.getLogger("fair_value")


def norm_cdf(x: float) -> float:
    t      = 1 / (1 + 0.2316419 * abs(x))
    poly   = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    result = 1 - (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x * x) * poly
    return result if x >= 0 else 1 - result


class FairValueModel:
    """
    Log-normal binary option pricer.
    IV estimated from OKX candlestick data via MCP connector.
    Shared connector passed in — no duplicate API calls.
    """

    _iv_cache: dict = {}
    IV_CACHE_TTL    = 300

    def __init__(self, config: dict, okx_connector=None):
        self.config    = config
        self.okx       = okx_connector   # shared OKXMCPConnector
        self.risk_free = config.get("risk_free_rate", 0.05)
        self.iv_floor  = config.get("iv_floor", 0.40)
        self.iv_ceil   = config.get("iv_ceil", 4.0)

    async def price(
        self,
        spot: float,
        strike: float,
        expiry_seconds: float,
        symbol: str,
        tv_signal: Optional[dict] = None,
    ) -> dict:
        T    = max(expiry_seconds / (365.25 * 24 * 3600), 1e-6)
        iv   = await self._get_iv(symbol)

        log_m    = math.log(spot / strike) if spot > 0 and strike > 0 else 0.0
        d2       = (log_m + (self.risk_free - 0.5 * iv ** 2) * T) / (iv * math.sqrt(T))
        fair_yes = norm_cdf(d2)

        tv_boost = 0.0
        if tv_signal:
            bias     = tv_signal.get("momentum_bias", 0.0)
            conf     = tv_signal.get("confidence", 0.0)
            tv_boost = bias * conf * 0.08
            fair_yes = max(0.02, min(0.98, fair_yes + tv_boost))

        iv_stability = 1 - min(abs(iv - 1.0) / 2.0, 0.5)
        tv_conf      = tv_signal.get("confidence", 0.5) if tv_signal else 0.5
        confidence   = (iv_stability + tv_conf) / 2

        return {
            "fair_yes":   round(fair_yes, 4),
            "fair_no":    round(1 - fair_yes, 4),
            "iv":         round(iv, 4),
            "d2":         round(d2, 4),
            "T_hours":    round(T * 8760, 2),
            "confidence": round(confidence, 3),
            "tv_boost":   round(tv_boost, 4),
            "spot":       spot,
            "strike":     strike,
        }

    def kelly_size(self, fair_p: float, market_p: float, bankroll: float) -> float:
        if market_p <= 0 or market_p >= 1:
            return 0.0
        b       = (1 / market_p) - 1
        q       = 1 - fair_p
        kelly_f = (fair_p * b - q) / b
        if kelly_f <= 0:
            return 0.0
        fraction = self.config.get("kelly_fraction", 0.25)
        max_size = self.config.get("polymarket_max_size_usdc", 100)
        return round(min(kelly_f * fraction * bankroll, max_size), 2)

    async def _get_iv(self, symbol: str) -> float:
        now = time.time()
        # OKX uses BTC-USDT format; normalise from Binance-style BTCUSDT if needed
        okx_sym = symbol.replace("USDT", "-USDT") if "-" not in symbol else symbol
        cached  = self._iv_cache.get(okx_sym)
        if cached and now - cached[1] < self.IV_CACHE_TTL:
            return cached[0]
        iv = await self._estimate_iv(okx_sym)
        self._iv_cache[okx_sym] = (iv, now)
        return iv

    async def _estimate_iv(self, okx_symbol: str) -> float:
        try:
            if self.okx:
                candles = await self.okx.get_candlesticks(okx_symbol, bar="5m", limit=60)
                closes  = [c["close"] for c in candles if "close" in c]
            else:
                import aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        "https://www.okx.com/api/v5/market/candles",
                        params={"instId": okx_symbol, "bar": "5m", "limit": "60"},
                        timeout=aiohttp.ClientTimeout(total=4),
                    ) as r:
                        data   = await r.json()
                        closes = [float(c[4]) for c in data.get("data", [])]

            if len(closes) < 2:
                return self.iv_floor

            log_returns = [
                math.log(closes[i] / closes[i - 1])
                for i in range(1, len(closes))
                if closes[i - 1] > 0
            ]
            n    = len(log_returns)
            mean = sum(log_returns) / n
            var  = sum((r - mean) ** 2 for r in log_returns) / (n - 1)
            iv   = math.sqrt(var) * math.sqrt(365.25 * 24 * 12)
            return max(self.iv_floor, min(self.iv_ceil, iv))

        except Exception as e:
            log.debug("IV estimation failed %s: %s", okx_symbol, e)
            return self.iv_floor
