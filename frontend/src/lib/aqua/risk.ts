import type { CandidateRisk, RiskDecision, RiskEnvelope } from "./types.ts";
import { GWEI, WEI } from "./format.ts";

export function defaultEnvelope(bribeBps: number): RiskEnvelope {
  return {
    minNetProfitWei: 1n,
    maxPositionWei: 100n * WEI,
    maxBaseFeeWei: 500n * GWEI,
    maxInflight: 32,
    bribeBps,
    maxDrawdownWei: 0n,
    tokenValuation: false,
    valuationHaircutBps: 200,
  };
}

/**
 * Evaluate in stable safety order. First rejection is the operator-facing
 * reason — same polarity as `engine-core` RiskEnvelope::evaluate.
 */
export function evaluateRisk(env: RiskEnvelope, c: CandidateRisk): RiskDecision {
  if (c.killTripped) return { kind: "Reject", reason: "KillTripped" };
  if (!c.executionArmed) return { kind: "Reject", reason: "NotArmed" };
  if (!c.broadcastEnabled) return { kind: "Reject", reason: "BroadcastDisabled" };
  if (c.shadowOnly) return { kind: "Reject", reason: "ShadowOnly" };
  if (!c.qualified) return { kind: "Reject", reason: "NotQualified" };
  if (!c.registryAttested) return { kind: "Reject", reason: "RegistryNotAttested" };
  if (!c.exactPayloadSimulated) {
    return { kind: "Reject", reason: "ExactPayloadNotSimulated" };
  }
  if (c.netProfitWei < env.minNetProfitWei) {
    return { kind: "Reject", reason: "ProfitBelowMinimum" };
  }
  if (c.notionalWei > env.maxPositionWei) {
    return { kind: "Reject", reason: "PositionAboveMaximum" };
  }
  if (c.baseFeeWei > env.maxBaseFeeWei) {
    return { kind: "Reject", reason: "BaseFeeAboveMaximum" };
  }
  if (c.inflight >= env.maxInflight) {
    return { kind: "Reject", reason: "InflightLimitReached" };
  }
  return { kind: "Allow" };
}

export const RISK_COPY: Record<string, string> = {
  NotArmed: "Runtime mode is not live. An unarmed process cannot be switched live.",
  NotQualified: "This row has no PASS. Smoke cannot promote a shadow-only row.",
  RegistryNotAttested: "No unexpired code-hash-attested registry entry at the pinned state.",
  ExactPayloadNotSimulated: "Exact signed bytes were not simulated at a pinned block/hash.",
  ProfitBelowMinimum: "Net profit is below MIN_NET_PROFIT_WEI.",
  PositionAboveMaximum: "Notional exceeds MAX_POSITION_WEI.",
  BaseFeeAboveMaximum: "Base fee exceeds MAX_BASE_FEE_WEI.",
  InflightLimitReached: "In-flight cap reached for this strategy.",
  KillTripped: "Durable kill switch is tripped. Reset is a typed confirm plus auth.",
  BroadcastDisabled: "BROADCAST_ENABLED is false. Independent of LIVE_EXECUTION.",
  ShadowOnly: "Engineering live_candidate is false, or the row is shadow-only.",
};

export const ARMING_GATES = [
  "Live (not replay) lane",
  "Engineering live-candidate row",
  "Risk, drawdown, gas, exact-account inventory",
  "Boot arming: LIVE_EXECUTION=true and I_UNDERSTAND_LIVE_RISK=yes",
  "Independent BROADCAST_ENABLED=true",
  "Authenticated runtime mode is live",
  "Row qualification PASS, or a remaining LIVE_SMOKE_MAX slot (shadow-only cannot smoke)",
  "No unresolved startup nonce-recovery block",
  "Exact reserved-nonce fork sim succeeds",
] as const;
