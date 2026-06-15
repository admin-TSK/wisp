"""Map a Wisp policy level onto Headroom configuration.

IT owns policy (set via MDM config profile). `off` is audit/passthrough (no
compression). Shadow *billing* is a separate concept handled by the SaaS
(billing_config.shadow_until) — we always compress-and-apply for real numbers
and gate billing instead of running a dry-run.
"""

from __future__ import annotations

# Wisp level -> Headroom proxy env overlay (headroom-ai 0.25.0).
# `off` uses `--no-optimize` on the CLI (see proxy_supervisor); others use
# HEADROOM_MODE=token with min/max crush knobs.
_LEVEL_TO_HEADROOM: dict[str, dict[str, str]] = {
    "off": {},
    "conservative": {
        "HEADROOM_MODE": "token",
        "HEADROOM_MIN_TOKENS": "2000",
        "HEADROOM_MAX_ITEMS": "50",
    },
    "balanced": {
        "HEADROOM_MODE": "token",
        "HEADROOM_MIN_TOKENS": "500",
        "HEADROOM_MAX_ITEMS": "15",
    },
    "aggressive": {
        "HEADROOM_MODE": "token",
        "HEADROOM_MIN_TOKENS": "0",
        "HEADROOM_MAX_ITEMS": "8",
    },
}


def headroom_env_for(level: str) -> dict[str, str]:
    """Return the Headroom env overlay for a Wisp policy level."""
    if level not in _LEVEL_TO_HEADROOM:
        raise ValueError(f"unknown policy level: {level!r}")
    return dict(_LEVEL_TO_HEADROOM[level])


def is_passthrough(level: str) -> bool:
    return level == "off"
