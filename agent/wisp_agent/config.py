"""Agent configuration: WISP_* env vars + the MDM-delivered config profile.

Resolves tenancy/device identity and the active compression policy. The config
profile (.mobileconfig on macOS) is the channel IT uses to set policy centrally;
env vars are the resolved runtime values.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_PROXY_PORT = 8787
DEFAULT_LOCAL_STATS_PORT = 8788
DEFAULT_FLUSH_INTERVAL_S = 300
DEFAULT_LOG_FILE = Path("/var/log/wisp/headroom.jsonl")
DEFAULT_STATE_FILE = Path("/var/lib/wisp/state.json")
VALID_POLICY_LEVELS = ("off", "conservative", "balanced", "aggressive", "hyper")


@dataclass(frozen=True)
class AgentConfig:
    tenancy_id: str
    device_id: str
    saas_endpoint: str
    enrolment_token: str
    proxy_port: int = DEFAULT_PROXY_PORT
    local_stats_port: int = DEFAULT_LOCAL_STATS_PORT
    policy_level: str = "aggressive"
    flush_interval_s: int = DEFAULT_FLUSH_INTERVAL_S
    log_file: Path = DEFAULT_LOG_FILE
    state_file: Path = DEFAULT_STATE_FILE

    def __post_init__(self) -> None:
        if self.policy_level not in VALID_POLICY_LEVELS:
            raise ValueError(
                f"invalid policy level {self.policy_level!r}; "
                f"expected one of {VALID_POLICY_LEVELS}"
            )


def _profile_path() -> Path:
    # macOS MDM config profiles materialize values here for the agent to read.
    return Path(os.environ.get("WISP_CONFIG_PROFILE", "/Library/Application Support/Wisp/profile.json"))


def load_config() -> AgentConfig:
    """Load config from the MDM profile (if present), with env-var overrides."""
    profile: dict = {}
    path = _profile_path()
    if path.exists():
        profile = json.loads(path.read_text())

    def get(env_key: str, profile_key: str, default: str | None = None) -> str | None:
        return os.environ.get(env_key, profile.get(profile_key, default))

    def get_any(
        env_keys: tuple[str, ...], profile_key: str, default: str | None = None
    ) -> str | None:
        for key in env_keys:
            val = os.environ.get(key)
            if val:
                return val
        return profile.get(profile_key, default)

    # WISP_TENANT_ID is the name used by the MDM enrol script and every deployment
    # doc; WISP_TENANCY_ID is the historical agent name. Accept both so the
    # env-only gateway/container path works with the documented variable.
    tenancy_id = get_any(("WISP_TENANT_ID", "WISP_TENANCY_ID"), "tenancy_id")
    device_id = get("WISP_DEVICE_ID", "device_id")
    saas_endpoint = get("WISP_SAAS_ENDPOINT", "saas_endpoint")
    enrolment_token = get("WISP_ENROLMENT_TOKEN", "enrolment_token")

    missing = [
        name
        for name, val in {
            "WISP_TENANT_ID": tenancy_id,
            "WISP_DEVICE_ID": device_id,
            "WISP_SAAS_ENDPOINT": saas_endpoint,
            "WISP_ENROLMENT_TOKEN": enrolment_token,
        }.items()
        if not val
    ]
    if missing:
        raise RuntimeError(f"missing required config: {', '.join(missing)}")

    log_raw = get("WISP_LOG_FILE", "log_file", str(DEFAULT_LOG_FILE))
    state_raw = get("WISP_STATE_FILE", "state_file", str(DEFAULT_STATE_FILE))

    return AgentConfig(
        tenancy_id=tenancy_id,
        device_id=device_id,
        saas_endpoint=saas_endpoint.rstrip("/"),
        enrolment_token=enrolment_token,
        proxy_port=int(get("WISP_PROXY_PORT", "proxy_port", str(DEFAULT_PROXY_PORT))),
        local_stats_port=int(
            get("WISP_LOCAL_STATS_PORT", "local_stats_port", str(DEFAULT_LOCAL_STATS_PORT))
        ),
        policy_level=get("WISP_POLICY_LEVEL", "policy_level", "aggressive"),
        flush_interval_s=int(
            get("WISP_FLUSH_INTERVAL", "flush_interval_s", str(DEFAULT_FLUSH_INTERVAL_S))
        ),
        log_file=Path(log_raw),
        state_file=Path(state_raw),
    )
