export interface ChainProfile {
  id: number;
  key: "ethereum" | "base" | "bnb" | "arbitrum";
  name: string;
  short: string;
  native: string;
  explorer: string;
  sequencerOnly: boolean;
  blockMs: number;
  defaultSubmission: "bundle" | "raw" | "cow_driver";
  defaultQualBackend: "relay" | "sequencer" | "solver-auction";
  v1Job: string;
  defaultBribeBps: number;
  morpho: boolean;
  aave: boolean;
  cowConstructed: boolean;
  cowShadowReason: string;
}

export const CHAINS: ChainProfile[] = [
  {
    id: 1,
    key: "ethereum",
    name: "Ethereum",
    short: "ETH",
    native: "ETH",
    explorer: "https://etherscan.io",
    sequencerOnly: false,
    blockMs: 12_000,
    defaultSubmission: "bundle",
    defaultQualBackend: "relay",
    v1Job: "Sidecar liquidations; CoW later",
    defaultBribeBps: 9000,
    morpho: true,
    aave: true,
    cowConstructed: true,
    cowShadowReason:
      "Shadow only. Ethereum CoW is not a v1 production venue; sidecar is the Ethereum job.",
  },
  {
    id: 56,
    key: "bnb",
    name: "BNB Chain",
    short: "BNB",
    native: "BNB",
    explorer: "https://bscscan.com",
    sequencerOnly: false,
    blockMs: 3_000,
    defaultSubmission: "cow_driver",
    defaultQualBackend: "solver-auction",
    v1Job: "CoW candidate only — confirm current onboarding terms",
    defaultBribeBps: 0,
    morpho: false,
    aave: true,
    cowConstructed: true,
    cowShadowReason:
      "Shadow only until CoW environment, driver, bond/KYC and chain terms are confirmed in writing.",
  },
  {
    id: 8453,
    key: "base",
    name: "Base",
    short: "Base",
    native: "ETH",
    explorer: "https://basescan.org",
    sequencerOnly: true,
    blockMs: 2_000,
    defaultSubmission: "raw",
    defaultQualBackend: "sequencer",
    v1Job: "CoW after BNB; Flashblocks later",
    defaultBribeBps: 0,
    morpho: false,
    aave: false,
    cowConstructed: true,
    cowShadowReason:
      "Shadow only. Base CoW is phase 4; sequencer-only — sandwich rows are not constructed.",
  },
  {
    id: 42161,
    key: "arbitrum",
    name: "Arbitrum",
    short: "Arb",
    native: "ETH",
    explorer: "https://arbiscan.io",
    sequencerOnly: true,
    blockMs: 250,
    defaultSubmission: "raw",
    defaultQualBackend: "sequencer",
    v1Job: "CoW after Base; Timeboost later",
    defaultBribeBps: 0,
    morpho: false,
    aave: false,
    cowConstructed: true,
    cowShadowReason: "Shadow only. Arbitrum CoW is after Base evidence; Timeboost unimplemented.",
  },
];

export const CHAIN_BY_ID: Record<number, ChainProfile> = Object.fromEntries(
  CHAINS.map((c) => [c.id, c]),
) as Record<number, ChainProfile>;

export function chainOf(id: number): ChainProfile {
  return CHAIN_BY_ID[id] ?? CHAINS[0];
}
