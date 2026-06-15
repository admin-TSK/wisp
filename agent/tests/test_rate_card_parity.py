"""Drift gate: the rate card must agree across all three sources of truth — the
agent's local card (rate_card.py), the SaaS fallback (rate-card.ts), and the DB
seed (seed.sql). Hand-maintained copies drift; this fails CI when they do."""

import re
from pathlib import Path

from wisp_agent.rate_card import DEFAULT_RATE_CARD

ROOT = Path(__file__).resolve().parents[2]  # repo root (Veil/)
TS_CARD = ROOT / "saas" / "lib" / "billing" / "rate-card.ts"
SEED = ROOT / "supabase" / "seed.sql"
PER_M = 1_000_000


def _parse_ts(text: str) -> dict[str, tuple[float, float]]:
    # e.g.  "gpt-5.5": r(5.0, 0.5),   or   "gpt-5": r(1.25),
    out: dict[str, tuple[float, float]] = {}
    for m in re.finditer(r'"([^"]+)":\s*r\(\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\)', text):
        base = float(m.group(2))
        cached = float(m.group(3)) if m.group(3) is not None else base
        out[m.group(1)] = (base, cached)
    return out


def _parse_seed(text: str) -> dict[str, tuple[float, float]]:
    # e.g.  ('gpt-5.5','openai', 5.00/1e6, 0.50/1e6, 30.00/1e6, '2026-06-01', '...'),
    out: dict[str, tuple[float, float]] = {}
    for m in re.finditer(
        r"\(\s*'([^']+)'\s*,\s*'[^']+'\s*,\s*([0-9.]+)/1e6\s*,\s*([0-9.]+)/1e6", text
    ):
        out[m.group(1)] = (float(m.group(2)), float(m.group(3)))
    return out


def test_rate_card_parity_across_sources():
    ts = _parse_ts(TS_CARD.read_text())
    seed = _parse_seed(SEED.read_text())
    assert ts, "could not parse any rates from rate-card.ts"
    assert seed, "could not parse any rates from seed.sql"

    problems: list[str] = []
    for model, rate in DEFAULT_RATE_CARD.items():
        base = round(rate.base_input_rate * PER_M, 6)
        cached = round(rate.cached_input_rate * PER_M, 6)

        if model not in ts:
            problems.append(f"{model}: missing from rate-card.ts")
        elif abs(ts[model][0] - base) > 1e-6 or abs(ts[model][1] - cached) > 1e-6:
            problems.append(f"{model}: agent=({base},{cached}) vs ts={ts[model]}")

        if model not in seed:
            problems.append(f"{model}: missing from seed.sql")
        elif abs(seed[model][0] - base) > 1e-6 or abs(seed[model][1] - cached) > 1e-6:
            problems.append(f"{model}: agent=({base},{cached}) vs seed={seed[model]}")

    assert not problems, "rate card drift detected:\n  " + "\n  ".join(problems)
