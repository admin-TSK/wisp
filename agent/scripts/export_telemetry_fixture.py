#!/usr/bin/env python3
"""Export a canonical agent UsageBatch JSON fixture for SaaS contract-parity tests.

Regenerate:
  cd agent && PYTHONPATH=. python scripts/export_telemetry_fixture.py \
    > ../saas/test-fixtures/agent-usage-batch.json
"""

from __future__ import annotations

import json
import sys
import uuid

from wisp_agent.__main__ import _now_iso
from wisp_agent.telemetry import UsageBatch, UsageEvent, serialize


def main() -> None:
    ts = _now_iso()
    batch = UsageBatch(
        tenant_id="00000000-0000-4000-8000-000000000001",
        device_id=str(uuid.UUID("00000000-0000-4000-8000-0000000000aa")),
        batch_id=str(uuid.UUID("00000000-0000-4000-8000-0000000000b1")),
        agent_version="0.1.0",
        headroom_version="0.25.0",
        window_start=ts,
        window_end=ts,
        events=[
            UsageEvent(
                model="claude-sonnet-4-6",
                requests=3,
                input_tokens_original=1200,
                input_tokens_compressed=480,
                input_tokens_removed=720,
                input_tokens_cache_read=0,
                output_tokens=88,
                policy_level="aggressive",
            )
        ],
    )
    json.dump(serialize(batch), sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
