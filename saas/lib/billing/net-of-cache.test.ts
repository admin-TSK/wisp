import { describe, expect, it } from "vitest";
import {
  blendedRate,
  grossSavings,
  netSavings,
  summarize,
  wispFee,
  type ModelRate,
} from "./net-of-cache";

// Must match agent/tests/test_billing.py expectations exactly.
const SONNET: ModelRate = { baseInputRate: 3.0 / 1e6, cachedInputRate: 0.3 / 1e6 };

describe("net-of-cache billing (mirror of Python)", () => {
  it("blended rate interpolates and clamps", () => {
    expect(blendedRate(SONNET, 0)).toBeCloseTo(SONNET.baseInputRate);
    expect(blendedRate(SONNET, 1)).toBeCloseTo(SONNET.cachedInputRate);
    expect(blendedRate(SONNET, 5)).toBeCloseTo(SONNET.cachedInputRate);
  });

  it("net < gross when cache hits present", () => {
    const w = {
      model: "claude-sonnet-4-6",
      inputTokensRemoved: 1_000_000,
      inputTokensCompressed: 1_000_000,
      inputTokensCacheRead: 500_000,
    };
    expect(grossSavings(w, SONNET)).toBeCloseTo(3.0);
    expect(netSavings(w, SONNET)).toBeCloseTo(1.65);
  });

  it("fee applies take rate and cap", () => {
    expect(wispFee(1000)).toBeCloseTo(100);
    expect(wispFee(1000, 0.1, 50)).toBeCloseTo(50);
  });

  it("summarize matches the Python rollup", () => {
    const out = summarize(
      [
        { model: "claude-sonnet-4-6", inputTokensRemoved: 1_000_000, inputTokensCompressed: 1_000_000, inputTokensCacheRead: 0 },
        { model: "claude-sonnet-4-6", inputTokensRemoved: 2_000_000, inputTokensCompressed: 2_000_000, inputTokensCacheRead: 1_000_000 },
      ],
      { "claude-sonnet-4-6": SONNET },
    );
    expect(out.totalTokensRemoved).toBe(3_000_000);
    expect(out.grossSavings).toBeCloseTo(9.0);
    expect(out.measuredSavings).toBeCloseTo(6.3);
    expect(out.wispFee).toBeCloseTo(0.63);
  });

  it("throws on missing rate (never bills at zero silently)", () => {
    expect(() =>
      summarize([{ model: "unknown", inputTokensRemoved: 1, inputTokensCompressed: 1, inputTokensCacheRead: 0 }], {}),
    ).toThrow();
  });
});
