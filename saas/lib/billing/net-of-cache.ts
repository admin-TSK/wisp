/**
 * Authoritative net-of-cache billing math.
 *
 * This MUST stay numerically identical to the agent's reference implementation
 * in `agent/wisp_agent/billing.py`. The agent shows the figure on-device; this
 * server-side copy is what actually bills. Keeping them in lockstep is what lets
 * a customer reproduce any invoiced number (prime directive #3 + #4).
 */

export interface ModelRate {
  /** $ per token, standard input. */
  baseInputRate: number;
  /** $ per token, cache hit/read. */
  cachedInputRate: number;
}

export interface UsageWindow {
  model: string;
  inputTokensRemoved: number;
  inputTokensCompressed: number;
  inputTokensCacheRead: number;
}

export function cacheHitRatio(w: UsageWindow): number {
  if (w.inputTokensCompressed <= 0) return 0;
  return w.inputTokensCacheRead / w.inputTokensCompressed;
}

export function blendedRate(rate: ModelRate, hitRatio: number): number {
  const h = Math.min(Math.max(hitRatio, 0), 1);
  return rate.cachedInputRate * h + rate.baseInputRate * (1 - h);
}

/** Dashboard-only headline: removed tokens at full base rate. */
export function grossSavings(w: UsageWindow, rate: ModelRate): number {
  return w.inputTokensRemoved * rate.baseInputRate;
}

/** Billable savings: removed tokens at the cache-blended rate. */
export function netSavings(w: UsageWindow, rate: ModelRate): number {
  return w.inputTokensRemoved * blendedRate(rate, cacheHitRatio(w));
}

export function wispFee(measuredNetSavings: number, takeRate = 0.1, monthlyCap?: number): number {
  if (takeRate < 0 || takeRate > 1) throw new Error("takeRate must be in [0, 1]");
  let fee = measuredNetSavings * takeRate;
  if (monthlyCap != null) fee = Math.min(fee, monthlyCap);
  return Math.max(fee, 0);
}

export interface BillingSummary {
  totalTokensRemoved: number;
  grossSavings: number;
  measuredSavings: number;
  wispFee: number;
}

export function summarize(
  windows: UsageWindow[],
  rates: Record<string, ModelRate>,
  takeRate = 0.1,
  monthlyCap?: number,
): BillingSummary {
  let gross = 0;
  let net = 0;
  let tokens = 0;
  for (const w of windows) {
    const rate = rates[w.model];
    if (!rate) throw new Error(`no resolved rate for model ${w.model}`);
    gross += grossSavings(w, rate);
    net += netSavings(w, rate);
    tokens += w.inputTokensRemoved;
  }
  return {
    totalTokensRemoved: tokens,
    grossSavings: gross,
    measuredSavings: net,
    wispFee: wispFee(net, takeRate, monthlyCap),
  };
}
