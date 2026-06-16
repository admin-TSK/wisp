"""The single integration seam with Headroom's measurement output.

ISOLATED ON PURPOSE: if Headroom's stats surface changes between pinned
versions, only this file moves. Everything else in the agent depends on the
normalized `ModelStats` shape below, not on Headroom internals.

Headroom 0.25.0 surfaces:
  - `/stats` — aggregate counters only (tokens.input/output/saved, requests.by_model)
  - `--log-file` JSONL — per-request model + token counts (primary metering source)

Billing note: provider cache-read *token counts* are not observable per request
in 0.25.0 (only a boolean `cache_hit`). We therefore report
`input_tokens_cache_read=0` until Headroom exposes counts; net savings equals
gross until cache reads are measurable (honest fallback, documented in billing.py).
"""

from __future__ import annotations

import json
import urllib.request
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ModelStats:
    """Normalized per-model counts for a measurement window. Counts only."""

    model: str
    requests: int
    input_tokens_original: int
    input_tokens_compressed: int
    input_tokens_cache_read: int
    output_tokens: int

    @property
    def input_tokens_removed(self) -> int:
        return max(self.input_tokens_original - self.input_tokens_compressed, 0)


@dataclass
class _Agg:
    requests: int = 0
    input_original: int = 0
    input_compressed: int = 0
    output: int = 0


def _parse_log_line(raw: dict) -> tuple[str, _Agg] | None:
    """Map one Headroom JSONL record to an aggregation bucket."""
    model = raw.get("model")
    if not model:
        return None
    try:
        original = int(raw.get("input_tokens_original") or 0)
        optimized = int(raw.get("input_tokens_optimized") or original)
        output = int(raw.get("output_tokens") or 0)
    except (TypeError, ValueError):
        return None
    return str(model), _Agg(
        requests=1,
        input_original=original,
        input_compressed=optimized,
        output=output,
    )


def _merge(bucket: dict[str, _Agg], model: str, row: _Agg) -> None:
    agg = bucket.setdefault(model, _Agg())
    agg.requests += row.requests
    agg.input_original += row.input_original
    agg.input_compressed += row.input_compressed
    agg.output += row.output


def _bucket_to_stats(bucket: dict[str, _Agg]) -> list[ModelStats]:
    out: list[ModelStats] = []
    for model, a in sorted(bucket.items()):
        out.append(
            ModelStats(
                model=model,
                requests=a.requests,
                input_tokens_original=a.input_original,
                input_tokens_compressed=a.input_compressed,
                # Cache-read counts not exposed per request in headroom-ai 0.25.0.
                input_tokens_cache_read=0,
                output_tokens=a.output,
            )
        )
    return out


def read_log_stats(
    log_path: Path, *, offset: int = 0, end: int | None = None
) -> tuple[list[ModelStats], int]:
    """Aggregate JSONL log lines in ``[offset, end)`` by model.

    Reads to EOF when ``end`` is None. Passing an explicit ``end`` re-reads the
    exact same byte range, so a retried telemetry batch is reproduced
    byte-identically (used by the supervisor's at-least-once retry).
    """
    path = Path(log_path)
    if not path.exists():
        return [], offset

    bucket: dict[str, _Agg] = {}
    new_offset = offset
    with path.open("rb") as fh:
        fh.seek(offset)
        while True:
            if end is not None and fh.tell() >= end:
                break
            line = fh.readline()
            if not line:
                break
            new_offset = fh.tell()
            try:
                raw = json.loads(line.decode("utf-8"))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            parsed = _parse_log_line(raw)
            if parsed:
                _merge(bucket, parsed[0], parsed[1])
    return _bucket_to_stats(bucket), new_offset


def read_cumulative_log_stats(log_path: Path) -> list[ModelStats]:
    """Aggregate the entire JSONL log file (for glance / cumulative views)."""
    stats, _ = read_log_stats(log_path, offset=0)
    return stats


def read_proxy_stats(
    proxy_port: int,
    *,
    log_path: Path | None = None,
    log_offset: int = 0,
    timeout: float = 5.0,
) -> tuple[list[ModelStats], int]:
    """Read normalized stats, preferring JSONL delta when a log path is configured."""
    if log_path is not None:
        return read_log_stats(log_path, offset=log_offset)
    return _normalize_aggregate(_fetch_stats(proxy_port, timeout)), log_offset


def _fetch_stats(proxy_port: int, timeout: float) -> dict:
    url = f"http://127.0.0.1:{proxy_port}/stats"
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (localhost)
        return json.loads(resp.read().decode("utf-8"))


def _normalize_aggregate(raw: dict) -> list[ModelStats]:
    """Fallback when no log file: best-effort from aggregate `/stats`."""
    tokens = raw.get("tokens") or {}
    requests = raw.get("requests") or {}
    by_model_req = requests.get("by_model") or {}

    if by_model_req:
        # Request counts per model exist, but token splits do not — allocate
        # aggregate tokens proportionally by request share (better than dropping).
        total_req = sum(int(v) for v in by_model_req.values()) or 1
        input_t = int(tokens.get("input") or 0)
        output_t = int(tokens.get("output") or 0)
        saved_t = int(tokens.get("saved") or 0)
        compressed = max(input_t - saved_t, 0)
        out: list[ModelStats] = []
        for model, req_count in by_model_req.items():
            share = int(req_count) / total_req
            orig = round(input_t * share)
            comp = round(compressed * share)
            out.append(
                ModelStats(
                    model=str(model),
                    requests=int(req_count),
                    input_tokens_original=orig,
                    input_tokens_compressed=comp,
                    input_tokens_cache_read=0,
                    output_tokens=round(output_t * share),
                )
            )
        return out

    input_t = int(tokens.get("input") or 0)
    saved_t = int(tokens.get("saved") or 0)
    if input_t == 0 and int(requests.get("total") or 0) == 0:
        return []
    return [
        ModelStats(
            model="*aggregate*",
            requests=int(requests.get("total") or 0),
            input_tokens_original=input_t,
            input_tokens_compressed=max(input_t - saved_t, 0),
            input_tokens_cache_read=0,
            output_tokens=int(tokens.get("output") or 0),
        )
    ]
