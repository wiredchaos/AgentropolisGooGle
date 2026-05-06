"""
core/accumulator.py — USDC profit accumulator
Collects realised profits from all strategies and compounds them into a
separate pool, optionally auto-deploying above a configurable high-water mark.
"""

import asyncio
import logging
import time
from datetime import datetime, timezone

log = logging.getLogger("core.accumulator")


class USDCAccumulator:
    def __init__(self, config: dict):
        self.config       = config
        self._balance     = 0.0
        self._total_in    = 0.0
        self._deposits: list = []
        self._start_time  = time.time()
        log.info("USDCAccumulator init")

    def deposit(self, amount: float, source: str = "unknown"):
        if amount <= 0:
            return
        self._balance   += amount
        self._total_in  += amount
        self._deposits.append({
            "amount":    round(amount, 4),
            "source":    source,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Accumulator deposit +$%.2f from %s | balance=$%.2f", amount, source, self._balance)

    @property
    def status(self) -> dict:
        return {
            "balance_usdc":    round(self._balance, 2),
            "total_in_usdc":   round(self._total_in, 2),
            "deposit_count":   len(self._deposits),
            "uptime_seconds":  round(time.time() - self._start_time, 1),
            "recent_deposits": self._deposits[-10:],
        }

    async def run(self):
        """Background loop — placeholder for auto-compounding or withdrawal logic."""
        interval = self.config.get("accumulator_interval_seconds", 300)
        while True:
            await asyncio.sleep(interval)
            if self._balance > 0:
                log.debug("Accumulator balance: $%.2f", self._balance)
