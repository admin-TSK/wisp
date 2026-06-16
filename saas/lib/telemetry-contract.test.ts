import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { usageBatchSchema } from "./telemetry-contract";

const fixturePath = join(__dirname, "../test-fixtures/agent-usage-batch.json");
const agentFixture = JSON.parse(readFileSync(fixturePath, "utf8"));

const BATCH_KEYS = [
  "tenant_id",
  "device_id",
  "batch_id",
  "agent_version",
  "headroom_version",
  "window_start",
  "window_end",
  "events",
] as const;

const EVENT_KEYS = [
  "model",
  "requests",
  "input_tokens_original",
  "input_tokens_compressed",
  "input_tokens_removed",
  "input_tokens_cache_read",
  "output_tokens",
  "policy_level",
] as const;

describe("usageBatchSchema agent contract parity", () => {
  it("accepts the Python-exported agent UsageBatch fixture", () => {
    const parsed = usageBatchSchema.safeParse(agentFixture);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error?.flatten())).toBe(true);
  });

  it("fixture uses agent Z timestamp format from _now_iso()", () => {
    expect(agentFixture.window_start).toMatch(/Z$/);
    expect(agentFixture.window_end).toMatch(/Z$/);
    expect(agentFixture.window_start).not.toContain("+00:00");
  });

  it("fixture field names match the strict contract (no drift)", () => {
    expect(Object.keys(agentFixture).sort()).toEqual([...BATCH_KEYS].sort());
    expect(Object.keys(agentFixture.events[0]).sort()).toEqual([...EVENT_KEYS].sort());
  });

  it("still accepts legacy +00:00 offsets for backward compatibility", () => {
    const legacy = {
      ...agentFixture,
      window_start: "2026-06-15T09:00:00.123456+00:00",
      window_end: "2026-06-15T09:05:00.123456+00:00",
    };
    expect(usageBatchSchema.safeParse(legacy).success).toBe(true);
  });
});
