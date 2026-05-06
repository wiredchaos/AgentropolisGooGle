"""
Farm Worker
One worker per market segment. Runs fast cycles, reports to orchestrator.

Deploy as N identical Railway services with different WORKER_SEGMENT env vars.
Each worker is stateless — orchestrator owns global state.

Environment:
  WORKER_SEGMENT       e.g. "btc_5m", "eth_15m", "funding", "liq_hunt"
  ORCHESTRATOR_URL     e.g. "https://neuro-orchestrator.railway.app"
  WORKER_ID            optional, auto-generated if not set
  DRY_RUN              "1" (default) or "0" for live execution
"""

import asyncio
import logging
import os
import time
import uuid
import aiohttp

log = logging.getLogger("worker")

ORCHESTRATOR_URL = os.getenv("ORCHESTRATOR_URL", "http://localhost:8765")
WORKER_SEGMENT   = os.getenv("WORKER_SEGMENT", "btc_5m")
WORKER_ID        = os.getenv("WORKER_ID", f"w_{uuid.uuid4().hex[:6]}")
DRY_RUN          = os.getenv("DRY_RUN", "1") == "1"


class FarmWorker:
    """
    Lean agent that owns one market segment.
    Scans → finds edge → claims market from orchestrator → executes → releases.
    """

    def __init__(self):
        self.segment           = WORKER_SEGMENT
        self.worker_id         = WORKER_ID
        self.assignment: dict  = {}
        self.trades_today      = 0
        self.pnl_today         = 0.0
        self.active_positions: dict = {}
        self._running          = False
        self._session: aiohttp.ClientSession = None

        log.info(
            "Worker %s | segment=%s | orchestrator=%s | dry_run=%s",
            self.worker_id, self.segment, ORCHESTRATOR_URL, DRY_RUN,
        )

    async def run(self):
        self._session = aiohttp.ClientSession()
        try:
            self.assignment = await self._register()
            log.info(
                "Assignment: capital=$%.0f cycle=%ds",
                self.assignment.get("capital_allocation", 0),
                self.assignment.get("cycle_interval", 30),
            )
            self._running = True
            await asyncio.gather(
                self._scan_loop(),
                self._heartbeat_loop(),
            )
        finally:
            await self._session.close()

    # ------------------------------------------------------------------ #
    #  Core loops                                                          #
    # ------------------------------------------------------------------ #

    async def _scan_loop(self):
        cycle = self.assignment.get("cycle_interval", 20)
        while self._running:
            t0 = time.time()
            try:
                await self._cycle()
            except Exception as e:
                log.error("Cycle error: %s", e, exc_info=True)
            elapsed = time.time() - t0
            await asyncio.sleep(max(0, cycle - elapsed))

    async def _cycle(self):
        seg_config = self.assignment.get("segment_config", {})
        asset      = seg_config.get("asset", "BTC")
        window_min = seg_config.get("window_min", 15)
        threshold  = self.assignment.get("edge_threshold", 0.06)
        capital    = self.assignment.get("capital_allocation", 100)

        opportunities = await self._scan_segment(asset, window_min, threshold)
        if not opportunities:
            return

        ranked = sorted(opportunities, key=lambda o: o.get("edge_score", 0), reverse=True)

        for opp in ranked[:3]:   # max 3 concurrent per worker
            market_id = opp.get("market_id", "")
            if not market_id:
                continue

            claimed = await self._claim_market(market_id)
            if not claimed:
                continue   # another worker already on it

            try:
                await self._execute(opp, capital)
            finally:
                await self._release_market(market_id)

    async def _heartbeat_loop(self):
        while self._running:
            await self._send_heartbeat()
            await asyncio.sleep(15)

    # ------------------------------------------------------------------ #
    #  Segment scanner                                                     #
    # ------------------------------------------------------------------ #

    async def _scan_segment(self, asset: str, window_min: int, threshold: float) -> list:
        if self.segment == "funding":
            return await self._scan_funding_rates()
        elif self.segment == "liq_hunt":
            return await self._scan_liquidations(asset)
        else:
            return await self._scan_polymarket(asset, window_min, threshold)

    async def _scan_polymarket(self, asset: str, window_min: int, threshold: float) -> list:
        opps = []
        try:
            async with self._session.get(
                "https://api.binance.com/api/v3/ticker/price",
                params={"symbol": f"{asset}USDT"},
                timeout=aiohttp.ClientTimeout(total=3),
            ) as r:
                spot = float((await r.json()).get("price", 0))

            if not spot:
                return []

            async with self._session.get(
                "https://gamma-api.polymarket.com/markets",
                params={"active": "true", "closed": "false", "tag_slug": "crypto", "limit": 30},
                timeout=aiohttp.ClientTimeout(total=5),
            ) as r:
                data    = await r.json()
                markets = data if isinstance(data, list) else data.get("markets", [])

            for m in markets:
                q = m.get("question", "")
                if asset not in q.upper():
                    continue

                import re
                match = re.search(r'\$?([\d,]+(?:\.\d+)?)', q)
                if not match:
                    continue
                strike = float(match.group(1).replace(",", ""))

                from core.fair_value import FairValueModel
                fvm    = FairValueModel(self.assignment)
                result = await fvm.price(
                    spot=spot, strike=strike,
                    expiry_seconds=window_min * 60,
                    symbol=f"{asset}USDT",
                )
                best_ask = float(m.get("bestAsk") or 0.5)
                edge     = result["fair_yes"] - best_ask

                if abs(edge) >= threshold:
                    opps.append({
                        "strategy":     f"polymarket_{asset.lower()}_{window_min}m",
                        "market_id":    m.get("id") or m.get("conditionId", ""),
                        "question":     q[:60],
                        "asset":        asset,
                        "spot":         spot,
                        "strike":       strike,
                        "fair_yes":     result["fair_yes"],
                        "market_price": best_ask,
                        "edge":         abs(edge),
                        "edge_score":   abs(edge),
                        "side":         "yes" if edge > 0 else "no",
                        "worker_id":    self.worker_id,
                        "segment":      self.segment,
                    })

        except Exception as e:
            log.warning("Polymarket scan error: %s", e)

        return opps

    async def _scan_funding_rates(self) -> list:
        opps = []
        try:
            async with self._session.get(
                "https://fapi.binance.com/fapi/v1/premiumIndex",
                timeout=aiohttp.ClientTimeout(total=4),
            ) as r:
                items = await r.json()

            for item in items:
                sym  = item.get("symbol", "")
                rate = float(item.get("lastFundingRate", 0))
                if abs(rate) > 0.0008:
                    opps.append({
                        "strategy":   "funding_arb",
                        "market_id":  f"fund_{sym}_{int(time.time()//28800)}",
                        "symbol":     sym,
                        "funding_rate": rate,
                        "edge_score": abs(rate) * 10,
                        "worker_id":  self.worker_id,
                        "segment":    self.segment,
                    })
        except Exception as e:
            log.warning("Funding scan error: %s", e)
        return opps

    async def _scan_liquidations(self, asset: str) -> list:
        # Delegates to liquidation_hunter.py strategy in a full implementation
        return []

    # ------------------------------------------------------------------ #
    #  Execution                                                           #
    # ------------------------------------------------------------------ #

    async def _execute(self, opp: dict, capital: float):
        size = min(opp.get("edge_score", 0.06) * capital * 0.5, capital * 0.3)
        size = round(size, 2)

        log.info(
            "EXECUTE | %s %s edge=%.3f size=$%.2f dry=%s",
            opp.get("strategy"), opp.get("side", ""), opp.get("edge_score", 0), size, DRY_RUN,
        )

        trade = {
            "id":           uuid.uuid4().hex[:8],
            "worker_id":    self.worker_id,
            "segment":      self.segment,
            "strategy":     opp.get("strategy"),
            "market_id":    opp.get("market_id"),
            "symbol":       opp.get("asset") or opp.get("symbol"),
            "side":         opp.get("side"),
            "size_usdc":    size,
            "entry_price":  opp.get("market_price", 0.5),
            "edge_score":   opp.get("edge_score"),
            "dry_run":      DRY_RUN,
            "timestamp":    time.time(),
        }

        if not DRY_RUN:
            from connectors.polymarket_executor import PolymarketExecutor
            executor = PolymarketExecutor(self.assignment)
            await executor.place_order(
                token_id=opp.get("market_id", ""),
                side="BUY" if opp.get("side") == "yes" else "SELL",
                price=opp.get("market_price", 0.5),
                size=size,
            )

        await self._report_trade(trade)
        self.trades_today += 1
        self.active_positions[trade["id"]] = trade

    # ------------------------------------------------------------------ #
    #  Orchestrator comms                                                  #
    # ------------------------------------------------------------------ #

    async def _register(self) -> dict:
        for attempt in range(10):
            try:
                async with self._session.post(
                    f"{ORCHESTRATOR_URL}/worker/register",
                    json={"worker_id": self.worker_id, "segment": self.segment},
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as r:
                    return await r.json()
            except Exception as e:
                log.warning("Register attempt %d failed: %s", attempt + 1, e)
                await asyncio.sleep(3 * (attempt + 1))
        return {}

    async def _claim_market(self, market_id: str) -> bool:
        try:
            async with self._session.post(
                f"{ORCHESTRATOR_URL}/worker/claim-market",
                json={"market_id": market_id, "worker_id": self.worker_id},
                timeout=aiohttp.ClientTimeout(total=2),
            ) as r:
                return (await r.json()).get("claimed", False)
        except Exception:
            return True   # if orchestrator unreachable, assume claimed

    async def _release_market(self, market_id: str):
        try:
            await self._session.post(
                f"{ORCHESTRATOR_URL}/worker/release-market",
                json={"market_id": market_id},
                timeout=aiohttp.ClientTimeout(total=2),
            )
        except Exception:
            pass

    async def _send_heartbeat(self):
        try:
            await self._session.post(
                f"{ORCHESTRATOR_URL}/worker/heartbeat",
                json={
                    "worker_id": self.worker_id,
                    "state": {
                        "trades_today":     self.trades_today,
                        "pnl_today":        self.pnl_today,
                        "active_positions": len(self.active_positions),
                        "segment":          self.segment,
                    },
                },
                timeout=aiohttp.ClientTimeout(total=3),
            )
        except Exception:
            pass

    async def _report_trade(self, trade: dict):
        try:
            await self._session.post(
                f"{ORCHESTRATOR_URL}/worker/trade",
                json=trade,
                timeout=aiohttp.ClientTimeout(total=3),
            )
        except Exception:
            pass


async def run_worker():
    worker = FarmWorker()
    await worker.run()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(run_worker())
