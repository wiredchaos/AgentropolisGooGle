"""
AI Signal Layer — GPT-4o via API
Adds an LLM reasoning layer on top of quantitative signals.

Three roles:
1. Signal validator  — reviews a trade opportunity and scores conviction
2. Market narrator   — generates real-time market commentary for dashboard
3. Edge scanner      — identifies macro context that amplifies or kills a trade

Model: GPT-4o (fast, low-cost at this scale)
Cost: ~$0.002 per signal validation at current GPT-4o pricing
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional
import aiohttp

log = logging.getLogger("ai_signal")

OPENAI_API = "https://api.openai.com/v1/chat/completions"
MODEL      = "gpt-4o"


class AISignalLayer:
    """
    Wraps GPT-4o for real-time trade validation and market commentary.
    Gracefully degrades if OPENAI_API_KEY is not set.
    """

    def __init__(self, config: dict):
        self.config   = config
        self.api_key  = os.getenv("OPENAI_API_KEY", "")
        self.enabled  = bool(self.api_key)
        self._cache: dict     = {}    # opp hash → {result, ts}
        self._commentary: str = ""
        self._last_commentary_ts = 0
        self._call_count  = 0
        self._total_cost  = 0.0

        if not self.enabled:
            log.warning("OPENAI_API_KEY not set — AI signal layer disabled")
        else:
            log.info("AISignalLayer ready | model=%s", MODEL)

    # ------------------------------------------------------------------ #
    #  Public API                                                          #
    # ------------------------------------------------------------------ #

    async def validate_opportunity(self, opp: dict, market_context: dict = {}) -> dict:
        """
        Ask GPT-4o to validate a trade opportunity.
        Returns enhanced opportunity dict with ai_conviction, ai_note, ai_risk.
        """
        if not self.enabled:
            return {**opp, "ai_conviction": 0.5, "ai_note": "AI layer disabled"}

        cache_key = f"{opp.get('strategy')}:{opp.get('symbol')}:{round(opp.get('edge_score', 0), 3)}"
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            if time.time() - cached["ts"] < 120:   # 2-minute cache
                return {**opp, **cached["result"]}

        prompt = self._build_validation_prompt(opp, market_context)
        result = await self._call_gpt(prompt, max_tokens=300, temperature=0.2)

        if result and isinstance(result, dict):
            self._cache[cache_key] = {"result": result, "ts": time.time()}
            return {**opp, **result}

        return {**opp, "ai_conviction": 0.5, "ai_note": "validation unavailable"}

    async def generate_commentary(self, agent_state: dict) -> str:
        """
        Generate a brief market commentary for the dashboard.
        Refreshes every 5 minutes.
        """
        if not self.enabled:
            return ""
        if time.time() - self._last_commentary_ts < 300:
            return self._commentary

        stats   = agent_state.get("stats", {})
        signals = agent_state.get("tv_signals", {})
        trades  = agent_state.get("recent_trades", [])[-10:]

        prompt = (
            "You are a concise trading desk analyst. In 2-3 sentences, summarize current "
            "market conditions based on:\n\n"
            f"Stats: {json.dumps(stats, indent=2)}\n"
            f"TV Signals: {json.dumps(signals, indent=2)}\n"
            f"Recent trades: {len(trades)} trades\n\n"
            "Be direct. No preamble. Focus on what matters right now for a prediction "
            "market + crypto bot."
        )

        result = await self._call_gpt(prompt, max_tokens=150, temperature=0.4, json_mode=False)
        if isinstance(result, str):
            self._commentary        = result
            self._last_commentary_ts = time.time()

        return self._commentary

    async def score_edge(self, symbol: str, strategy: str, raw_edge: float, market_data: dict) -> float:
        """
        Quick edge quality score — is this a real edge or noise?
        Returns an adjusted multiplier: 0.5 = halve the edge, 1.5 = amplify.
        """
        if not self.enabled or raw_edge < 0.03:
            return 1.0

        prompt = (
            f"Rate this trading edge from 0.5 to 1.5 (1.0 = neutral).\n\n"
            f"Symbol: {symbol}\nStrategy: {strategy}\nRaw edge: {raw_edge:.4f}\n"
            f"Market data: {json.dumps(market_data, indent=2)}\n\n"
            'Respond ONLY with JSON: {"multiplier": 1.0, "reason": "one sentence"}'
        )

        result = await self._call_gpt(prompt, max_tokens=80, temperature=0.1)
        if isinstance(result, dict):
            return float(result.get("multiplier", 1.0))
        return 1.0

    @property
    def status(self) -> dict:
        return {
            "enabled":    self.enabled,
            "model":      MODEL,
            "calls":      self._call_count,
            "cost_usd":   round(self._total_cost, 4),
            "cache_size": len(self._cache),
            "has_key":    bool(self.api_key),
        }

    # ------------------------------------------------------------------ #
    #  Internal helpers                                                    #
    # ------------------------------------------------------------------ #

    def _build_validation_prompt(self, opp: dict, context: dict) -> str:
        return (
            "You are a quantitative trading signal validator. Analyze this trade opportunity "
            "and return a JSON conviction score.\n\n"
            f"Opportunity:\n{json.dumps(opp, indent=2)}\n\n"
            f"Market context:\n{json.dumps(context, indent=2)}\n\n"
            "Return ONLY valid JSON:\n"
            '{"ai_conviction": 0.0-1.0, "ai_note": "one sentence", '
            '"ai_risk": "low|medium|high", "ai_pass": true|false}\n\n'
            "Criteria:\n"
            "- ai_conviction > 0.7 = strong edge, execute\n"
            "- ai_conviction 0.5-0.7 = borderline, reduce size\n"
            "- ai_conviction < 0.5 = skip\n"
            "- Check for: news risk, spread risk, liquidity, timing"
        )

    async def _call_gpt(
        self,
        prompt: str,
        max_tokens: int = 200,
        temperature: float = 0.2,
        json_mode: bool = True,
    ) -> Optional[dict | str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type":  "application/json",
        }
        body: dict = {
            "model":       MODEL,
            "messages":    [{"role": "user", "content": prompt}],
            "max_tokens":  max_tokens,
            "temperature": temperature,
        }
        if json_mode:
            body["response_format"] = {"type": "json_object"}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    OPENAI_API,
                    headers=headers,
                    json=body,
                    timeout=aiohttp.ClientTimeout(total=8),
                ) as resp:
                    data = await resp.json()

            self._call_count += 1
            # Cost estimate: $5/1M input tokens + $15/1M output tokens
            usage = data.get("usage", {})
            cost  = (usage.get("prompt_tokens", 0) * 5 + usage.get("completion_tokens", 0) * 15) / 1_000_000
            self._total_cost += cost

            content = data["choices"][0]["message"]["content"]
            if json_mode:
                return json.loads(content)
            return content

        except json.JSONDecodeError as e:
            log.warning("GPT JSON parse error: %s", e)
            return None
        except Exception as e:
            log.warning("GPT call failed: %s", e)
            return None
