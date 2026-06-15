"""Durable metering state — makes telemetry lossless and idempotent.

The supervisor persists the committed log offset and, while a flush is in
flight, the exact identity of the pending batch (id + window + byte range). That
lets us:

  * advance the offset ONLY after a batch is durably ingested (no loss on a
    failed flush, which the old in-memory loop dropped), and
  * reproduce a byte-identical batch on retry (same ``batch_id``), which the
    SaaS dedupes on ``(batch_id, model)`` (no double-count, restart-safe).
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass
class PendingBatch:
    """A batch that has been built and is awaiting confirmed ingest."""

    batch_id: str
    window_start: str
    window_end: str
    to_offset: int


@dataclass
class MeteringState:
    committed_offset: int = 0
    window_start: str | None = None
    pending: PendingBatch | None = None


def load_state(path: Path) -> MeteringState:
    """Load state, returning a fresh one if the file is missing or unreadable."""
    try:
        raw = json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError, OSError, UnicodeDecodeError):
        return MeteringState()
    pending = raw.get("pending")
    return MeteringState(
        committed_offset=int(raw.get("committed_offset") or 0),
        window_start=raw.get("window_start"),
        pending=PendingBatch(**pending) if pending else None,
    )


def save_state(path: Path, state: MeteringState) -> None:
    """Atomically persist state (temp file + os.replace) so a crash mid-write
    never corrupts it."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = {
        "committed_offset": state.committed_offset,
        "window_start": state.window_start,
        "pending": asdict(state.pending) if state.pending else None,
    }
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data))
    os.replace(tmp, p)


def new_batch_id() -> str:
    return str(uuid.uuid4())
