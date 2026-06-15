"""Aggregate, PII-free telemetry: build UsageBatch objects and flush to the SaaS.

Hard guarantee (prime directive #2): the only fields that leave the endpoint are
counts and non-identifying metadata. Any free-text / content field is a build
error -- enforced by `assert_pii_free`, which is exercised in tests.
"""

from __future__ import annotations

import json
import urllib.request
import uuid
from dataclasses import asdict, dataclass, field

# Fields that may NEVER appear in an outgoing event. If a refactor ever adds one
# of these, the schema guard raises and CI fails.
FORBIDDEN_FIELDS = frozenset(
    {
        "prompt",
        "text",
        "message",
        "messages",
        "content",
        "body",
        "code",
        "snippet",
        "file",
        "file_path",
        "filepath",
        "filename",
        "path",
        "repo",
        "repository",
        "branch",
        "username",
        "user",
        "email",
        "ip",
        "hostname",
    }
)

ALLOWED_EVENT_FIELDS = frozenset(
    {
        "model",
        "requests",
        "input_tokens_original",
        "input_tokens_compressed",
        "input_tokens_removed",
        "input_tokens_cache_read",
        "output_tokens",
        "policy_level",
        "headroom_input_digest",
    }
)


@dataclass(frozen=True)
class UsageEvent:
    model: str
    requests: int
    input_tokens_original: int
    input_tokens_compressed: int
    input_tokens_removed: int
    input_tokens_cache_read: int
    output_tokens: int
    policy_level: str
    headroom_input_digest: str | None = None  # opaque hash, enables deterministic recompute audit


@dataclass(frozen=True)
class UsageBatch:
    tenant_id: str
    device_id: str  # opaque enrolment id, NOT a hostname/username
    agent_version: str
    headroom_version: str
    window_start: str
    window_end: str
    events: list[UsageEvent] = field(default_factory=list)
    # Stable per-window id reused on retry; the SaaS uses (batch_id, model) as
    # its ingest idempotency key. Auto-generated unless the supervisor pins one.
    batch_id: str = field(default_factory=lambda: str(uuid.uuid4()))


def assert_pii_free(batch: UsageBatch) -> None:
    """Raise if any event carries a forbidden (content/identifying) field."""
    for event in batch.events:
        keys = set(asdict(event).keys())
        leaked = keys & FORBIDDEN_FIELDS
        if leaked:
            raise ValueError(f"telemetry would leak forbidden fields: {sorted(leaked)}")
        unexpected = keys - ALLOWED_EVENT_FIELDS
        if unexpected:
            raise ValueError(f"telemetry has unexpected fields (review for PII): {sorted(unexpected)}")


def serialize(batch: UsageBatch) -> dict:
    assert_pii_free(batch)
    payload = asdict(batch)
    # Drop None digest to keep payloads lean.
    for ev in payload["events"]:
        if ev.get("headroom_input_digest") is None:
            ev.pop("headroom_input_digest", None)
    return payload


def flush(batch: UsageBatch, *, endpoint: str, enrolment_token: str, timeout: float = 10.0) -> int:
    """POST the batch to the SaaS telemetry ingest endpoint. Returns HTTP status.

    The server resolves tenant_id from the token, never trusting the body.
    """
    data = json.dumps(serialize(batch)).encode("utf-8")
    req = urllib.request.Request(
        url=f"{endpoint}/api/telemetry",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {enrolment_token}",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (trusted endpoint)
        return resp.status
