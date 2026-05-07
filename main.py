"""
main.py — Railway-compatible entrypoint

Environment variables (set in Railway dashboard):
  PORT                       API port (Railway sets automatically)
  DEMO_MODE                  "1" demo / "0" live
  BANKROLL_USDC              Starting capital
  POLYMARKET_EDGE_THRESHOLD  Min edge e.g. 0.06
"""
import argparse, asyncio, json, logging, os
log = logging.getLogger("main")

DEFAULT_CONFIG = {
    "cycle_interval_seconds": 30,
    "max_concurrent_trades": 5,
    "kelly_fraction": 0.25,
    "bankroll_usdc": 1000,
    "polymarket_edge_threshold": 0.06,
    "polymarket_max_size_usdc": 100,
    "crypto_max_position_usdc": 200,
    "tv_max_position_usdc": 150,
    "momentum_min_rsi": 55,
    "momentum_max_rsi": 75,
}

async def run_all(config, demo=False):
    from core.agent import TradingAgent
    from connectors.tv_mcp_bridge import inject_demo_signals, run_bridge
    agent = TradingAgent(config)
    tasks = [agent.run(), run_dashboard_server()]
    tasks.append(inject_demo_signals(config["dashboard_api_url"]) if demo else run_bridge())
    await asyncio.gather(*tasks)

async def run_dashboard_server():
    import uvicorn
    port = int(os.getenv("PORT", "8765"))
    config = uvicorn.Config("dashboard.server:app", host="0.0.0.0", port=port, log_level="warning")
    server = uvicorn.Server(config)
    log.info("Dashboard API → http://0.0.0.0:%d", port)
    await server.serve()

def build_config():
    config = DEFAULT_CONFIG.copy()
    for env_key, (cfg_key, cast) in {
        "BANKROLL_USDC":             ("bankroll_usdc",             float),
        "POLYMARKET_EDGE_THRESHOLD": ("polymarket_edge_threshold", float),
        "CYCLE_INTERVAL_SECONDS":    ("cycle_interval_seconds",    int),
        "MAX_CONCURRENT_TRADES":     ("max_concurrent_trades",     int),
    }.items():
        val = os.getenv(env_key)
        if val: config[cfg_key] = cast(val)
    port = os.getenv("PORT", "8765")
    config["dashboard_api_url"] = f"http://localhost:{port}"
    return config

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--dashboard-only", action="store_true")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args()
    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO),
                        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    config = build_config()
    demo = args.demo or os.getenv("DEMO_MODE", "0") == "1"
    log.info("Starting bot | demo=%s port=%s", demo, os.getenv("PORT","8765"))
    if args.dashboard_only:
        asyncio.run(run_dashboard_server())
    else:
        asyncio.run(run_all(config, demo=demo))

if __name__ == "__main__":
    main()
