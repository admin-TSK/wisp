"""Local model rate card (mirror of the SaaS `model_pricing` seed).

Used only for the on-device glanceable dollar figure. The authoritative billing
rate lives server-side; this local copy must stay in sync with
supabase/migrations seed. Rates are $/token (per-million figures / 1e6).

Where a provider's cache rate is unknown we default cached == base
(conservative: assumes no cache discount).
"""

from __future__ import annotations

from .billing import ModelRate

_PER_M = 1_000_000


def _rate(base_per_m: float, cached_per_m: float | None = None) -> ModelRate:
    return ModelRate(
        base_input_rate=base_per_m / _PER_M,
        cached_input_rate=(cached_per_m if cached_per_m is not None else base_per_m) / _PER_M,
    )


# $/1M tokens (base, cached). June 2026 list prices.
DEFAULT_RATE_CARD: dict[str, ModelRate] = {
    # OpenAI
    "gpt-5.5": _rate(5.00, 0.50),
    "gpt-5.4": _rate(2.50, 0.25),
    "gpt-5.4-mini": _rate(0.75, 0.075),
    "gpt-5.2-codex": _rate(1.75),
    "gpt-5": _rate(1.25),
    "gpt-5-mini": _rate(0.25),
    "gpt-4o": _rate(2.50),
    # Anthropic
    "claude-opus-4-8": _rate(5.00, 0.50),
    "claude-opus-4-7": _rate(5.00, 0.50),
    "claude-sonnet-4-6": _rate(3.00, 0.30),
    "claude-haiku-4-5": _rate(1.00, 0.10),
    "claude-fable-5": _rate(10.00, 1.00),
    # Google
    "gemini-3.1-pro": _rate(2.00),
    "gemini-3.5-flash": _rate(1.50, 0.15),
    "gemini-2.5-pro": _rate(1.25),
    # xAI
    "grok-4": _rate(3.00),
    "grok-4-fast": _rate(0.20),
}


def resolve(model: str) -> ModelRate | None:
    return DEFAULT_RATE_CARD.get(model)
