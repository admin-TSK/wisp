"""Read-only localhost stats for the native device UI (menu-bar app).

Serves counts + a locally-computed glanceable dollar figure on 127.0.0.1 only.
PII-free, same contract as telemetry. Never accepts policy changes from the
device -- IT owns policy (prime directive #7).
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer

from .billing import UsageWindow, gross_savings, net_savings
from .rate_card import resolve
from .stats_adapter import ModelStats


@dataclass
class GlanceSnapshot:
    policy_level: str
    proxy_healthy: bool
    total_tokens_removed: int
    gross_savings_usd: float
    net_savings_usd: float


def compute_glance(stats: list[ModelStats], policy_level: str, proxy_healthy: bool) -> GlanceSnapshot:
    tokens = 0
    gross = 0.0
    net = 0.0
    for s in stats:
        rate = resolve(s.model)
        if rate is None:
            continue  # unknown model => not counted in $ (counts still shown via tokens)
        window = UsageWindow(
            model=s.model,
            input_tokens_removed=s.input_tokens_removed,
            input_tokens_compressed=s.input_tokens_compressed,
            input_tokens_cache_read=s.input_tokens_cache_read,
        )
        tokens += s.input_tokens_removed
        gross += gross_savings(window, rate)
        net += net_savings(window, rate)
    return GlanceSnapshot(
        policy_level=policy_level,
        proxy_healthy=proxy_healthy,
        total_tokens_removed=tokens,
        gross_savings_usd=round(gross, 4),
        net_savings_usd=round(net, 4),
    )


def make_handler(snapshot_provider):
    class _Handler(BaseHTTPRequestHandler):
        def do_GET(self):  # noqa: N802 (BaseHTTPRequestHandler API)
            if self.path != "/glance":
                self.send_error(404)
                return
            snap = snapshot_provider()
            body = json.dumps(snap.__dict__).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self):  # noqa: N802 -- device never mutates policy
            self.send_error(405, "Wisp device stats are read-only")

        def log_message(self, *args):  # silence default logging
            return

    return _Handler


def serve(port: int, snapshot_provider) -> HTTPServer:
    server = HTTPServer(("127.0.0.1", port), make_handler(snapshot_provider))
    return server
