"""
OKX MCP Connector for Hermes
Wraps the official OKX agent-trade-kit MCP server.

The OKX MCP server exposes these tool groups:
  market  — prices, orderbook, candlesticks (no auth needed)
  spot    — place/cancel spot orders
  swap    — perpetual futures execution
  account — balances, positions, order history

Setup (one-time):
  npm install -g @okx_ai/okx-trade-mcp @okx_ai/okx-trade-cli
  okx config init          # interactive wizard — paste API key + secret
  okx-trade-mcp setup --client claude-code   # registers MCP in .mcp.json

Environment variables (set in .env or Railway):
  OKX_API_KEY
  OKX_API_SECRET
  OKX_API_PASSPHRASE

Hermes uses OKX for:
  1. Real-time BTC/ETH/SOL prices to feed the fair value model
  2. Funding rate data (replaces Binance fapi endpoint)
  3. Spot execution when Polymarket USDC bridge is slow
  4. Open interest data for liquidation hunter strategy

MCP tool names (from agent-trade-kit):
  market_get_ticker          → live price + 24h stats
  market_get_candlesticks    → OHLCV data
  market_get_orderbook       → bid/ask depth
  swap_get_funding_rate      → perpetual funding rate
  swap_get_open_interest     → OI for liquidation hunting
  account_get_balance        → USDC + asset balances
  spot_place_order           → execute spot trade
  swap_place_order           → execute perp trade
"""

import asyncio
import json
import logging
import os
import subprocess
import time
from typing import Optional

import aiohttp

log = logging.getLogger("connector.okx_mcp")


class OKXMCPConnector:
    """
    Talks to the OKX agent-trade-kit MCP server via subprocess stdio.
    In Claude Code: tools are available directly via MCP.
    In standalone Python: we call the CLI wrapper.
    """

    def __init__(self, config: dict):
        self.config       = config
        self.read_only    = config.get("okx_read_only", True)
        self.api_key      = os.getenv("OKX_API_KEY", "")
        self.api_secret   = os.getenv("OKX_API_SECRET", "")
        self.passphrase   = os.getenv("OKX_API_PASSPHRASE", "")
        self._price_cache: dict   = {}   # symbol → {price, ts}
        self._funding_cache: dict = {}   # symbol → {rate, ts}
        self._oi_cache: dict      = {}   # symbol → {oi, ts}
        self._cache_ttl   = 10           # seconds
        self._cli_available = self._check_cli()
        log.info("OKXMCPConnector init | cli=%s read_only=%s",
                 self._cli_available, self.read_only)

    def _check_cli(self) -> bool:
        try:
            result = subprocess.run(
                ["okx", "--version"],
                capture_output=True, timeout=3,
            )
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False

    # ------------------------------------------------------------------ #
    #  Market data — used by all strategies                               #
    # ------------------------------------------------------------------ #

    async def get_price(self, symbol: str) -> Optional[float]:
        """
        Get live spot price. Returns cached value if fresh.
        symbol: "BTC-USDT", "ETH-USDT", "SOL-USDT"
        """
        cached = self._price_cache.get(symbol)
        if cached and time.time() - cached["ts"] < self._cache_ttl:
            return cached["price"]
        price = await self._get_price_impl(symbol)
        if price:
            self._price_cache[symbol] = {"price": price, "ts": time.time()}
        return price

    async def get_prices_batch(self, symbols: list[str]) -> dict:
        """Fetch multiple prices in one call. Returns {symbol: price}."""
        now = time.time()
        stale = [s for s in symbols
                 if s not in self._price_cache
                 or now - self._price_cache[s]["ts"] >= self._cache_ttl]
        if stale:
            prices = await self._batch_ticker(stale)
            for sym, price in prices.items():
                self._price_cache[sym] = {"price": price, "ts": now}
        return {s: self._price_cache[s]["price"]
                for s in symbols if s in self._price_cache}

    async def get_funding_rate(self, symbol: str) -> Optional[float]:
        """
        Get perpetual funding rate for liquidation + funding arb strategies.
        symbol: "BTC-USDT-SWAP", "ETH-USDT-SWAP"
        """
        swap_sym = symbol.replace("-USDT", "-USDT-SWAP") if "SWAP" not in symbol else symbol
        cached = self._funding_cache.get(swap_sym)
        if cached and time.time() - cached["ts"] < 60:
            return cached["rate"]
        rate = await self._get_funding_impl(swap_sym)
        if rate is not None:
            self._funding_cache[swap_sym] = {"rate": rate, "ts": time.time()}
        return rate

    async def get_open_interest(self, symbol: str) -> Optional[float]:
        """For liquidation hunter — track OI changes."""
        swap_sym = symbol.replace("-USDT", "-USDT-SWAP") if "SWAP" not in symbol else symbol
        cached = self._oi_cache.get(swap_sym)
        if cached and time.time() - cached["ts"] < 30:
            return cached["oi"]
        oi = await self._get_oi_impl(swap_sym)
        if oi is not None:
            self._oi_cache[swap_sym] = {"oi": oi, "ts": time.time()}
        return oi

    async def get_candlesticks(self, symbol: str, bar: str = "5m", limit: int = 50) -> list:
        """
        OHLCV data for IV estimation in fair value model.
        Replaces Binance klines endpoint.
        bar: "1m", "5m", "15m", "1H"
        """
        return await self._get_candles_impl(symbol, bar, limit)

    async def get_orderbook(self, symbol: str, depth: int = 5) -> Optional[dict]:
        """Bid/ask spread data for spread detector strategy."""
        return await self._get_orderbook_impl(symbol, depth)

    # ------------------------------------------------------------------ #
    #  Execution (only when read_only=False + keys set)                   #
    # ------------------------------------------------------------------ #

    async def place_spot_order(
        self,
        symbol: str,            # "BTC-USDT"
        side: str,              # "buy" | "sell"
        size: float,            # USDC amount
        order_type: str = "market",
    ) -> Optional[dict]:
        if self.read_only:
            log.info("DRY RUN spot order | %s %s $%.2f", side, symbol, size)
            return {"status": "dry_run", "symbol": symbol, "side": side, "size": size}
        return await self._place_spot_impl(symbol, side, size, order_type)

    async def place_swap_order(
        self,
        symbol: str,            # "BTC-USDT-SWAP"
        side: str,              # "buy" | "sell"
        size: float,
        leverage: int = 1,
    ) -> Optional[dict]:
        if self.read_only:
            log.info("DRY RUN swap order | %s %s $%.2f", side, symbol, size)
            return {"status": "dry_run", "symbol": symbol, "side": side, "size": size}
        return await self._place_swap_impl(symbol, side, size, leverage)

    async def get_balance(self) -> dict:
        """Account balance across all assets."""
        return await self._get_balance_impl()

    # ------------------------------------------------------------------ #
    #  Implementation — CLI calls or direct REST fallback                  #
    # ------------------------------------------------------------------ #

    async def _get_price_impl(self, symbol: str) -> Optional[float]:
        if self._cli_available:
            result = await self._run_cli("market", "ticker", symbol)
            if result and "lastPrice" in result:
                return float(result["lastPrice"])
        return await self._okx_rest_price(symbol)

    async def _batch_ticker(self, symbols: list) -> dict:
        prices = {}
        tasks = [self._okx_rest_price(s) for s in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for sym, price in zip(symbols, results):
            if isinstance(price, float):
                prices[sym] = price
        return prices

    async def _okx_rest_price(self, symbol: str) -> Optional[float]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.okx.com/api/v5/market/ticker",
                    params={"instId": symbol},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    data = await resp.json()
                    return float(data["data"][0]["last"])
        except Exception as e:
            log.debug("OKX REST price failed %s: %s", symbol, e)
            return None

    async def _get_funding_impl(self, symbol: str) -> Optional[float]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.okx.com/api/v5/public/funding-rate",
                    params={"instId": symbol},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    data = await resp.json()
                    return float(data["data"][0]["fundingRate"])
        except Exception as e:
            log.debug("OKX funding rate failed %s: %s", symbol, e)
            return None

    async def _get_oi_impl(self, symbol: str) -> Optional[float]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-volume",
                    params={"ccy": symbol.split("-")[0], "period": "5m"},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    data = await resp.json()
                    if data.get("data"):
                        return float(data["data"][0][1])
        except Exception as e:
            log.debug("OKX OI failed %s: %s", symbol, e)
        return None

    async def _get_candles_impl(self, symbol: str, bar: str, limit: int) -> list:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.okx.com/api/v5/market/candles",
                    params={"instId": symbol, "bar": bar, "limit": str(limit)},
                    timeout=aiohttp.ClientTimeout(total=4),
                ) as resp:
                    data = await resp.json()
                    # OKX format: [ts, open, high, low, close, vol, ...]
                    return [
                        {"ts": int(c[0]), "open": float(c[1]), "high": float(c[2]),
                         "low": float(c[3]), "close": float(c[4]), "vol": float(c[5])}
                        for c in data.get("data", [])
                    ]
        except Exception as e:
            log.debug("OKX candles failed %s: %s", symbol, e)
            return []

    async def _get_orderbook_impl(self, symbol: str, depth: int) -> Optional[dict]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://www.okx.com/api/v5/market/books",
                    params={"instId": symbol, "sz": str(depth)},
                    timeout=aiohttp.ClientTimeout(total=3),
                ) as resp:
                    data = await resp.json()
                    book = data["data"][0]
                    best_ask = float(book["asks"][0][0])
                    best_bid = float(book["bids"][0][0])
                    return {
                        "best_ask": best_ask,
                        "best_bid": best_bid,
                        "spread": best_ask - best_bid,
                        "asks": book["asks"][:depth],
                        "bids": book["bids"][:depth],
                    }
        except Exception as e:
            log.debug("OKX orderbook failed %s: %s", symbol, e)
            return None

    async def _get_balance_impl(self) -> dict:
        if self._cli_available and self.api_key:
            result = await self._run_cli("account", "balance")
            return result or {}
        return {}

    async def _place_spot_impl(self, symbol, side, size, order_type) -> Optional[dict]:
        if self._cli_available:
            return await self._run_cli(
                "spot", "place",
                "--instId", symbol, "--side", side,
                "--sz", str(size), "--ordType", order_type,
            )
        return None

    async def _place_swap_impl(self, symbol, side, size, leverage) -> Optional[dict]:
        if self._cli_available:
            return await self._run_cli(
                "swap", "place",
                "--instId", symbol, "--side", side,
                "--sz", str(size), "--lever", str(leverage),
            )
        return None

    async def _run_cli(self, *args: str) -> Optional[dict]:
        """Run okx CLI command and parse JSON output."""
        try:
            proc = await asyncio.create_subprocess_exec(
                "okx", *args, "--format", "json",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ,
                     "OKX_API_KEY": self.api_key,
                     "OKX_API_SECRET": self.api_secret,
                     "OKX_API_PASSPHRASE": self.passphrase},
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=8)
            if proc.returncode == 0:
                return json.loads(stdout.decode())
            log.debug("OKX CLI error: %s", stderr.decode()[:200])
        except asyncio.TimeoutError:
            log.warning("OKX CLI timeout: %s", args)
        except Exception as e:
            log.debug("OKX CLI failed: %s", e)
        return None

    @property
    def status(self) -> dict:
        return {
            "cli_available":    self._cli_available,
            "read_only":        self.read_only,
            "has_credentials":  bool(self.api_key),
            "price_cache_size": len(self._price_cache),
            "funding_cache_size": len(self._funding_cache),
        }


# ── MCP config snippet for Claude Code ───────────────────────────────────────

MCP_CONFIG = {
    "mcpServers": {
        "okx-trade": {
            "command": "okx-trade-mcp",
            "args": ["--modules", "market,account"],   # add "spot,swap" for execution
            "env": {
                "OKX_API_KEY":        "${OKX_API_KEY}",
                "OKX_API_SECRET":     "${OKX_API_SECRET}",
                "OKX_API_PASSPHRASE": "${OKX_API_PASSPHRASE}",
            },
        }
    }
}
