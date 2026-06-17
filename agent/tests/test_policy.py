"""Policy level → Headroom env overlay."""

import pytest

from wisp_agent.policy import headroom_env_for, is_passthrough


def test_aggressive_does_not_compress_user_messages():
    env = headroom_env_for("aggressive")
    assert env.get("HEADROOM_COMPRESS_USER_MESSAGES") is None
    assert env["HEADROOM_MIN_TOKENS"] == "0"


def test_hyper_enables_maximum_compression():
    env = headroom_env_for("hyper")
    assert env["HEADROOM_SAVINGS_PROFILE"] == "agent-90"
    assert env["HEADROOM_COMPRESS_USER_MESSAGES"] == "1"
    assert env["HEADROOM_COMPRESS_SYSTEM_MESSAGES"] == "1"
    assert env["HEADROOM_PROTECT_RECENT"] == "0"
    assert env["HEADROOM_FORCE_KOMPRESS"] == "1"
    assert env["HEADROOM_MIN_TOKENS"] == "0"
    assert env["HEADROOM_TARGET_RATIO"] == "0.05"


def test_hyper_does_not_override_subscription_safety():
    # hyper must NOT disable Headroom's auth-mode enforcement: it stays
    # aggressive on PAYG/API-key traffic but respects the vendor's
    # subscription-safe policy for Claude Pro/Max (OAuth) traffic.
    env = headroom_env_for("hyper")
    assert "HEADROOM_PROXY_AUTH_MODE_POLICY_ENFORCEMENT" not in env


def test_unknown_level_raises():
    with pytest.raises(ValueError, match="unknown policy level"):
        headroom_env_for("turbo")


def test_only_off_is_passthrough():
    assert is_passthrough("off")
    assert not is_passthrough("hyper")
