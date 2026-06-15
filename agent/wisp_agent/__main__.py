"""Agent entrypoint: supervise proxy, serve local stats, flush telemetry.

Run as `wisp-agent` (see pyproject scripts) or `python -m wisp_agent`.

Metering is lossless and idempotent (see metering_state.py): we build a batch,
persist its identity + byte range, flush, and only advance the committed offset
once ingest is confirmed. A failed flush is retried with the SAME batch_id over
the SAME byte range, so nothing is lost and nothing is double-counted — even
across a process restart.
"""

from __future__ import annotations

import threading
import time
from datetime import datetime, timezone

from . import __version__
from .config import AgentConfig, load_config
from .local_stats import GlanceSnapshot, compute_glance, serve
from .metering_state import (
    MeteringState,
    PendingBatch,
    load_state,
    new_batch_id,
    save_state,
)
from .proxy_supervisor import ProxySupervisor
from .stats_adapter import ModelStats, read_cumulative_log_stats, read_log_stats, read_proxy_stats
from .telemetry import UsageBatch, UsageEvent, flush

HEADROOM_VERSION = "0.25.0"  # kept in lockstep with the pin in pyproject.toml


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_read_window(cfg: AgentConfig, offset: int) -> tuple[list[ModelStats], int]:
    """Stats from `offset` to EOF (delta since last commit)."""
    try:
        return read_log_stats(cfg.log_file, offset=offset)
    except Exception:  # noqa: BLE001 -- never let a stats hiccup kill the agent
        return [], offset


def _safe_read_range(cfg: AgentConfig, start: int, end: int) -> list[ModelStats]:
    """Reproduce the exact stats for a pending batch's byte range."""
    try:
        stats, _ = read_log_stats(cfg.log_file, offset=start, end=end)
        return stats
    except Exception:  # noqa: BLE001
        return []


def _safe_read_cumulative(cfg: AgentConfig) -> list[ModelStats]:
    try:
        if cfg.log_file.exists():
            return read_cumulative_log_stats(cfg.log_file)
        stats, _ = read_proxy_stats(cfg.proxy_port)
        return stats
    except Exception:  # noqa: BLE001
        return []


def _build_batch(cfg: AgentConfig, stats: list[ModelStats], pending: PendingBatch) -> UsageBatch:
    events = [
        UsageEvent(
            model=s.model,
            requests=s.requests,
            input_tokens_original=s.input_tokens_original,
            input_tokens_compressed=s.input_tokens_compressed,
            input_tokens_removed=s.input_tokens_removed,
            input_tokens_cache_read=s.input_tokens_cache_read,
            output_tokens=s.output_tokens,
            policy_level=cfg.policy_level,
        )
        for s in stats
    ]
    return UsageBatch(
        tenant_id=cfg.tenancy_id,
        device_id=cfg.device_id,
        agent_version=__version__,
        headroom_version=HEADROOM_VERSION,
        window_start=pending.window_start,
        window_end=pending.window_end,
        events=events,
        batch_id=pending.batch_id,  # pinned so retries are idempotent
    )


def _flush_pending(cfg: AgentConfig, state: MeteringState) -> bool:
    """(Re)build and flush the pending batch. On success, commit and clear it.

    Returns True if the batch was confirmed ingested (or was empty), False if it
    should be retried next cycle.
    """
    assert state.pending is not None
    stats = _safe_read_range(cfg, state.committed_offset, state.pending.to_offset)
    batch = _build_batch(cfg, stats, state.pending)
    try:
        flush(batch, endpoint=cfg.saas_endpoint, enrolment_token=cfg.enrolment_token)
    except Exception:  # noqa: BLE001 -- keep pending; identical retry next cycle
        return False

    # Confirmed ingested: advance the durable offset and close the window.
    state.committed_offset = state.pending.to_offset
    state.window_start = state.pending.window_end
    state.pending = None
    save_state(cfg.state_file, state)
    return True


def run(cfg: AgentConfig) -> None:
    supervisor = ProxySupervisor(cfg.proxy_port, cfg.policy_level, cfg.log_file)
    supervisor.start()
    supervisor.wait_ready()

    def snapshot() -> GlanceSnapshot:
        return compute_glance(
            _safe_read_cumulative(cfg),
            cfg.policy_level,
            supervisor.is_ready(),
        )

    stats_server = serve(cfg.local_stats_port, snapshot)
    threading.Thread(target=stats_server.serve_forever, daemon=True).start()

    state = load_state(cfg.state_file)
    if state.window_start is None:
        state.window_start = _now_iso()
        save_state(cfg.state_file, state)

    while True:
        time.sleep(cfg.flush_interval_s)
        supervisor.ensure_running()

        # Resume an in-flight batch first (e.g. after a prior failed flush or a
        # restart) so its identity is preserved before we read any new data.
        if state.pending is not None:
            if not _flush_pending(cfg, state):
                continue

        stats, new_offset = _safe_read_window(cfg, state.committed_offset)
        if not stats or new_offset <= state.committed_offset:
            continue

        state.pending = PendingBatch(
            batch_id=new_batch_id(),
            window_start=state.window_start or _now_iso(),
            window_end=_now_iso(),
            to_offset=new_offset,
        )
        save_state(cfg.state_file, state)  # durable BEFORE the network call
        _flush_pending(cfg, state)


def main() -> None:
    run(load_config())


if __name__ == "__main__":
    main()
