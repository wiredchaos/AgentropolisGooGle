"""
core/fair_value.py — Log-normal fair value model for binary prediction markets

Given a spot price, a strike, time to expiry, and realised/implied volatility
fetched from Binance klines, computes the probability that the asset closes
above (or below) the strike. This is a digital call/put priced under BSM.

Used by:
  - strategies/polymarket_mispricing.py  (single-market edge detection)
  - core/farm_worker.py                  (per-segment scan)
"""

import asyncio
import logging
import math
from typing import Optional
import aiohttp

log = logging.getLogger("core.fair_value")

BINANCE_API = "https://api.binance.com"


class FairValueModel:
    """
    Binary option fair value under log-normal (Black-Scholes) assumptions.

    P(S_T > K) = N(d2)   where d2 = [ln(S/K) + (μ - σ²/2)·T] / (σ·√T)

    Volatility is estimated from recent Binance OHLCV unless overridden in
    config via the "implied_vol" key.
    """

    def __init__(self, config: dict):
        self.config  = config
        self._vol_cache: dict = {}   # symbol → (ts, sigma)
        self._cache_ttl = 300        # re-fetch vol every 5 minutes

    async def price(
        self,
        spot: float,
        strike: float,
        expiry_seconds: float,
        symbol: str = "BTCUSDT",
        drift: float = 0.0,
    ) -> dict:
        """
        Compute fair YES (above-strike) and NO (below-strike) probabilities.

        Args:
            spot:            Current asset price in USDC.
            strike:          Market strike price.
            expiry_seconds:  Time to resolution in seconds.
            symbol:          Binance trading pair (e.g. "BTCUSDT").
            drift:           Annual log-return drift (default 0, risk-neutral).

        Returns:
            dict with keys: fair_yes, fair_no, sigma, d2, spot, strike
        """
        if expiry_seconds <= 0:
            above = 1.0 if spot > strike else 0.0
            return {"fair_yes": above, "fair_no": 1 - above, "sigma": 0.0, "d2": 0.0,
                    "spot": spot, "strike": strike}

        sigma = self.config.get("implied_vol") or await self._fetch_vol(symbol)
        T     = expiry_seconds / (365.25 * 24 * 3600)

        if sigma <= 0 or T <= 0:
            fair_yes = 1.0 if spot > strike else 0.0
            return {"fair_yes": fair_yes, "fair_no": 1 - fair_yes, "sigma": sigma,
                    "d2": 0.0, "spot": spot, "strike": strike}

        d2       = (math.log(spot / strike) + (drift - 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        fair_yes = _norm_cdf(d2)
        return {
            "fair_yes": round(fair_yes, 4),
            "fair_no":  round(1 - fair_yes, 4),
            "sigma":    round(sigma, 4),
            "d2":       round(d2, 4),
            "spot":     spot,
            "strike":   strike,
        }

    async def _fetch_vol(self, symbol: str) -> float:
        """Estimate annualised volatility from 1-hour Binance klines (20 candles)."""
        import time
        now   = time.time()
        entry = self._vol_cache.get(symbol)
        if entry and (now - entry[0]) < self._cache_ttl:
            return entry[1]

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{BINANCE_API}/api/v3/klines",
                    params={"symbol": symbol, "interval": "1h", "limit": 24},
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as r:
                    candles = await r.json()

            closes = [float(c[4]) for c in candles]
            if len(closes) < 2:
                return 0.80   # conservative fallback

            log_returns = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]
            mean_r      = sum(log_returns) / len(log_returns)
            variance    = sum((r - mean_r) ** 2 for r in log_returns) / (len(log_returns) - 1)
            sigma_hourly = math.sqrt(variance)
            sigma_annual = sigma_hourly * math.sqrt(8760)   # hourly → annual

            self._vol_cache[symbol] = (now, sigma_annual)
            log.debug("Vol %s: σ_annual=%.3f", symbol, sigma_annual)
            return sigma_annual

        except Exception as e:
            log.warning("Vol fetch failed for %s: %s — using 0.80 fallback", symbol, e)
            return 0.80   # conservative fallback


def _norm_cdf(x: float) -> float:
    """Approximation of the standard normal CDF (Abramowitz & Stegun 26.2.17)."""
    if x < -8:  return 0.0
    if x >  8:  return 1.0
    # Use math.erfc for accuracy
    return 0.5 * math.erfc(-x / math.sqrt(2))
