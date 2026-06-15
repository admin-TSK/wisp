"""Tests for Headroom stats normalization (JSONL + /stats fallback)."""

import json
from pathlib import Path

from wisp_agent.stats_adapter import (
    ModelStats,
    read_log_stats,
    read_proxy_stats,
    _normalize_aggregate,
)


def test_parse_log_line_aggregates_by_model(tmp_path: Path):
    log = tmp_path / "run.jsonl"
    rows = [
        {
            "model": "gpt-4o-mini",
            "input_tokens_original": 1000,
            "input_tokens_optimized": 400,
            "output_tokens": 50,
        },
        {
            "model": "gpt-4o-mini",
            "input_tokens_original": 500,
            "input_tokens_optimized": 500,
            "output_tokens": 10,
        },
        {
            "model": "claude-sonnet-4-6",
            "input_tokens_original": 2000,
            "input_tokens_optimized": 800,
            "output_tokens": 120,
        },
    ]
    log.write_text("\n".join(json.dumps(r) for r in rows) + "\n")

    stats, offset = read_log_stats(log, offset=0)
    assert offset == log.stat().st_size
    assert len(stats) == 2

    mini = next(s for s in stats if s.model == "gpt-4o-mini")
    assert mini.requests == 2
    assert mini.input_tokens_original == 1500
    assert mini.input_tokens_compressed == 900
    assert mini.input_tokens_removed == 600
    assert mini.input_tokens_cache_read == 0  # not observable in 0.25.0
    assert mini.output_tokens == 60


def test_log_delta_reads_only_new_lines(tmp_path: Path):
    log = tmp_path / "run.jsonl"
    log.write_text(
        json.dumps(
            {
                "model": "gpt-4o-mini",
                "input_tokens_original": 10,
                "input_tokens_optimized": 5,
                "output_tokens": 1,
            }
        )
        + "\n"
    )
    _, offset = read_log_stats(log, offset=0)
    log.write_text(
        log.read_text()
        + json.dumps(
            {
                "model": "gpt-4o-mini",
                "input_tokens_original": 20,
                "input_tokens_optimized": 10,
                "output_tokens": 2,
            }
        )
        + "\n"
    )
    delta, new_offset = read_log_stats(log, offset=offset)
    assert len(delta) == 1
    assert delta[0].input_tokens_original == 20
    assert new_offset == log.stat().st_size


def test_normalize_aggregate_single_bucket():
    raw = {
        "tokens": {"input": 1000, "output": 200, "saved": 300},
        "requests": {"total": 5, "by_model": {}},
    }
    stats = _normalize_aggregate(raw)
    assert len(stats) == 1
    s = stats[0]
    assert s.model == "*aggregate*"
    assert s.input_tokens_original == 1000
    assert s.input_tokens_compressed == 700
    assert s.input_tokens_removed == 300


def test_normalize_aggregate_splits_by_model_requests():
    raw = {
        "tokens": {"input": 1000, "output": 200, "saved": 200},
        "requests": {"total": 10, "by_model": {"gpt-4o": 7, "claude": 3}},
    }
    stats = _normalize_aggregate(raw)
    assert len(stats) == 2
    gpt = next(s for s in stats if s.model == "gpt-4o")
    assert gpt.requests == 7
    assert gpt.input_tokens_original == 700


def test_read_proxy_stats_without_log(monkeypatch):
    class FakeResp:
        status = 200

        def read(self):
            return json.dumps(
                {
                    "tokens": {"input": 100, "output": 10, "saved": 20},
                    "requests": {"total": 1, "by_model": {}},
                }
            ).encode()

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    monkeypatch.setattr("urllib.request.urlopen", lambda *a, **k: FakeResp())
    stats, offset = read_proxy_stats(8787)
    assert offset == 0
    assert isinstance(stats[0], ModelStats)
