"""Net-of-cache savings math.

This is the single most important pure function in Wisp: it converts measured
token counts into the *billable* savings figure. It is intentionally
dependency-free and deterministic so it can be:

  * unit-tested in isolation,
  * mirrored exactly by the SaaS (TypeScript) authoritative billing path, and
  * re-run by a customer's FinOps team to reproduce any billed number.

Directive (Wisp prime directive #3): bill on measured tokens removed, NET of
provider cache discounts, never on counterfactuals. Gross may be *shown*; only
net-of-cache is *billed*.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelRate:
    """Resolved $/token rates for one model (tenant override else rate card)."""

    base_input_rate: float
    cached_input_rate: float

    def __post_init__(self) -> None:
        if self.base_input_rate < 0 or self.cached_input_rate < 0:
            raise ValueError("rates must be non-negative")


@dataclass(frozen=True)
class UsageWindow:
    """Aggregate, PII-free usage for one model over one time window."""

    model: str
    input_tokens_removed: int
    input_tokens_compressed: int
    input_tokens_cache_read: int

    def __post_init__(self) -> None:
        for name in (
            "input_tokens_removed",
            "input_tokens_compressed",
            "input_tokens_cache_read",
        ):
            if getattr(self, name) < 0:
                raise ValueError(f"{name} must be non-negative")
        if self.input_tokens_cache_read > self.input_tokens_compressed:
            raise ValueError("cache_read cannot exceed compressed tokens sent")


def cache_hit_ratio(window: UsageWindow) -> float:
    """Observed cache-hit ratio on the tokens actually sent to the provider."""
    if window.input_tokens_compressed == 0:
        return 0.0
    return window.input_tokens_cache_read / window.input_tokens_compressed


def blended_rate(rate: ModelRate, hit_ratio: float) -> float:
    """Cache-blended $/token. Removed tokens are valued at this rate so we never
    bill discounts the customer would already have received via prompt caching."""
    hit_ratio = min(max(hit_ratio, 0.0), 1.0)
    return rate.cached_input_rate * hit_ratio + rate.base_input_rate * (1.0 - hit_ratio)


def gross_savings(window: UsageWindow, rate: ModelRate) -> float:
    """Dashboard-only headline: removed tokens at full base rate."""
    return window.input_tokens_removed * rate.base_input_rate


def net_savings(window: UsageWindow, rate: ModelRate) -> float:
    """Billable savings: removed tokens at the cache-blended rate."""
    return window.input_tokens_removed * blended_rate(rate, cache_hit_ratio(window))


def wisp_fee(
    measured_net_savings: float,
    take_rate: float = 0.10,
    monthly_cap: float | None = None,
) -> float:
    """Wisp's capped share of net savings: min(net * take_rate, cap)."""
    if not 0.0 <= take_rate <= 1.0:
        raise ValueError("take_rate must be in [0, 1]")
    fee = measured_net_savings * take_rate
    if monthly_cap is not None:
        fee = min(fee, monthly_cap)
    return max(fee, 0.0)


def summarize(
    windows: list[UsageWindow],
    rates: dict[str, ModelRate],
    take_rate: float = 0.10,
    monthly_cap: float | None = None,
) -> dict[str, float]:
    """Roll up a set of windows into gross, net, and capped fee.

    Raises KeyError if a window references a model with no resolved rate, so we
    never silently bill at a wrong/zero rate.
    """
    gross = 0.0
    net = 0.0
    tokens_removed = 0
    for w in windows:
        rate = rates[w.model]
        gross += gross_savings(w, rate)
        net += net_savings(w, rate)
        tokens_removed += w.input_tokens_removed
    # No rounding here: the meter is rounded exactly once, at the billing
    # boundary (cents reported to Stripe). Keeping raw floats makes this Python
    # reference and the TypeScript authoritative path numerically identical.
    return {
        "total_tokens_removed": float(tokens_removed),
        "gross_savings": gross,
        "measured_savings": net,
        "wisp_fee": wisp_fee(net, take_rate, monthly_cap),
    }
