/** Canonical Aqua domain types — ported from engine-core + ENGINE.md. */

export type Lane = "intent" | "sidecar";

export type StrategyId =
  | "cow_batch"
  | "uniswapx_fill"
  | "erc7683_fill"
  | "liq_morpho"
  | "liq_aave"
  | "liq_compound"
  | "liq_maker"
  | "oracle_backrun"
  | "atomic_arb";

export type MouthId = "cow" | "uniswapx" | "erc7683";

export type ExecutionMode = "simulation" | "live";

export type QualVerdict = "PASS" | "FAIL" | "INSUFFICIENT" | "INELIGIBLE";

export type SubmissionMode = "cow_driver" | "bundle" | "raw" | "mev_share";

export type QualBackend = "solver-auction" | "relay" | "sequencer" | "fork-vs-chain";

export interface BlockIdentity {
  number: number;
  hash: string;
}

export interface StateIdentity {
  chainId: number;
  block: BlockIdentity;
}

export interface CandidateBinding {
  id: string;
  lane: Lane;
  state: StateIdentity;
  signer: string;
  expectedNetProfitWei: bigint;
  notionalWei: bigint;
}

export type RiskReason =
  | "NotArmed"
  | "NotQualified"
  | "RegistryNotAttested"
  | "ExactPayloadNotSimulated"
  | "ProfitBelowMinimum"
  | "PositionAboveMaximum"
  | "BaseFeeAboveMaximum"
  | "InflightLimitReached"
  | "KillTripped"
  | "BroadcastDisabled"
  | "ShadowOnly";

export type RiskDecision = { kind: "Allow" } | { kind: "Reject"; reason: RiskReason };

export interface RiskEnvelope {
  minNetProfitWei: bigint;
  maxPositionWei: bigint;
  maxBaseFeeWei: bigint;
  maxInflight: number;
  bribeBps: number;
  maxDrawdownWei: bigint;
  tokenValuation: boolean;
  valuationHaircutBps: number;
}

export interface CandidateRisk {
  netProfitWei: bigint;
  notionalWei: bigint;
  baseFeeWei: bigint;
  inflight: number;
  exactPayloadSimulated: boolean;
  registryAttested: boolean;
  qualified: boolean;
  executionArmed: boolean;
  killTripped: boolean;
  broadcastEnabled: boolean;
  shadowOnly: boolean;
}

export interface FunnelCounters {
  invocationsWithOutput: number;
  invocationsEmpty: number;
  candidatesEmitted: number;
  gatedByRisk: number;
  simulationsSucceeded: number;
  simulationsReverted: number;
  submittable: number;
  submitted: number;
  revertedOnchain: number;
}

export interface MouthFunnel extends FunnelCounters {
  auctionsSeen: number;
  solutionsAccepted: number;
  wins: number;
  shadowWins: number;
  deadlineMissed: number;
  fairnessRejected: number;
}

export interface QualRow {
  row: StrategyId;
  verdict: QualVerdict;
  reason: string;
  samples: number;
  windowHours: number;
  continuityHours: number;
  lastBreak: string | null;
  smokeRemaining: number;
  backend: QualBackend;
  liveCandidate: boolean;
}

export type TapeKind =
  | "auction"
  | "order"
  | "head"
  | "pending"
  | "opp"
  | "sim"
  | "submit"
  | "alert"
  | "mouth"
  | "risk"
  | "journal";

export interface TapeEvent {
  id: string;
  t: number;
  kind: TapeKind;
  chainId: number;
  title: string;
  detail: string;
  hash?: string;
  tag?: string;
}

export interface AlertItem {
  id: string;
  t: number;
  severity: "info" | "warn" | "danger";
  title: string;
  body: string;
  resolved: boolean;
}

export interface EquityPoint {
  t: number;
  simEth: number;
  finalizedEth: number;
}

export interface OptimizerDay {
  day: string;
  surplusNaiveWei: bigint;
  surplusV1Wei: bigint;
  fillRate: number;
  pairwiseShare: number;
  ringShare: number;
  spillShare: number;
  auctions: number;
}

export interface OptimizerSnapshot {
  days: OptimizerDay[];
  tapeAgeDays: number;
  budgetMs: number;
  lastFailedAuctionId: string | null;
  fillRate: number;
  pairwiseShare: number;
  ringShare: number;
  spillShare: number;
}

export interface SurfaceStats {
  netSimWei: bigint;
  netFinalWei: bigint;
  fillOrWin: number;
  lastEventAgeMs: number;
}

export interface SidecarPanel {
  watchlist: number;
  watchCap: number;
  nearMiss: number;
  lastSelector: string | null;
  simWei: bigint;
  finalWei: bigint;
  valuationMisses: number;
  emptyWhy: string;
}

export interface Health {
  headLagMs: number;
  simP95Ms: number;
  queueDrops: number;
  replayDrops: number;
  rpcErrors: number;
  headNumber: number;
  headHash: string;
}

export interface JournalEntry {
  id: string;
  t: number;
  kind: "config" | "risk" | "sim" | "nonce" | "kill" | "qual";
  summary: string;
}

export interface DoctorCheck {
  name: string;
  ok: boolean;
  detail: string;
}

export const STRATEGIES: StrategyId[] = [
  "cow_batch",
  "uniswapx_fill",
  "erc7683_fill",
  "liq_morpho",
  "liq_aave",
  "liq_compound",
  "liq_maker",
  "oracle_backrun",
  "atomic_arb",
];

export const STRATEGY_LABEL: Record<StrategyId, string> = {
  cow_batch: "CoW batch",
  uniswapx_fill: "UniswapX fill",
  erc7683_fill: "ERC-7683 fill",
  liq_morpho: "Morpho liquidation",
  liq_aave: "Aave V3 liquidation",
  liq_compound: "Compound V3",
  liq_maker: "Maker liquidation",
  oracle_backrun: "Oracle backrun",
  atomic_arb: "Atomic graph arb",
};

export const STRATEGY_LANE: Record<StrategyId, Lane> = {
  cow_batch: "intent",
  uniswapx_fill: "intent",
  erc7683_fill: "intent",
  liq_morpho: "sidecar",
  liq_aave: "sidecar",
  liq_compound: "sidecar",
  liq_maker: "sidecar",
  oracle_backrun: "sidecar",
  atomic_arb: "sidecar",
};

export function emptyFunnel(): FunnelCounters {
  return {
    invocationsWithOutput: 0,
    invocationsEmpty: 0,
    candidatesEmitted: 0,
    gatedByRisk: 0,
    simulationsSucceeded: 0,
    simulationsReverted: 0,
    submittable: 0,
    submitted: 0,
    revertedOnchain: 0,
  };
}

export function emptyMouthFunnel(): MouthFunnel {
  return {
    ...emptyFunnel(),
    auctionsSeen: 0,
    solutionsAccepted: 0,
    wins: 0,
    shadowWins: 0,
    deadlineMissed: 0,
    fairnessRejected: 0,
  };
}
