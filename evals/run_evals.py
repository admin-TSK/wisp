#!/usr/bin/env python3
"""Compression-quality regression gate for Headroom version bumps.

Runs the pinned Headroom over a representative corpus and asserts each item's
compression ratio stays within `thresholds.yaml`. Renovate opens a PR on every
headroom-ai release; `.github/workflows/headroom-bump-gate.yml` runs this. Green
merges; red is flagged for human review. This is what makes "depend, never fork"
safe at scale.

Exit codes: 0 = within thresholds, 1 = regression, 2 = harness error.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

CORPUS_DIR = Path(__file__).parent / "corpus"
THRESHOLDS = Path(__file__).parent / "thresholds.yaml"

# Headroom crushes tool outputs above ~250 tokens; repeat small fixtures so the
# gate exercises the same code paths as production agent loops.
_MIN_TOKENS_BEFORE = 8000


def _load_thresholds() -> dict:
    try:
        import yaml  # type: ignore

        return yaml.safe_load(THRESHOLDS.read_text())
    except ModuleNotFoundError:
        return _parse_simple_yaml(THRESHOLDS.read_text())


def _parse_simple_yaml(text: str) -> dict:
    root: dict = {}
    stack = [(-1, root)]
    for raw in text.splitlines():
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip())
        line = raw.split(" #", 1)[0]
        key, _, val = line.strip().partition(":")
        val = val.strip()
        while stack and indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if val == "":
            node: dict = {}
            parent[key] = node
            stack.append((indent, node))
        else:
            if val in ("true", "false"):
                parent[key] = val == "true"
            else:
                try:
                    parent[key] = float(val)
                except ValueError:
                    parent[key] = val
    return root


def _scale_content(text: str) -> str:
    if len(text) >= _MIN_TOKENS_BEFORE:
        return text
    repeats = (_MIN_TOKENS_BEFORE // max(len(text), 1)) + 1
    return text * repeats


def _messages_for(content: str, content_type: str) -> list[dict]:
    """Build an agent-loop shaped thread so SmartCrusher engages."""
    scaled = _scale_content(content)
    user_prompt = {
        "logs": "Summarize these build logs and flag failures.",
        "json": "Extract the key fields from this API response.",
        "code": "Review this module and list public entry points.",
        "tool_output": "Analyze this tool output and keep actionable items.",
    }.get(content_type, "Analyze the following context.")
    return [
        {"role": "user", "content": user_prompt},
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": "call_eval_1",
                    "type": "function",
                    "function": {"name": "fetch_context", "arguments": "{}"},
                }
            ],
        },
        {"role": "tool", "content": scaled, "tool_call_id": "call_eval_1"},
    ]


def _compress(text: str, content_type: str):
    """Compress one corpus item via the pinned Headroom. Returns (ratio, ok)."""
    try:
        from headroom import compress  # type: ignore
    except ModuleNotFoundError:
        print("ERROR: headroom-ai is not installed; cannot run the eval gate.", file=sys.stderr)
        sys.exit(2)

    messages = _messages_for(text, content_type)
    result = compress(messages, model="claude-sonnet-4-6")
    before = int(getattr(result, "tokens_before", 0) or 0)
    saved = int(getattr(result, "tokens_saved", 0) or 0)
    ratio = float(getattr(result, "compression_ratio", 0.0) or ((saved / before) if before else 0.0))
    reversible = getattr(result, "reversible", True)
    return ratio, reversible


def main() -> int:
    cfg = _load_thresholds()
    types = cfg.get("content_types", {})
    require_retrieval = cfg.get("defaults", {}).get("retrieval_correctness_required", True)

    failures: list[str] = []
    checked = 0

    for item in sorted(CORPUS_DIR.glob("*.json")):
        spec = json.loads(item.read_text())
        ctype = spec["content_type"]
        text = spec["content"] if isinstance(spec["content"], str) else json.dumps(spec["content"])
        bounds = types.get(ctype)
        if not bounds:
            failures.append(f"{item.name}: no thresholds for content_type {ctype!r}")
            continue

        ratio, reversible = _compress(text, ctype)
        checked += 1
        lo, hi = float(bounds["min_ratio"]), float(bounds["max_ratio"])
        if not (lo <= ratio <= hi):
            failures.append(f"{item.name} [{ctype}]: ratio {ratio:.2%} outside [{lo:.0%}, {hi:.0%}]")
        if require_retrieval and not reversible:
            failures.append(f"{item.name} [{ctype}]: reversible retrieval failed")
        print(f"  {item.name:32s} {ctype:12s} ratio={ratio:.2%} reversible={reversible}")

    print(f"\nChecked {checked} corpus item(s).")
    if failures:
        print("\nEVAL GATE RED:")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("EVAL GATE GREEN.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
