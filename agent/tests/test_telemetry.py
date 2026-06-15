"""Tests for the PII-free telemetry guard -- the security-review contract."""

import dataclasses

import pytest

from wisp_agent.telemetry import (
    FORBIDDEN_FIELDS,
    UsageBatch,
    UsageEvent,
    assert_pii_free,
    serialize,
)


def _event(**over) -> UsageEvent:
    base = dict(
        model="claude-sonnet-4-6",
        requests=42,
        input_tokens_original=1_875_300,
        input_tokens_compressed=562_590,
        input_tokens_removed=1_312_710,
        input_tokens_cache_read=120_400,
        output_tokens=88_120,
        policy_level="aggressive",
    )
    base.update(over)
    return UsageEvent(**base)


def _batch(events) -> UsageBatch:
    return UsageBatch(
        tenant_id="t-1",
        device_id="d-opaque-1",
        agent_version="0.1.0",
        headroom_version="0.25.0",
        window_start="2026-06-15T09:00:00Z",
        window_end="2026-06-15T09:05:00Z",
        events=events,
    )


def test_clean_batch_passes_and_serializes():
    batch = _batch([_event()])
    assert_pii_free(batch)
    payload = serialize(batch)
    assert payload["events"][0]["input_tokens_removed"] == 1_312_710
    # Optional null digest is dropped.
    assert "headroom_input_digest" not in payload["events"][0]


def test_event_schema_has_no_forbidden_fields():
    # The dataclass itself must never define a content/identifying field.
    field_names = {f.name for f in dataclasses.fields(UsageEvent)}
    assert not (field_names & FORBIDDEN_FIELDS)


def test_guard_rejects_injected_forbidden_field(monkeypatch):
    # Simulate a regression that adds a content field to an event's dict.
    batch = _batch([_event()])

    bad = dataclasses.asdict(batch.events[0])
    bad["prompt"] = "secret source code"

    # Monkeypatch asdict path by constructing a fake event-like object.
    class FakeEvent:
        def __init__(self, d):
            self._d = d

    import wisp_agent.telemetry as tele

    monkeypatch.setattr(tele, "asdict", lambda e: e._d if isinstance(e, FakeEvent) else dataclasses.asdict(e))
    bad_batch = _batch([FakeEvent(bad)])
    with pytest.raises(ValueError, match="forbidden"):
        assert_pii_free(bad_batch)


def test_digest_is_allowed_metadata():
    batch = _batch([_event(headroom_input_digest="sha256:abc123")])
    payload = serialize(batch)
    assert payload["events"][0]["headroom_input_digest"] == "sha256:abc123"
