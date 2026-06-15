"""Tests for the net-of-cache billing math -- the number we charge on."""

import math

import pytest

from wisp_agent.billing import (
    ModelRate,
    UsageWindow,
    blended_rate,
    cache_hit_ratio,
    gross_savings,
    net_savings,
    summarize,
    wisp_fee,
)

# Claude Sonnet 4.6: $3/M base, $0.30/M cached -> per-token.
SONNET = ModelRate(base_input_rate=3.0 / 1_000_000, cached_input_rate=0.30 / 1_000_000)


def test_cache_hit_ratio_zero_when_nothing_sent():
    w = UsageWindow("m", input_tokens_removed=0, input_tokens_compressed=0, input_tokens_cache_read=0)
    assert cache_hit_ratio(w) == 0.0


def test_blended_rate_interpolates_between_base_and_cached():
    assert blended_rate(SONNET, 0.0) == SONNET.base_input_rate
    assert blended_rate(SONNET, 1.0) == SONNET.cached_input_rate
    mid = blended_rate(SONNET, 0.5)
    assert math.isclose(mid, (SONNET.base_input_rate + SONNET.cached_input_rate) / 2)


def test_blended_rate_clamps_out_of_range_ratio():
    assert blended_rate(SONNET, 5.0) == SONNET.cached_input_rate
    assert blended_rate(SONNET, -1.0) == SONNET.base_input_rate


def test_gross_vs_net_no_cache():
    # 1M tokens removed, no cache hits -> gross == net == $3.
    w = UsageWindow("m", input_tokens_removed=1_000_000, input_tokens_compressed=500_000, input_tokens_cache_read=0)
    assert math.isclose(gross_savings(w, SONNET), 3.0)
    assert math.isclose(net_savings(w, SONNET), 3.0)


def test_net_is_lower_than_gross_when_cache_hits_present():
    # Half of sent tokens were cache hits -> blended rate below base -> net < gross.
    w = UsageWindow("m", input_tokens_removed=1_000_000, input_tokens_compressed=1_000_000, input_tokens_cache_read=500_000)
    g = gross_savings(w, SONNET)
    n = net_savings(w, SONNET)
    assert n < g
    # blended = 0.5*0.30 + 0.5*3.0 = 1.65 $/M
    assert math.isclose(n, 1.65)


def test_wisp_fee_default_take_rate_and_cap():
    assert math.isclose(wisp_fee(1000.0), 100.0)  # 10%
    assert math.isclose(wisp_fee(1000.0, take_rate=0.10, monthly_cap=50.0), 50.0)


def test_wisp_fee_rejects_bad_take_rate():
    with pytest.raises(ValueError):
        wisp_fee(100.0, take_rate=1.5)


def test_summarize_rolls_up_and_caps():
    windows = [
        UsageWindow("claude-sonnet-4-6", 1_000_000, 1_000_000, 0),
        UsageWindow("claude-sonnet-4-6", 2_000_000, 2_000_000, 1_000_000),
    ]
    rates = {"claude-sonnet-4-6": SONNET}
    out = summarize(windows, rates, take_rate=0.10)
    assert out["total_tokens_removed"] == 3_000_000
    # gross = 3*1 + 3*2 = 9 ; net = 3*1 + 2*blended(0.5)=2*1.65=3.3 -> 6.3
    assert math.isclose(out["gross_savings"], 9.0)
    assert math.isclose(out["measured_savings"], 6.3)
    assert math.isclose(out["wisp_fee"], 0.63)


def test_summarize_raises_on_missing_rate():
    with pytest.raises(KeyError):
        summarize([UsageWindow("unknown", 1, 1, 0)], {}, take_rate=0.1)


def test_usage_window_rejects_impossible_cache():
    with pytest.raises(ValueError):
        UsageWindow("m", input_tokens_removed=0, input_tokens_compressed=10, input_tokens_cache_read=20)
