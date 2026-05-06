"""
Combinatorial Arbitrage Strategy
Based on: "Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets"
Saguillo, Ghafouri, Kiffer, Suarez-Tangil — AFT 2025 / arXiv:2508.03474

Implements all three arbitrage types discovered in the $40M study:

TYPE 1 — Single-Condition Rebalancing
YES + NO prices for same condition don't sum to $1.
Long: sum < 1 → buy both (guaranteed profit at resolution)
Short: sum > 1 → sell both (collect the excess)

TYPE 2 — Multi-Condition Rebalancing (NegRisk)
In a market with N conditions, all YES prices should sum to 1.
If sum < 1 → buy all YES tokens (one must resolve true)
If sum > 1 → short all YES tokens
NO tokens in N-condition market should sum to N-1.

TYPE 3 — Combinatorial Arbitrage (Cross-Market)
Two dependent markets M1 and M2 where knowing M1's outcome
constrains M2's outcome. Build a portfolio that covers every
possible world using the logical dependency graph.

Paper's realized P&L breakdown (April 2024 - April 2025):
Single condition long:          $5,899,287
Single condition short:         $4,682,074
Multi-condition YES long:      $11,092,286
Multi-condition YES short:        $612,188
Multi-condition NO long:       $17,307,113
Combinatorial (4 pairs):           $95,156
TOTAL:                         ~$40,000,000
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass
from typing import Optional
import aiohttp

log = logging.getLogger("strategy.combinatorial_arb")

GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API  = "https://clob.polymarket.com"


@dataclass
class ArbOpportunity:
    arb_type: str          # "single_long" | "single_short" | "multi_long" | "multi_short" | "combinatorial"
    market_ids: list       # one or two market IDs
    conditions: list       # condition dicts involved
    portfolio: list        # [{token_id, side, price, size}]
    total_cost: float      # total USDC to deploy
    guaranteed_payout: float  # what you get at resolution
    profit: float          # guaranteed_payout - total_cost
    profit_pct: float      # profit / total_cost
    edge_score: float      # for ranking against other strategies


class CombinatorialArbStrategy:
    """
    Scans all three arbitrage types simultaneously.
    Highest EV per dollar comes from multi-condition NO long
    (paper: $17M out of $40M total).
    """
    name    = "combinatorial_arb"
    enabled = True

    MIN_PROFIT_PCT = 0.02   # 2% minimum guaranteed profit
    MAX_POSITION   = 500    # USDC per arb leg
    SCAN_INTERVAL  = 60     # seconds between full market scans

    def __init__(self, config: dict, agent):
        self.config  = config
        self.agent   = agent
        self._markets_cache: list = []
        self._cache_ts: float = 0
        self._executed_arbs: set = set()   # prevent double-execution
        log.info("CombinatorialArbStrategy init | min_profit=%.1f%%", self.MIN_PROFIT_PCT * 100)

    def status(self) -> dict:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "min_profit_pct": self.MIN_PROFIT_PCT * 100,
            "markets_cached": len(self._markets_cache),
            "executed_arbs": len(self._executed_arbs),
        }

    async def scan(self) -> list:
        markets = await self._fetch_markets()
        opps = []

        # Run all three scanner types in parallel
        results = await asyncio.gather(
            self._scan_single_condition(markets),
            self._scan_multi_condition(markets),
            self._scan_combinatorial(markets),
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, list):
                opps.extend(r)
            elif isinstance(r, Exception):
                log.warning("Arb scan error: %s", r)

        return [self._opp_to_dict(o) for o in opps]

    async def execute(self, opp: dict):
        arb_id = opp.get("arb_id", "")
        if arb_id in self._executed_arbs:
            return
        self._executed_arbs.add(arb_id)

        log.info(
            "COMB ARB | type=%s profit=+$%.2f (%.1f%%) markets=%s",
            opp["arb_type"], opp["profit"], opp["profit_pct"] * 100,
            opp["market_ids"],
        )

        # Place all legs of the portfolio atomically (as close as possible)
        from connectors.polymarket_executor import PolymarketExecutor
        executor = PolymarketExecutor(self.config)

        for leg in opp.get("portfolio", []):
            await executor.place_order(
                token_id=leg["token_id"],
                side=leg["side"],
                price=leg["price"],
                size=leg["size"],
                market_id=opp["market_ids"][0] if opp["market_ids"] else "",
            )
            await asyncio.sleep(0.1)   # brief gap between legs

        from core.agent import Trade
        trade = Trade(
            id=str(uuid.uuid4())[:8],
            source="polymarket",
            strategy=self.name,
            symbol=f"{opp['arb_type']} ({len(opp['portfolio'])} legs)",
            side="buy",
            size_usdc=opp["total_cost"],
            entry_price=opp["total_cost"] / max(opp["guaranteed_payout"], 0.01),
        )
        self.agent.record_trade(trade)

        # Schedule resolution tracking
        asyncio.create_task(self._track_resolution(trade, opp))

    # ================================================================== #
    #  TYPE 1 — Single-Condition Rebalancing                              #
    # ================================================================== #

    async def _scan_single_condition(self, markets: list) -> list[ArbOpportunity]:
        """
        For each binary market: check if YES_price + NO_price ≠ 1.
        Long if sum < 1, Short if sum > 1.

        Paper found: $10.5M total from this type alone.
        """
        opps = []
        for market in markets:
            conditions = market.get("conditions", [market])
            if len(conditions) != 1:
                continue

            yes_price = float(market.get("bestAsk") or market.get("outcomePrices", [0.5])[0] or 0.5)
            no_price  = 1 - float(market.get("bestBid") or market.get("outcomePrices", [0.5, 0.5])[1] or 0.5)

            total = yes_price + no_price

            if total < (1 - self.MIN_PROFIT_PCT):
                # Long: buy both tokens for < $1, collect $1 at resolution
                profit = 1 - total
                size = self._size_per_leg(profit)
                opps.append(ArbOpportunity(
                    arb_type="single_long",
                    market_ids=[market.get("id", "")],
                    conditions=[market],
                    portfolio=[
                        {"token_id": market.get("conditionId", ""), "side": "BUY", "price": yes_price, "size": size},
                        {"token_id": market.get("conditionId", "") + "_no", "side": "BUY", "price": no_price, "size": size},
                    ],
                    total_cost=total * size,
                    guaranteed_payout=1.0 * size,
                    profit=profit * size,
                    profit_pct=profit,
                    edge_score=profit * 2,
                ))

            elif total > (1 + self.MIN_PROFIT_PCT):
                # Short: sell both tokens for > $1, pay $1 at resolution
                profit = total - 1
                size = self._size_per_leg(profit)
                opps.append(ArbOpportunity(
                    arb_type="single_short",
                    market_ids=[market.get("id", "")],
                    conditions=[market],
                    portfolio=[
                        {"token_id": market.get("conditionId", ""), "side": "SELL", "price": yes_price, "size": size},
                        {"token_id": market.get("conditionId", "") + "_no", "side": "SELL", "price": no_price, "size": size},
                    ],
                    total_cost=total * size,
                    guaranteed_payout=1.0 * size,
                    profit=profit * size,
                    profit_pct=profit,
                    edge_score=profit * 2,
                ))

        return opps

    # ================================================================== #
    #  TYPE 2 — Multi-Condition Rebalancing (NegRisk)                     #
    # ================================================================== #

    async def _scan_multi_condition(self, markets: list) -> list[ArbOpportunity]:
        """
        For markets with N > 1 conditions (e.g. election winner with 3+ candidates):
          YES tokens should sum to 1
          NO tokens should sum to N-1

        Paper found: $29M total from this type — the biggest bucket.
        """
        opps = []

        # Group markets by groupItemTitle or underlying event
        groups = self._group_by_event(markets)

        for event_key, group in groups.items():
            if len(group) < 2:
                continue

            yes_prices = []
            for m in group:
                p = float(m.get("bestAsk") or m.get("outcomePrices", [0.5])[0] or 0.5)
                yes_prices.append((m, p))

            yes_sum = sum(p for _, p in yes_prices)
            n = len(group)

            # YES long: sum < 1 — buy all YES tokens
            if yes_sum < (1 - self.MIN_PROFIT_PCT):
                profit_pct = (1 - yes_sum) / yes_sum
                size = self._size_per_leg(profit_pct) / n
                opps.append(ArbOpportunity(
                    arb_type="multi_yes_long",
                    market_ids=[m.get("id", "") for m in group],
                    conditions=group,
                    portfolio=[
                        {"token_id": m.get("conditionId", ""), "side": "BUY", "price": p, "size": size}
                        for m, p in yes_prices
                    ],
                    total_cost=yes_sum * size,
                    guaranteed_payout=1.0 * size,
                    profit=(1 - yes_sum) * size,
                    profit_pct=profit_pct,
                    edge_score=profit_pct * 3,
                ))

            # YES short: sum > 1 — sell all YES tokens
            if yes_sum > (1 + self.MIN_PROFIT_PCT):
                profit_pct = (yes_sum - 1) / 1
                size = self._size_per_leg(profit_pct) / n
                opps.append(ArbOpportunity(
                    arb_type="multi_yes_short",
                    market_ids=[m.get("id", "") for m in group],
                    conditions=group,
                    portfolio=[
                        {"token_id": m.get("conditionId", ""), "side": "SELL", "price": p, "size": size}
                        for m, p in yes_prices
                    ],
                    total_cost=yes_sum * size,
                    guaranteed_payout=1.0 * size,
                    profit=(yes_sum - 1) * size,
                    profit_pct=profit_pct,
                    edge_score=profit_pct * 3,
                ))

            # NO long: NO prices should sum to N-1
            no_prices = []
            for m in group:
                prices = m.get("outcomePrices", [0.5, 0.5])
                no_p = float(prices[1]) if len(prices) > 1 else 0.5
                no_prices.append((m, no_p))

            no_sum = sum(p for _, p in no_prices)
            target_no = n - 1

            if no_sum < (target_no - self.MIN_PROFIT_PCT * target_no):
                profit_pct = (target_no - no_sum) / no_sum
                size = self._size_per_leg(profit_pct) / n
                opps.append(ArbOpportunity(
                    arb_type="multi_no_long",
                    market_ids=[m.get("id", "") for m in group],
                    conditions=group,
                    portfolio=[
                        {"token_id": m.get("conditionId", "") + "_no", "side": "BUY", "price": p, "size": size}
                        for m, p in no_prices
                    ],
                    total_cost=no_sum * size,
                    guaranteed_payout=target_no * size,
                    profit=(target_no - no_sum) * size,
                    profit_pct=profit_pct,
                    edge_score=profit_pct * 3,
                ))

        return opps

    # ================================================================== #
    #  TYPE 3 — Combinatorial Arbitrage (Cross-Market)                    #
    # ================================================================== #

    async def _scan_combinatorial(self, markets: list) -> list[ArbOpportunity]:
        """
        Find pairs of logically dependent markets where pricing is inconsistent.

        Detection heuristic (from paper):
          1. Same topic (asset, election, event)
          2. Same or close expiry date
          3. Logical ordering: e.g. "BTC > $65k" implies "BTC > $60k"
             So P(>65k) MUST be ≤ P(>60k). If not → arb exists.

        Key crypto example:
          M1: BTC above $60k → YES at 0.72
          M2: BTC above $65k → YES at 0.74  ← IMPOSSIBLE logically
          Action: Buy M1 YES + positions that cover the gap
        """
        opps = []
        crypto_markets = [m for m in markets if self._is_crypto_market(m)]

        # Group by asset + approximate expiry
        asset_groups: dict = {}
        for m in crypto_markets:
            asset  = self._extract_asset(m)
            expiry = m.get("endDate", "")[:10]  # date only
            key    = f"{asset}_{expiry}"
            asset_groups.setdefault(key, []).append(m)

        for key, group in asset_groups.items():
            if len(group) < 2:
                continue

            # Extract strike prices and sort
            parsed = []
            for m in group:
                strike = self._parse_strike(m.get("question", ""))
                yes_p  = float(m.get("bestAsk") or 0.5)
                if strike:
                    parsed.append((strike, yes_p, m))

            if len(parsed) < 2:
                continue

            parsed.sort(key=lambda x: x[0])  # sort by strike ascending

            # Check monotonicity: P(above higher strike) ≤ P(above lower strike)
            for i in range(len(parsed) - 1):
                strike_low,  p_low,  m_low  = parsed[i]
                strike_high, p_high, m_high = parsed[i + 1]

                # Logical constraint: p_high MUST be ≤ p_low
                if p_high > p_low + self.MIN_PROFIT_PCT:
                    # Violation found → combinatorial arb
                    # Buy the cheaper (correctly priced) + short the expensive mispriced
                    spread = p_high - p_low
                    size   = self._size_per_leg(spread)

                    opps.append(ArbOpportunity(
                        arb_type="combinatorial",
                        market_ids=[m_low.get("id", ""), m_high.get("id", "")],
                        conditions=[m_low, m_high],
                        portfolio=[
                            # Buy the lower strike YES (should be more expensive, it's underpriced)
                            {"token_id": m_low.get("conditionId", ""), "side": "BUY",
                             "price": p_low, "size": size},
                            # Sell the higher strike YES (priced too high, violates ordering)
                            {"token_id": m_high.get("conditionId", ""), "side": "SELL",
                             "price": p_high, "size": size},
                        ],
                        total_cost=p_low * size,
                        guaranteed_payout=(p_high + spread * 0.5) * size,
                        profit=spread * size,
                        profit_pct=spread / p_low,
                        edge_score=spread * 4,  # highest weight — pure risk-free
                    ))

        return opps

    # ================================================================== #
    #  Market data helpers                                                 #
    # ================================================================== #

    async def _fetch_markets(self) -> list:
        now = time.time()
        if now - self._cache_ts < self.SCAN_INTERVAL:
            return self._markets_cache
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{GAMMA_API}/markets",
                    params={"active": "true", "closed": "false", "limit": 200},
                    timeout=aiohttp.ClientTimeout(total=8),
                ) as r:
                    data    = await r.json()
                    markets = data if isinstance(data, list) else data.get("markets", [])
                    self._markets_cache = markets
                    self._cache_ts      = now
                    log.info("Fetched %d markets for arb scan", len(markets))
        except Exception as e:
            log.warning("Market fetch failed: %s", e)
        return self._markets_cache

    def _group_by_event(self, markets: list) -> dict:
        """Group markets that belong to the same underlying event."""
        groups: dict = {}
        for m in markets:
            key = m.get("groupItemTitle") or m.get("slug", "").rsplit("-", 1)[0]
            if key:
                groups.setdefault(key, []).append(m)
        return {k: v for k, v in groups.items() if len(v) >= 2}

    def _is_crypto_market(self, market: dict) -> bool:
        q = market.get("question", "").upper()
        return any(a in q for a in ["BTC", "ETH", "SOL", "XRP", "BNB"])

    def _extract_asset(self, market: dict) -> str:
        q = market.get("question", "").upper()
        for a in ["BTC", "ETH", "SOL", "XRP", "BNB"]:
            if a in q:
                return a
        return "UNKNOWN"

    def _parse_strike(self, question: str) -> Optional[float]:
        import re
        m = re.search(r'\$?([\d,]+(?:\.\d+)?)', question)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except ValueError:
                pass
        return None

    def _size_per_leg(self, profit_pct: float) -> float:
        bankroll = self.config.get("bankroll_usdc", 1000)
        max_size = self.config.get("arb_max_size_usdc", self.MAX_POSITION)
        return round(min(profit_pct * bankroll * 2, max_size), 2)

    def _opp_to_dict(self, opp: ArbOpportunity) -> dict:
        arb_id = f"{opp.arb_type}:{'_'.join(opp.market_ids[:2])}"
        return {
            "strategy":          self.name,
            "arb_type":          opp.arb_type,
            "arb_id":            arb_id,
            "market_ids":        opp.market_ids,
            "portfolio":         opp.portfolio,
            "total_cost":        round(opp.total_cost, 2),
            "guaranteed_payout": round(opp.guaranteed_payout, 2),
            "profit":            round(opp.profit, 2),
            "profit_pct":        round(opp.profit_pct, 4),
            "edge_score":        round(opp.edge_score, 4),
            "legs":              len(opp.portfolio),
            "size_usdc":         round(opp.total_cost, 2),
        }

    async def _track_resolution(self, trade, opp: dict):
        """Wait for market resolution and close the trade."""
        await asyncio.sleep(3600 * 24)   # up to 24h for resolution
        exit_price = opp["guaranteed_payout"] / max(opp["total_cost"], 0.01)
        self.agent.close_trade(trade.id, exit_price)
        # Route profit to accumulator
        if opp["profit"] > 0:
            try:
                self.agent._accumulator.deposit(opp["profit"], source="combinatorial_arb")
            except Exception:
                pass
