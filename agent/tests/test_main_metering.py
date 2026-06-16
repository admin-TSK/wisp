"""Integration tests for metering loop edge cases."""

import json
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from wisp_agent import __main__ as main_mod
from wisp_agent.config import AgentConfig
from wisp_agent.metering_state import MeteringState, PendingBatch, load_state, save_state
from wisp_agent.stats_adapter import read_log_stats


def _cfg(log: Path, state: Path) -> AgentConfig:
    return AgentConfig(
        tenancy_id="t",
        device_id="d",
        saas_endpoint="http://127.0.0.1:9",
        enrolment_token="tok",
        log_file=log,
        state_file=state,
        flush_interval_s=1,
    )


def test_unmeterable_line_does_not_stall_offset(tmp_path: Path):
    log = tmp_path / "run.jsonl"
    log.write_text('{"not":"a model line"}\n' + json.dumps({"model": "m", "input_tokens_original": 10, "input_tokens_optimized": 5}) + "\n")

    stats, end = read_log_stats(log, offset=0)
    assert stats[0].input_tokens_original == 10
    assert end > 0

    bad_only, bad_end = read_log_stats(log, offset=0, end=len('{"not":"a model line"}\n'))
    assert bad_only == []
    assert bad_end == len('{"not":"a model line"}\n')


def test_flush_pending_skips_empty_stats_over_nonempty_range(tmp_path: Path):
    log = tmp_path / "run.jsonl"
    state_path = tmp_path / "state.json"
    log.write_text('garbage\n')

    cfg = _cfg(log, state_path)
    state = MeteringState(
        committed_offset=0,
        window_start="2026-06-15T00:00:00+00:00",
        pending=PendingBatch(
            batch_id="b1",
            window_start="2026-06-15T00:00:00+00:00",
            window_end="2026-06-15T01:00:00+00:00",
            to_offset=len("garbage\n"),
        ),
    )

    with patch.object(main_mod, "flush") as mock_flush:
        ok = main_mod._flush_pending(cfg, state)
        assert ok is True
        mock_flush.assert_not_called()
        assert state.committed_offset == len("garbage\n")
        assert state.pending is None


def test_corrupt_pending_quarantined(tmp_path: Path):
    p = tmp_path / "state.json"
    p.write_text('{"committed_offset": 7, "pending": {"batch_id": "x"}}')
    st = load_state(p)
    assert st.committed_offset == 7
    assert st.pending is None
    assert (tmp_path / "state.json.corrupt").exists()


def test_load_state_valid_pending(tmp_path: Path):
    p = tmp_path / "state.json"
    save_state(
        p,
        MeteringState(
            committed_offset=42,
            pending=PendingBatch("b", "s", "e", 99),
        ),
    )
    st = load_state(p)
    assert st.pending is not None
    assert st.pending.to_offset == 99


def test_now_iso_uses_z_suffix_not_offset():
    """Telemetry windows must match the SaaS contract, which accepts an RFC 3339
    'Z' (or offset) but the default Zod validator rejected the bare '+00:00' that
    isoformat() emits. Guard the normalized shape so this can't silently regress.
    """
    ts = main_mod._now_iso()
    assert ts.endswith("Z"), ts
    assert "+00:00" not in ts
    # Round-trips to an aware UTC datetime across Python 3.10–3.14.
    parsed = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    assert parsed.utcoffset() is not None
    assert parsed.utcoffset().total_seconds() == 0
