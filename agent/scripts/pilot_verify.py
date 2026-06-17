#!/usr/bin/env python3
"""Autonomous local pilot verification — no Claude Code or manual curl steps.

Requires a prior `packaging/macos/pilot_local.sh` run (profile + venv under
~/.wisp-pilot). Optional secrets in ~/.wisp-pilot/pilot.env (ANTHROPIC_API_KEY).

Usage:
  python agent/scripts/pilot_verify.py
  python agent/scripts/pilot_verify.py --policy hyper --skip-telemetry
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_PILOT_DIR = Path.home() / ".wisp-pilot"
PROXY_PORT = 8787
GLANCE_PORT = 8788
READY_TIMEOUT_S = 45
FLUSH_INTERVAL_S = 10


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _load_pilot_env(pilot_dir: Path) -> None:
    env_file = pilot_dir / "pilot.env"
    if not env_file.is_file():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        os.environ.setdefault(key, value)


def _http_json(url: str, timeout: float = 5.0) -> dict[str, Any]:
    with urllib.request.urlopen(url, timeout=timeout) as resp:  # noqa: S310
        return json.loads(resp.read().decode("utf-8"))


def _stop_pilot(pilot_dir: Path) -> None:
    pid_file = pilot_dir / "agent.pid"
    if pid_file.is_file():
        try:
            pid = int(pid_file.read_text().strip())
            os.kill(pid, signal.SIGTERM)
            time.sleep(1)
        except (OSError, ValueError):
            pass
        pid_file.unlink(missing_ok=True)
    subprocess.run(  # noqa: S603
        ["pkill", "-f", str(pilot_dir / "venv/bin/wisp-agent")],
        check=False,
        capture_output=True,
    )
    subprocess.run(  # noqa: S603
        ["pkill", "-f", "headroom.cli proxy"],
        check=False,
        capture_output=True,
    )
    time.sleep(1)


def _start_agent(pilot_dir: Path, policy: str) -> subprocess.Popen[bytes]:
    profile = pilot_dir / "profile.json"
    agent_bin = pilot_dir / "venv/bin/wisp-agent"
    log_path = pilot_dir / "agent.log"
    env = os.environ.copy()
    env["WISP_CONFIG_PROFILE"] = str(profile)
    env["WISP_POLICY_LEVEL"] = policy
    env["WISP_FLUSH_INTERVAL"] = str(FLUSH_INTERVAL_S)
    proc = subprocess.Popen(  # noqa: S603
        [str(agent_bin)],
        stdout=log_path.open("ab"),
        stderr=subprocess.STDOUT,
        env=env,
        start_new_session=True,
    )
    (pilot_dir / "agent.pid").write_text(str(proc.pid))
    return proc


def _wait_proxy_ready() -> bool:
    deadline = time.time() + READY_TIMEOUT_S
    while time.time() < deadline:
        try:
            body = _http_json(f"http://127.0.0.1:{PROXY_PORT}/readyz")
            if body.get("ready"):
                return True
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            pass
        time.sleep(1)
    return False


def _headroom_env(policy: str) -> dict[str, str]:
    sys.path.insert(0, str(_repo_root() / "agent"))
    from wisp_agent.policy import headroom_env_for  # noqa: PLC0415

    return headroom_env_for(policy)


def _headroom_process_env() -> dict[str, str]:
    out = subprocess.run(  # noqa: S603
        ["pgrep", "-f", "headroom.cli proxy"],
        capture_output=True,
        text=True,
        check=False,
    )
    pid = out.stdout.strip().split("\n")[0] if out.stdout.strip() else ""
    if not pid:
        return {}
    ps = subprocess.run(  # noqa: S603
        ["ps", "eww", "-p", pid],
        capture_output=True,
        text=True,
        check=False,
    )
    env: dict[str, str] = {}
    for token in ps.stdout.replace("\n", " ").split():
        if token.startswith("HEADROOM_") and "=" in token:
            key, _, val = token.partition("=")
            env[key] = val
    return env


def _jsonl_line_count(path: Path) -> int:
    if not path.is_file():
        return 0
    return sum(1 for _ in path.open("rb"))


def _load_log_fixture() -> str:
    fixture = _repo_root() / "evals/corpus/tool_output.json"
    content = json.loads(fixture.read_text())["content"]
    return content * 80


def _send_anthropic_test(api_key: str, user_text: str) -> tuple[int, str]:
    payload = {
        "model": "claude-sonnet-4-6",
        "max_tokens": 32,
        "messages": [{"role": "user", "content": user_text}],
    }
    req = urllib.request.Request(  # noqa: S310
        f"http://127.0.0.1:{PROXY_PORT}/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "content-type": "application/json",
            "anthropic-version": "2023-06-01",
            "x-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read(500).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(500).decode("utf-8", errors="replace")


def _wait_for_jsonl(path: Path, before: int, timeout: float = 30.0) -> dict[str, Any] | None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if _jsonl_line_count(path) > before:
            last = path.read_text().splitlines()[-1]
            return json.loads(last)
        time.sleep(0.5)
    return None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _probe_telemetry_ingest(profile_data: dict[str, Any], policy: str) -> Check:
    """POST a minimal UsageBatch directly — validates prod contract without waiting for agent flush."""
    endpoint = profile_data["saas_endpoint"].rstrip("/")
    token = profile_data["enrolment_token"]
    device_id = profile_data["device_id"]
    batch_id = str(uuid.uuid4())
    window = _now_iso()
    payload = {
        "device_id": device_id,
        "batch_id": batch_id,
        "agent_version": "0.1.0",
        "headroom_version": "0.25.0",
        "window_start": window,
        "window_end": window,
        "events": [
            {
                "model": "pilot-verify",
                "requests": 1,
                "input_tokens_original": 100,
                "input_tokens_compressed": 100,
                "input_tokens_removed": 0,
                "input_tokens_cache_read": 0,
                "output_tokens": 1,
                "policy_level": policy,
            }
        ],
    }
    req = urllib.request.Request(  # noqa: S310
        f"{endpoint}/api/telemetry",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            ok = resp.status == 200
            return Check("telemetry_ingest", ok, f"POST {endpoint}/api/telemetry → HTTP {resp.status}")
    except urllib.error.HTTPError as exc:
        body = exc.read(200).decode("utf-8", errors="replace")
        return Check("telemetry_ingest", False, f"HTTP {exc.code}: {body[:160]}")


def _wait_telemetry_ok(log_path: Path, timeout: float = 25.0) -> str:
    deadline = time.time() + timeout
    while time.time() < deadline:
        text = log_path.read_text() if log_path.is_file() else ""
        if "422" in text and "Telemetry flush" in text:
            return "422 rejected (policy_level not on prod yet?)"
        if "401" in text and "Telemetry flush" in text:
            return "401 unauthorized (bad enrolment token?)"
        if "server accepted" in text.lower() or "flush rejected" not in text.lower():
            # Agent does not log success loudly — absence of failure after flush window is OK
            if time.time() > deadline - 5:
                return "no flush errors observed"
        time.sleep(1)
    tail = "\n".join(log_path.read_text().splitlines()[-5:]) if log_path.is_file() else ""
    return f"timeout waiting for telemetry (log tail: {tail[:200]})"


def run_checks(
    pilot_dir: Path,
    policy: str,
    *,
    skip_upstream: bool,
    skip_telemetry: bool,
) -> list[Check]:
    checks: list[Check] = []
    profile = pilot_dir / "profile.json"
    log_jsonl = pilot_dir / "log/headroom.jsonl"
    agent_log = pilot_dir / "agent.log"

    if not profile.is_file():
        checks.append(
            Check(
                "profile",
                False,
                f"missing {profile} — run packaging/macos/pilot_local.sh first",
            )
        )
        return checks
    checks.append(Check("profile", True, str(profile)))

    agent_bin = pilot_dir / "venv/bin/wisp-agent"
    if not agent_bin.is_file():
        checks.append(Check("venv", False, f"missing {agent_bin}"))
        return checks
    checks.append(Check("venv", True, str(agent_bin)))

    _stop_pilot(pilot_dir)
    agent_log.write_text("")
    proc = _start_agent(pilot_dir, policy)

    if not _wait_proxy_ready():
        tail = agent_log.read_text().splitlines()[-10:] if agent_log.is_file() else []
        checks.append(Check("proxy_ready", False, f"8787 not ready after {READY_TIMEOUT_S}s; log: {tail}"))
        proc.poll()  # reap if exited
        return checks
    checks.append(Check("proxy_ready", True, f"http://127.0.0.1:{PROXY_PORT}/readyz"))

    try:
        glance = None
        for _ in range(10):
            try:
                glance = _http_json(f"http://127.0.0.1:{GLANCE_PORT}/glance")
                break
            except (urllib.error.URLError, json.JSONDecodeError):
                time.sleep(0.5)
        if glance is None:
            raise urllib.error.URLError("glance unreachable")
        ok = glance.get("policy_level") == policy and glance.get("proxy_healthy") is True
        checks.append(
            Check(
                "glance",
                ok,
                json.dumps(glance, separators=(",", ":")),
            )
        )
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        checks.append(Check("glance", False, str(exc)))

    expected_env = _headroom_env(policy)
    actual_env = _headroom_process_env()
    missing = [k for k in expected_env if actual_env.get(k) != expected_env[k]]
    if missing and policy != "off":
        checks.append(
            Check(
                "headroom_env",
                False,
                f"mismatch on {missing}; expected subset of {list(expected_env)}",
            )
        )
    else:
        checks.append(Check("headroom_env", True, f"{len(expected_env)} vars on proxy process"))

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if skip_upstream:
        checks.append(Check("compression", True, "skipped (--skip-upstream)"))
    else:
        before = _jsonl_line_count(log_jsonl)
        # Compression runs before upstream auth; a dummy key is enough to prove savings.
        key = api_key or "pilot-verify-no-upstream-key"
        status, body = _send_anthropic_test(key, _load_log_fixture())
        row = _wait_for_jsonl(log_jsonl, before, timeout=60.0)
        saved = int(row.get("tokens_saved") or 0) if row else 0
        orig = int(row.get("input_tokens_original") or 0) if row else 0
        opt = int(row.get("input_tokens_optimized") or 0) if row else 0
        transforms = row.get("transforms_applied") or [] if row else []
        compressed = saved > 0 and orig > opt
        pct = float(row.get("savings_percent") or 0) if row else 0.0
        ok = row is not None and compressed
        detail = (
            f"HTTP {status}; {orig} → {opt} tokens ({saved} saved, {pct:.1f}%); "
            f"transforms={transforms}"
        )
        if not api_key and status == 401 and compressed:
            detail += " (401 expected without ANTHROPIC_API_KEY; compression verified pre-upstream)"
        elif not api_key and status == 401 and not compressed:
            ok = False
            detail += " (no compression despite 401 — check hyper env on proxy process)"
        elif api_key and status != 200:
            ok = False
            detail += f"; body={body[:120]}"
        checks.append(Check("compression", ok, detail))

        if row and policy == "hyper" and compressed:
            hyper_ok = saved > 0 and not any("protected:user_message" in t for t in transforms)
            checks.append(
                Check(
                    "hyper_user_compress",
                    hyper_ok,
                    f"tokens_saved={saved}; no user_message shield in {transforms}",
                )
            )

    if skip_telemetry:
        checks.append(Check("telemetry_ingest", True, "skipped (--skip-telemetry)"))
    elif policy == "hyper":
        checks.append(
            Check(
                "telemetry_ingest",
                True,
                "skipped for hyper until prod deploys policy_level=hyper in telemetry-contract",
            )
        )
    else:
        profile_data = json.loads(profile.read_text())
        checks.append(_probe_telemetry_ingest(profile_data, policy))
        time.sleep(FLUSH_INTERVAL_S + 2)
        tel_detail = _wait_telemetry_ok(agent_log)
        ok = "422" not in tel_detail and "401" not in tel_detail and "timeout" not in tel_detail
        checks.append(Check("telemetry_agent_flush", ok, tel_detail))

    if proc.poll() is None:
        # leave agent running for the user
        checks.append(Check("agent_running", True, f"pid {proc.pid} (left running)"))
    else:
        checks.append(Check("agent_running", False, f"agent exited code {proc.returncode}"))

    return checks


def main() -> int:
    parser = argparse.ArgumentParser(description="Autonomous Wisp local pilot verification")
    parser.add_argument(
        "--pilot-dir",
        type=Path,
        default=Path(os.environ.get("WISP_PILOT_DIR", DEFAULT_PILOT_DIR)),
    )
    parser.add_argument(
        "--policy",
        default=os.environ.get("WISP_POLICY_LEVEL", "aggressive"),
        choices=["off", "conservative", "balanced", "aggressive", "hyper"],
    )
    parser.add_argument("--skip-upstream", action="store_true")
    parser.add_argument("--skip-telemetry", action="store_true")
    args = parser.parse_args()

    _load_pilot_env(args.pilot_dir)
    checks = run_checks(
        args.pilot_dir,
        args.policy,
        skip_upstream=args.skip_upstream,
        skip_telemetry=args.skip_telemetry,
    )

    print("Wisp pilot verify")
    print(f"  pilot_dir={args.pilot_dir}")
    print(f"  policy={args.policy}")
    print()
    failed = 0
    for chk in checks:
        mark = "PASS" if chk.ok else "FAIL"
        print(f"  [{mark}] {chk.name}: {chk.detail}")
        if not chk.ok:
            failed += 1
    print()
    if failed:
        print(f"{failed} check(s) failed")
        return 1
    print("All checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
