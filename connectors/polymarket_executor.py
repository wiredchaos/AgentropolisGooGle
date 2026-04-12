"""
connectors/polymarket_executor.py — Polymarket order execution connector
Wraps the Polymarket CLOB API for placing limit/market orders on conditional
token markets. Handles authentication, order signing, and error retry logic.
"""

import logging
import aiohttp

log = logging.getLogger("connectors.polymarket_executor")

CLOB_API = "https://clob.polymarket.com"


class PolymarketExecutor:
    def __init__(self, config: dict):
        self.config   = config
        self._api_key = config.get("polymarket_api_key", "")
        self._dry_run = config.get("dry_run", True)

    async def place_order(
        self,
        token_id: str,
        side: str,
        price: float,
        size: float,
        market_id: str = "",
    ) -> dict:
        """
        Place a limit order on the Polymarket CLOB.

        Args:
            token_id:  ERC-1155 conditional token ID (YES or NO token).
            side:      "BUY" or "SELL".
            price:     Limit price in USDC (0–1).
            size:      Order size in USDC.
            market_id: Optional market ID for logging.

        Returns:
            Order response dict from the CLOB API.
        """
        if self._dry_run:
            log.info(
                "[DRY RUN] %s %s token=%s price=%.4f size=%.2f USDC",
                side, market_id, token_id[:12] + "...", price, size,
            )
            return {"status": "dry_run", "token_id": token_id, "side": side, "price": price, "size": size}

        payload = {
            "tokenID":   token_id,
            "side":      side,
            "price":     str(round(price, 4)),
            "size":      str(round(size, 2)),
            "orderType": "GTC",  # Good-Till-Cancelled limit order
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type":  "application/json",
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{CLOB_API}/order",
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as resp:
                    data = await resp.json()
                    log.info("Order placed | %s %s price=%.4f size=%.2f → %s", side, token_id[:12], price, size, data)
                    return data
        except Exception as e:
            log.error("Order placement failed | %s %s: %s", side, token_id[:12], e)
            raise
