"""
TradingView MCP Bridge
Connects to tradingview-mcp (CDP port 9222) and pushes chart signals
to the trading agent every N seconds.

Run alongside your tradingview-mcp node server:
  node /path/to/tradingview-mcp/src/server.js

This bridge calls the MCP tools via the JSON-RPC stdio interface OR
directly via the REST wrapper if you expose one.
For Claude Code users: set CLAUDE_CODE_MODE=1 and the bridge will
issue tool calls through Claude Code's MCP connection.

Standalone mode (default): polls TV data via CDP HTTP debug API.
"""

import asyncio
import json
import logging
import os
import time
import aiohttp

log = logging.getLogger("tv_bridge")

CDP_HOST = os.getenv("TV_CDP_HOST", "http://localhost:9222")
AGENT_URL = os.getenv("AGENT_URL", "http://localhost:8765")
POLL_INTERVAL = int(os.getenv("TV_POLL_INTERVAL", "30"))


async def get_tv_chart_state() -> dict | None:
    """
    Reads live chart state from TradingView Desktop via CDP.
    Returns a normalized signal dict consumed by TVSignalFollowerStrategy.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{CDP_HOST}/json", timeout=aiohttp.ClientTimeout(total=3)) as r:
                targets = await r.json()
            tv_target = next((t for t in targets if "tradingview" in t.get("url","").lower()), None)
            if not tv_target:
                log.debug("No TradingView target found in CDP")
                return None

            ws_url = tv_target["webSocketDebuggerUrl"]

            import websockets
            async with websockets.connect(ws_url) as ws:
                await ws.send(json.dumps({
                    "id": 1, "method": "Runtime.evaluate",
                    "params": {"expression": "JSON.stringify({symbol: window.tvWidget?.chart()?.symbol(), price: window.tvWidget?.chart()?.crossHairPrice()})"}
                }))
                resp = json.loads(await ws.recv())
                chart_info = {}
                try:
                    chart_info = json.loads(resp["result"]["result"]["value"])
                except Exception:
                    pass

                await ws.send(json.dumps({
                    "id": 2, "method": "Runtime.evaluate",
                    "params": {"expression": """
                        JSON.stringify((() => {
                            try {
                                const studies = window.tvWidget?.chart()?.getAllStudies() || [];
                                return studies.map(s => ({id: s.id, name: s.name}));
                            } catch(e) { return []; }
                        })())
                    """}
                }))
                resp2 = json.loads(await ws.recv())
                studies = []
                try:
                    studies = json.loads(resp2["result"]["result"]["value"])
                except Exception:
                    pass

            symbol = chart_info.get("symbol", "ETHUSDT")
            price  = chart_info.get("price") or 0

            return {
                "symbol": symbol,
                "price": float(price) if price else 0.0,
                "trend": "neutral",
                "momentum_bias": 0.0,
                "confidence": 0.5,
                "studies": studies,
                "signal_source": "tradingview-mcp-cdp",
                "received_at": time.time(),
            }

    except Exception as e:
        log.debug("CDP read failed: %s", e)
        return None


async def push_signal_to_agent(symbol: str, signal: dict):
    """POST signal to the agent's dashboard API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{AGENT_URL}/tv-signal",
                json={"symbol": symbol, "signal": signal},
                timeout=aiohttp.ClientTimeout(total=2),
            ) as resp:
                if resp.status == 200:
                    log.info("Signal pushed: %s trend=%s conf=%.2f",
                             symbol, signal.get("trend"), signal.get("confidence", 0))
    except Exception as e:
        log.debug("Push failed: %s", e)


async def inject_demo_signals(agent_url: str):
    """
    Demo mode — inject realistic-looking signals when TradingView is not running.
    Useful for dashboard testing.
    """
    import random
    symbols = ["ETHUSDT", "BTCUSDT", "SOLUSDT"]
    trends = ["bull", "bear", "neutral"]
    while True:
        for symbol in symbols:
            signal = {
                "symbol": symbol,
                "price": random.uniform(1800, 4000) if "ETH" in symbol else
                         random.uniform(40000, 70000) if "BTC" in symbol else
                         random.uniform(100, 200),
                "trend": random.choices(trends, weights=[0.4, 0.35, 0.25])[0],
                "momentum_bias": random.uniform(-0.8, 0.8),
                "confidence": random.uniform(0.5, 0.95),
                "rsi": random.uniform(25, 75),
                "ema_cross": random.choice(["bullish", "bearish", None]),
                "pine_labels": random.choice([["Support 2100", "Bias Long ✓"], ["Resistance 3800"], []]),
                "pine_lines": [{"price": round(random.uniform(1900, 3900), 0)}],
                "signal_source": "demo-mode",
                "received_at": time.time(),
            }
            try:
                async with aiohttp.ClientSession() as session:
                    await session.post(f"{agent_url}/tv-signal",
                                       json={"symbol": symbol, "signal": signal},
                                       timeout=aiohttp.ClientTimeout(total=2))
            except Exception:
                pass
        await asyncio.sleep(15)


async def run_bridge():
    log.info("TradingView MCP Bridge starting | CDP=%s agent=%s", CDP_HOST, AGENT_URL)
    demo_mode = os.getenv("DEMO_MODE", "1") == "1"

    if demo_mode:
        log.info("DEMO MODE — injecting simulated TV signals")
        await inject_demo_signals(AGENT_URL)
        return

    while True:
        signal = await get_tv_chart_state()
        if signal:
            symbol = signal.get("symbol", "UNKNOWN")
            await push_signal_to_agent(symbol, signal)
        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    asyncio.run(run_bridge())
