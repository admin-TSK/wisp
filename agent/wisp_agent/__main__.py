"""Agent entrypoint: supervise proxy, serve local stats, flush telemetry.

Run as `wisp-agent` (see pyproject scripts) or `python -m wisp_agent`.

Metering is lossless and idempotent (see metering_state.py): we build a batch,
persist its identity + byte range, flush, and only advance the committed offset
once ingest is confirmed. A failed flush is retried with the SAME batch_id over
the SAME byte range, so nothing is lost and nothing is double-counted — even
across a process restart.
"""

from __future__ import annotations

import logging
import sys
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

log = logging.getLogger("wisp_agent")


def _now_iso() -> str:
    # RFC 3339 with a 'Z' suffix (UTC). isoformat() yields a '+00:00' offset;
    # we normalize to 'Z' so timestamps match JS toISOString() and the SaaS
    # telemetry contract exactly (see saas/lib/telemetry-contract.ts).
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


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


def _skip_unmeterable_range(cfg: AgentConfig, state: MeteringState, end: int) -> None:
    """Advance past bytes that produced no aggregatable stats."""
    state.committed_offset = end
    if state.pending:
        state.window_start = state.pending.window_end
        state.pending = None
    save_state(cfg.state_file, state)


def _flush_pending(cfg: AgentConfig, state: MeteringState) -> bool:
    """(Re)build and flush the pending batch. On success, commit and clear it.

    Returns True if the batch was confirmed ingested (or was empty), False if it
    should be retried next cycle.
    """
    assert state.pending is not None
    start = state.committed_offset
    end = state.pending.to_offset
    stats = _safe_read_range(cfg, start, end)

    if end > start and not stats:
        # Distinguish transient read failure from unmeterable content.
        try:
            stats, _ = read_log_stats(cfg.log_file, offset=start, end=end)
        except Exception:  # noqa: BLE001
            return False
        if not stats:
            log.warning(
                "Skipping unmeterable log range [%d, %d) batch_id=%s",
                start,
                end,
                state.pending.batch_id,
            )
            _skip_unmeterable_range(cfg, state, end)
            return True
        return False

    batch = _build_batch(cfg, stats, state.pending)
    try:
        status = flush(batch, endpoint=cfg.saas_endpoint, enrolment_token=cfg.enrolment_token)
    except Exception as exc:  # noqa: BLE001 -- keep pending; identical retry next cycle
        log.warning("Telemetry flush failed batch_id=%s: %s", batch.batch_id, exc)
        return False

    if status >= 400:
        log.warning("Telemetry flush rejected batch_id=%s status=%s", batch.batch_id, status)
        if status in (401, 403, 422):
            state.pending = None
            save_state(cfg.state_file, state)
        return False

    state.committed_offset = end
    state.window_start = state.pending.window_end
    state.pending = None
    save_state(cfg.state_file, state)
    return True


def run(cfg: AgentConfig) -> None:
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)
    supervisor = ProxySupervisor(cfg.proxy_port, cfg.policy_level, cfg.log_file)
    supervisor.start()
    if not supervisor.wait_ready():
        log.error("Compression proxy did not become ready — metering may be incomplete")

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

        if state.pending is not None:
            if not _flush_pending(cfg, state):
                continue

        stats, new_offset = _safe_read_window(cfg, state.committed_offset)
        if new_offset <= state.committed_offset:
            continue
        if not stats:
            log.debug("Advancing past unmeterable bytes %d -> %d", state.committed_offset, new_offset)
            state.committed_offset = new_offset
            save_state(cfg.state_file, state)
            continue

        state.pending = PendingBatch(
            batch_id=new_batch_id(),
            window_start=state.window_start or _now_iso(),
            window_end=_now_iso(),
            to_offset=new_offset,
        )
        save_state(cfg.state_file, state)
        _flush_pending(cfg, state)


def main() -> None:
    run(load_config())


if __name__ == "__main__":
    main()
