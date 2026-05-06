"""
core/fair_value.py — Log-Normal Binary Option Pricing v2
Replaces simple sigmoid with proper options-theoretic fair value.

For a binary YES contract expiring at time T:
  P(YES) = N(d2)  where d2 = (ln(S/K) + (r - 0.5*σ²)*T) / (σ*√T)

σ (implied vol) is estimated from recent Binance 5m klines.
TradingView momentum signals can tilt the fair value ±8%.
Position sizing uses fractional Kelly.
"""

import math
import logging
import time
from typing import Optional
import aiohttp

log = logging.getLogger("fair_value")


def _norm_cdf(x: float) -> float:
    """Standard normal CDF via Abramowitz & Stegun polynomial approximation."""
    t    = 1 / (1 + 0.2316419 * abs(x))
    poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
    res  = 1 - (1 / math.sqrt(2 * math.pi)) * math.exp(-0.5 * x * x) * poly
    return res if x >= 0 else 1 - res


class FairValueModel:
    """
    Log-normal binary option pricer with:
    - Real-time IV estimation from Binance 5m klines
    - TradingView momentum bias injection (±8% max)
    - Kelly-optimal position sizing
    - Confidence score output
    """

    _iv_cache: dict = {}   # symbol → (iv, timestamp)
    IV_CACHE_TTL = 300     # seconds

    def __init__(self, config: dict):
        self.config     = config
        self.risk_free  = config.get("risk_free_rate", 0.05)   # annualised
        self.iv_floor   = config.get("iv_floor", 0.40)         # 40% min
        self.iv_ceil    = config.get("iv_ceil", 4.0)           # 400% max
        self.min_edge   = config.get("polymarket_edge_threshold", 0.06)

    async def price(
        self,
        spot: float,
        strike: float,
        expiry_seconds: float,
        symbol: str,
        tv_signal: Optional[dict] = None,
    ) -> dict:
        """
        Compute fair value for a binary YES contract.

        Returns:
            fair_yes    — P(spot > strike at expiry)
            fair_no     — 1 - fair_yes
            iv          — estimated annualised volatility
            d2          — BSM d2 parameter
            T_hours     — time to expiry in hours
            confidence  — model confidence [0, 1]
            tv_boost    — momentum adjustment applied
        """
        T             = max(expiry_seconds / (365.25 * 24 * 3600), 1e-6)
        iv            = await self._get_iv(symbol)
        log_moneyness = math.log(spot / strike) if spot > 0 and strike > 0 else 0.0

        d2       = (log_moneyness + (self.risk_free - 0.5 * iv ** 2) * T) / (iv * math.sqrt(T))
        fair_yes = _norm_cdf(d2)

        # TradingView momentum: tilt fair value ±8% based on signal strength
        tv_boost = 0.0
        if tv_signal:
            bias     = tv_signal.get("momentum_bias", 0.0)   # -1 to +1
            conf     = tv_signal.get("confidence", 0.0)      # 0 to 1
            tv_boost = bias * conf * 0.08
            fair_yes = max(0.02, min(0.98, fair_yes + tv_boost))

        fair_no = 1 - fair_yes

        # Confidence: penalise extreme IV, reward strong TV signal
        iv_stability = 1 - min(abs(iv - 1.0) / 2.0, 0.5)
        tv_conf      = tv_signal.get("confidence", 0.5) if tv_signal else 0.5
        confidence   = (iv_stability + tv_conf) / 2

        return {
            "fair_yes":   round(fair_yes, 4),
            "fair_no":    round(fair_no, 4),
            "iv":         round(iv, 4),
            "d2":         round(d2, 4),
            "T_hours":    round(T * 8760, 2),
            "confidence": round(confidence, 3),
            "tv_boost":   round(tv_boost, 4),
            "spot":       spot,
            "strike":     strike,
        }

    def kelly_size(self, fair_p: float, market_p: float, bankroll: float) -> float:
        """
        Fractional Kelly position size.
        f* = (p·b − q) / b   where b = (1/market_p) − 1
        """
        if market_p <= 0 or market_p >= 1:
            return 0.0
        b       = (1 / market_p) - 1     # net odds
        q       = 1 - fair_p
        kelly_f = (fair_p * b - q) / b
        if kelly_f <= 0:
            return 0.0
        fraction = self.config.get("kelly_fraction", 0.25)
        max_size = self.config.get("polymarket_max_size_usdc", 100)
        return round(min(kelly_f * fraction * bankroll, max_size), 2)

    # ------------------------------------------------------------------ #
    #  IV estimation                                                       #
    # ------------------------------------------------------------------ #

    async def _get_iv(self, symbol: str) -> float:
        now    = time.time()
        cached = self._iv_cache.get(symbol)
        if cached and now - cached[1] < self.IV_CACHE_TTL:
            return cached[0]
        iv = await self._estimate_iv_from_klines(symbol)
        self._iv_cache[symbol] = (iv, now)
        return iv

    async def _estimate_iv_from_klines(self, symbol: str) -> float:
        """
        Realised volatility from 5m Binance klines, annualised.
        60 bars ≈ 5h of recent price action.
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.binance.com/api/v3/klines",
                    params={"symbol": symbol, "interval": "5m", "limit": 60},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    bars = await resp.json()

            closes = [float(b[4]) for b in bars]
            if len(closes) < 2:
                return self.iv_floor

            log_returns = [
                math.log(closes[i] / closes[i - 1])
                for i in range(1, len(closes))
                if closes[i - 1] > 0
            ]
            n        = len(log_returns)
            mean     = sum(log_returns) / n
            variance = sum((r - mean) ** 2 for r in log_returns) / (n - 1)
            std_5m   = math.sqrt(variance)

            # 5m bars → annualised: 365.25 * 24 * 12 bars per year
            iv_annual = std_5m * math.sqrt(365.25 * 24 * 12)
            iv        = max(self.iv_floor, min(self.iv_ceil, iv_annual))
            log.debug("IV %s: %.3f (raw=%.3f)", symbol, iv, iv_annual)
            return iv

        except Exception as e:
            log.warning("IV estimation failed for %s: %s — using floor %.2f", symbol, e, self.iv_floor)
            return self.iv_floor
