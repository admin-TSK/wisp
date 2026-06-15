"""Lifecycle of the pinned Headroom proxy.

We never modify Headroom; we only invoke its public CLI as a subprocess, apply
the policy env overlay, health-check it, and restart on crash.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from .policy import headroom_env_for, is_passthrough


class ProxySupervisor:
    def __init__(self, port: int, policy_level: str, log_file: Path | None = None) -> None:
        self.port = port
        self.policy_level = policy_level
        self.log_file = log_file
        self._proc: subprocess.Popen | None = None

    def _env(self) -> dict[str, str]:
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "utf-8"
        env.update(headroom_env_for(self.policy_level))
        if self.log_file is not None:
            env.setdefault("HEADROOM_LOG_FILE", str(self.log_file))
        env.setdefault("HEADROOM_TELEMETRY", "off")
        return env

    def _cmd(self) -> list[str]:
        cmd = [
            sys.executable,
            "-m",
            "headroom.cli",
            "proxy",
            "--port",
            str(self.port),
            "--mode",
            "token",
            "--no-telemetry",
        ]
        if self.log_file is not None:
            cmd.extend(["--log-file", str(self.log_file)])
        if is_passthrough(self.policy_level):
            cmd.append("--no-optimize")
        return cmd

    def start(self) -> None:
        if self._proc and self._proc.poll() is None:
            return
        if self.log_file is not None:
            self.log_file.parent.mkdir(parents=True, exist_ok=True)
        self._proc = subprocess.Popen(  # noqa: S603 (trusted, pinned dependency)
            self._cmd(),
            env=self._env(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=os.name == "posix",
        )

    def is_ready(self, timeout: float = 2.0) -> bool:
        try:
            with urllib.request.urlopen(  # noqa: S310 (localhost)
                f"http://127.0.0.1:{self.port}/readyz", timeout=timeout
            ) as resp:
                if resp.status != 200:
                    return False
                body = resp.read().decode("utf-8")
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            return False
        try:
            import json

            payload = json.loads(body)
            return bool(payload.get("ready"))
        except json.JSONDecodeError:
            return True

    def is_healthy(self, timeout: float = 2.0) -> bool:
        """Liveness check — prefer readyz for traffic readiness."""
        return self.is_ready(timeout)

    def wait_ready(self, attempts: int = 45, interval: float = 1.0) -> bool:
        for _ in range(attempts):
            if self.is_ready():
                return True
            if self._proc and self._proc.poll() is not None:
                return False
            time.sleep(interval)
        return False

    def ensure_running(self) -> None:
        """Restart the proxy if it died or is not ready."""
        if not self._proc or self._proc.poll() is not None or not self.is_ready():
            self.stop()
            self.start()
            self.wait_ready()

    def stop(self) -> None:
        if self._proc and self._proc.poll() is None:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self._proc.kill()
        self._proc = None
