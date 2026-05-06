"""
core/ai_signal.py — AI Signal Layer
Optional LLM-powered conviction filter applied to all opportunities before
execution. Calls a configurable model endpoint (e.g. Gemini or Claude) with
a structured prompt describing the opportunity; returns a conviction score
[0, 1]. Opportunities with conviction < 0.5 are filtered out by the agent
cycle loop.
"""

import asyncio
import logging

log = logging.getLogger("core.ai_signal")


class AISignalLayer:
    def __init__(self, config: dict):
        self.config  = config
        self.enabled = config.get("ai_signal_enabled", False)
        self._validated = 0
        self._filtered  = 0
        log.info("AISignalLayer init | enabled=%s", self.enabled)

    @property
    def status(self) -> dict:
        return {
            "enabled":   self.enabled,
            "validated": self._validated,
            "filtered":  self._filtered,
        }

    async def validate_opportunity(self, opp: dict) -> dict:
        """
        Returns opp dict with an added 'ai_conviction' key in [0, 1].
        Pass-through (conviction=1.0) when AI layer is disabled.
        """
        if not self.enabled:
            return {**opp, "ai_conviction": 1.0}

        conviction = await self._score(opp)
        self._validated += 1
        if conviction < 0.5:
            self._filtered += 1
        return {**opp, "ai_conviction": conviction}

    async def _score(self, opp: dict) -> float:
        """
        Stub: full implementation sends opp summary to an LLM endpoint and
        parses a numeric conviction score from the response.
        Currently returns a heuristic based on edge_score.
        """
        edge = opp.get("edge_score", 0.0)
        # Normalise: edge_score of 0.5 → conviction ~0.75
        conviction = min(0.5 + edge * 0.5, 1.0)
        return round(conviction, 3)
