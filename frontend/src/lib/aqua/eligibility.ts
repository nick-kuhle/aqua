import type { ChainProfile } from "./chains.ts";
import type { QualBackend, QualVerdict, StrategyId } from "./types.ts";

export interface RowPolicy {
  constructed: boolean;
  liveCandidate: boolean;
  shadowOnly: boolean;
  reason: string;
  backend: QualBackend;
  canPassInV1: boolean;
}

export function rowPolicy(row: StrategyId, chain: ChainProfile): RowPolicy {
  switch (row) {
    case "cow_batch":
      return {
        constructed: chain.cowConstructed,
        liveCandidate: true,
        shadowOnly: true,
        reason: chain.cowShadowReason,
        backend: "solver-auction",
        canPassInV1: chain.id === 56,
      };
    case "uniswapx_fill":
      return {
        constructed: false,
        liveCandidate: false,
        shadowOnly: true,
        reason: "Crate stub. UniswapX is not a generic Dutch-order adapter — chain-specific auction semantics required.",
        backend: "fork-vs-chain",
        canPassInV1: false,
      };
    case "erc7683_fill":
      return {
        constructed: false,
        liveCandidate: false,
        shadowOnly: true,
        reason: "Crate stub. ERC-7683 is a wire format, not settlement or inventory. No route risk memo.",
        backend: "fork-vs-chain",
        canPassInV1: false,
      };
    case "liq_morpho":
      return {
        constructed: chain.morpho,
        liveCandidate: chain.morpho,
        shadowOnly: true,
        reason: chain.morpho
          ? "Simulation only. TOKEN_VALUATION is off; live path does not exist. Flash-loan fixture pending."
          : "Not constructed — this chain profile has no Morpho Blue address.",
        backend: "fork-vs-chain",
        canPassInV1: chain.morpho,
      };
    case "liq_aave":
      return {
        constructed: chain.aave,
        liveCandidate: chain.aave,
        shadowOnly: true,
        reason: chain.aave
          ? "Simulation only. TOKEN_VALUATION is off; live path does not exist."
          : "Not constructed — this chain profile has no Aave V3 pool address.",
        backend: "fork-vs-chain",
        canPassInV1: chain.aave,
      };
    case "liq_compound":
      return {
        constructed: false,
        liveCandidate: false,
        shadowOnly: true,
        reason: "Constructed only if the chain profile has Comet. Not a v1 row.",
        backend: "fork-vs-chain",
        canPassInV1: false,
      };
    case "liq_maker":
      return {
        constructed: false,
        liveCandidate: false,
        shadowOnly: true,
        reason: "Constructed only if maker = true on the chain profile. Not a v1 row.",
        backend: "fork-vs-chain",
        canPassInV1: false,
      };
    case "oracle_backrun":
      return {
        constructed: !chain.sequencerOnly,
        liveCandidate: false,
        shadowOnly: true,
        reason: chain.sequencerOnly
          ? "Observational only on sequencer chains. No public mempool; bundle path does not exist."
          : "Observational. Oracle-update execution stays disabled until exact bundle transport is integration-tested.",
        backend: "relay",
        canPassInV1: false,
      };
    case "atomic_arb":
      return {
        constructed: true,
        liveCandidate: false,
        shadowOnly: true,
        reason:
          "Research/simulation candidate. No live scope until a chain-specific ordering/transport integration is proven.",
        backend: chain.sequencerOnly ? "sequencer" : "relay",
        canPassInV1: false,
      };
  }
}

export function verdictFor(policy: RowPolicy, samples: number): QualVerdict {
  if (!policy.constructed || !policy.canPassInV1) return "INELIGIBLE";
  if (samples < 1) return "INSUFFICIENT";
  return "INSUFFICIENT";
}
