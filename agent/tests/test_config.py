"""Config resolves tenant identity from the documented and legacy env names.

The MDM enrol script and all deployment docs use WISP_TENANT_ID; the agent
historically read WISP_TENANCY_ID. Both must work so the env-only gateway /
container path (no MDM profile on disk) is configurable with the documented name.
"""

import pytest

from wisp_agent.config import load_config


def _base_env(monkeypatch, tmp_path):
    # Point at an absent profile so config is resolved purely from env vars,
    # exactly like the Docker/gateway deployment.
    monkeypatch.setenv("WISP_CONFIG_PROFILE", str(tmp_path / "absent.json"))
    monkeypatch.setenv("WISP_DEVICE_ID", "00000000-0000-4000-8000-0000000000aa")
    monkeypatch.setenv("WISP_SAAS_ENDPOINT", "https://example.test")
    monkeypatch.setenv("WISP_ENROLMENT_TOKEN", "tok")
    for key in ("WISP_TENANT_ID", "WISP_TENANCY_ID"):
        monkeypatch.delenv(key, raising=False)


def test_documented_wisp_tenant_id_is_accepted(monkeypatch, tmp_path):
    _base_env(monkeypatch, tmp_path)
    monkeypatch.setenv("WISP_TENANT_ID", "tenant-doc")
    assert load_config().tenancy_id == "tenant-doc"


def test_legacy_wisp_tenancy_id_still_works(monkeypatch, tmp_path):
    _base_env(monkeypatch, tmp_path)
    monkeypatch.setenv("WISP_TENANCY_ID", "tenant-legacy")
    assert load_config().tenancy_id == "tenant-legacy"


def test_documented_name_wins_when_both_set(monkeypatch, tmp_path):
    _base_env(monkeypatch, tmp_path)
    monkeypatch.setenv("WISP_TENANT_ID", "tenant-doc")
    monkeypatch.setenv("WISP_TENANCY_ID", "tenant-legacy")
    assert load_config().tenancy_id == "tenant-doc"


def test_missing_tenant_raises_pointing_at_documented_name(monkeypatch, tmp_path):
    _base_env(monkeypatch, tmp_path)
    with pytest.raises(RuntimeError, match="WISP_TENANT_ID"):
        load_config()
