"""
Dashboard API Server
FastAPI backend — receives agent state pushes and TV signals,
serves them to the React dashboard via REST + WebSocket.

Run: uvicorn dashboard.server:app --port 8765 --reload
"""

import asyncio
import json
import logging
from collections import deque
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

log = logging.getLogger("dashboard.server")

app = FastAPI(title="Trading Bot Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------ #
#  In-memory state (replace with Redis for multi-process)             #
# ------------------------------------------------------------------ #

_agent_state: dict = {}
_tv_signals: dict  = {}
_ws_clients: set   = set()
_trade_log: deque  = deque(maxlen=500)
_pnl_history: list = []   # [{t, pnl}]


class TVSignalPayload(BaseModel):
    symbol: str
    signal: dict


# ------------------------------------------------------------------ #
#  REST endpoints                                                      #
# ------------------------------------------------------------------ #

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.post("/agent-state")
async def receive_agent_state(state: dict):
    """Agent pushes its full state here every 5 seconds."""
    global _agent_state
    _agent_state = state

    daily_pnl = state.get("stats", {}).get("daily_pnl_usdc", 0)
    _pnl_history.append({"t": datetime.now(timezone.utc).isoformat(), "pnl": daily_pnl})
    if len(_pnl_history) > 288:  # 24h at 5-min intervals
        _pnl_history.pop(0)

    await _broadcast({"type": "agent_state", "data": state})
    return {"ok": True}


@app.post("/tv-signal")
async def receive_tv_signal(payload: TVSignalPayload):
    """TradingView MCP bridge pushes signals here."""
    _tv_signals[payload.symbol] = payload.signal
    await _broadcast({"type": "tv_signal", "symbol": payload.symbol, "signal": payload.signal})
    log.info("TV signal received: %s trend=%s", payload.symbol, payload.signal.get("trend"))
    return {"ok": True}


@app.get("/state")
async def get_state():
    return {
        **_agent_state,
        "tv_signals": _tv_signals,
        "pnl_history": _pnl_history[-60:],
    }


@app.get("/pnl-history")
async def get_pnl_history():
    return _pnl_history


@app.get("/tv-signals")
async def get_tv_signals():
    return _tv_signals


# ------------------------------------------------------------------ #
#  WebSocket                                                           #
# ------------------------------------------------------------------ #

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _ws_clients.add(ws)
    log.info("WS client connected (%d total)", len(_ws_clients))
    try:
        if _agent_state:
            await ws.send_json({"type": "agent_state", "data": _agent_state})
        while True:
            await ws.receive_text()   # keep alive
    except WebSocketDisconnect:
        pass
    finally:
        _ws_clients.discard(ws)
        log.info("WS client disconnected (%d total)", len(_ws_clients))


async def _broadcast(msg: dict):
    dead = set()
    for ws in _ws_clients:
        try:
            await ws.send_json(msg)
        except Exception:
            dead.add(ws)
    _ws_clients -= dead
