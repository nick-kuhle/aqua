import { chainOf, type ChainProfile } from "./chains.ts";
import { demoBootValues, formatConfigError, parseBootConfig } from "./config.ts";
import { rowPolicy } from "./eligibility.ts";
import { formatEth, hexFromRng, mulberry32, WEI } from "./format.ts";
import {
  buildFrozenTape,
  demoGraph,
  makeAuction,
  solveNaive,
  solveV1,
  v1BeatsNaiveEveryDay,
} from "./optimizer.ts";
import { defaultEnvelope, evaluateRisk, RISK_COPY } from "./risk.ts";
import {
  emptyFunnel,
  emptyMouthFunnel,
  STRATEGIES,
  type AlertItem,
  type DoctorCheck,
  type EquityPoint,
  type FunnelCounters,
  type Health,
  type JournalEntry,
  type MouthFunnel,
  type OptimizerSnapshot,
  type QualRow,
  type RiskEnvelope,
  type SidecarPanel,
  type StrategyId,
  type SurfaceStats,
  type TapeEvent,
} from "./types.ts";

const TAPE_CAP = 240;
const EQUITY_CAP = 180;

export interface ChainCell {
  chainId: number;
  mode: "simulation";
  broadcastEnabled: false;
  killTripped: boolean;
  killReason: string | null;
  envelope: RiskEnvelope;
  enabled: Record<StrategyId, boolean>;
  funnelLive: Record<StrategyId, FunnelCounters>;
  funnelReplay: Record<StrategyId, FunnelCounters>;
  cow: MouthFunnel;
  cowWeekly: string;
  cowDriver: "DAO pool" | "self";
  surfaces: {
    mouthA: SurfaceStats;
    mouthB: SurfaceStats;
    sidecar: SurfaceStats;
  };
  morpho: SidecarPanel;
  aave: SidecarPanel;
  oracle: SidecarPanel;
  qualification: Record<StrategyId, QualRow>;
  soakHours: number;
  optimizer: OptimizerSnapshot;
  tape: TapeEvent[];
  equity: EquityPoint[];
  health: Health;
  alerts: AlertItem[];
  journal: JournalEntry[];
  doctor: DoctorCheck[];
  simPnlWei: bigint;
  now: number;
  lastHeadAt: number;
  tick: number;
  lastFailedAuctionId: string | null;
}

function zeroSurface(): SurfaceStats {
  return { netSimWei: 0n, netFinalWei: 0n, fillOrWin: 0, lastEventAgeMs: 0 };
}

function sidecarEmpty(why: string, cap: number): SidecarPanel {
  return {
    watchlist: 0,
    watchCap: cap,
    nearMiss: 0,
    lastSelector: null,
    simWei: 0n,
    finalWei: 0n,
    valuationMisses: 0,
    emptyWhy: why,
  };
}

function pushTape(cell: ChainCell, ev: Omit<TapeEvent, "id" | "chainId">) {
  const event: TapeEvent = {
    id: `ev-${cell.chainId}-${cell.tick}-${cell.tape.length}`,
    chainId: cell.chainId,
    ...ev,
  };
  cell.tape.unshift(event);
  if (cell.tape.length > TAPE_CAP) cell.tape.length = TAPE_CAP;
}

function journal(cell: ChainCell, kind: JournalEntry["kind"], summary: string) {
  cell.journal.unshift({
    id: `j-${cell.chainId}-${cell.journal.length}-${cell.tick}`,
    t: cell.now,
    kind,
    summary,
  });
  if (cell.journal.length > 80) cell.journal.length = 80;
}

function bump(f: FunnelCounters, key: keyof FunnelCounters, n = 1) {
  f[key] += n;
}

/** Frozen optimizer tape as a replay population. CoW only. Submitted stays 0. */
export function replayFromOptimizer(snap: OptimizerSnapshot): Record<StrategyId, FunnelCounters> {
  const table = Object.fromEntries(STRATEGIES.map((s) => [s, emptyFunnel()])) as Record<
    StrategyId,
    FunnelCounters
  >;
  const auctions = snap.days.reduce((n, d) => n + d.auctions, 0);
  const withOut = Math.round(auctions * snap.fillRate);
  const cow = table.cow_batch;
  cow.invocationsWithOutput = withOut;
  cow.invocationsEmpty = Math.max(0, auctions - withOut);
  cow.candidatesEmitted = withOut;
  cow.simulationsSucceeded = withOut;
  return table;
}

function applyRisk(
  cell: ChainCell,
  row: StrategyId,
  decision: ReturnType<typeof evaluateRisk>,
  title: string,
) {
  if (decision.kind === "Allow") {
    bump(cell.funnelLive[row], "submittable");
    return;
  }
  bump(cell.funnelLive[row], "gatedByRisk");
  if (row === "cow_batch") cell.cow.gatedByRisk++;
  journal(cell, "risk", `${row} reject ${decision.reason}`);
  pushTape(cell, {
    t: cell.now,
    kind: "risk",
    title,
    detail: RISK_COPY[decision.reason] ?? decision.reason,
    tag: decision.reason,
  });
}

export function buildDoctor(chain: ChainProfile, optimizer: OptimizerSnapshot): DoctorCheck[] {
  const parsed = parseBootConfig(demoBootValues(chain.id));
  const configOk = !("kind" in parsed);
  return [
    {
      name: "boot config",
      ok: configOk,
      detail: configOk
        ? `OK config parsed: chain_id=${chain.id}, mode=simulation`
        : `FAIL config: ${formatConfigError(parsed)}`,
    },
    {
      name: "forbidden unit aliases",
      ok: true,
      detail: "MIN_NET_PROFIT_ETH / MAX_BASE_FEE_GWEI / MAX_DRAWDOWN_ETH refuse boot if present",
    },
    {
      name: "risk kernel",
      ok: true,
      detail: "Ordered fail-closed gate. Arming is evaluated first.",
    },
    {
      name: "naive baseline",
      ok: true,
      detail: "optimizer::naive is frozen as the CI baseline. Never deleted.",
    },
    {
      name: "v1 vs naive (7-day tape)",
      ok: v1BeatsNaiveEveryDay(optimizer),
      detail: v1BeatsNaiveEveryDay(optimizer)
        ? "surplus_v1 ≥ surplus_naive on every tape day"
        : "KILL GATE: surplus ≤ naive on the tape — do not add mouths",
    },
    {
      name: "Alloy provider / block pin",
      ok: false,
      detail: "NOT IMPLEMENTED: no RPC, no provider, no pinned-head client.",
    },
    {
      name: "Anvil exact-payload sim",
      ok: false,
      detail: "NOT IMPLEMENTED: in-process shadow sim only. No fork backend.",
    },
    {
      name: "signer / broadcast",
      ok: true,
      detail: "Absent by construction. No private key parser, no sendTransaction.",
    },
    {
      name: "protocol registry",
      ok: false,
      detail: "No attested manifest. Live mode requires PROTOCOL_REGISTRY_PATH.",
    },
    {
      name: "CoW onboarding evidence",
      ok: false,
      detail: "No written confirmation of environment, driver, bond/KYC, chain, rewards.",
    },
  ];
}

export function bootstrapCell(chainId: number, now: number): ChainCell {
  const chain = chainOf(chainId);
  const rng = mulberry32(chainId * 997 + 13);
  const optimizer = buildFrozenTape(chainId * 31, now);
  const enabled = Object.fromEntries(
    STRATEGIES.map((s) => [s, rowPolicy(s, chain).constructed]),
  ) as Record<StrategyId, boolean>;

  const qualification = Object.fromEntries(
    STRATEGIES.map((row) => {
      const p = rowPolicy(row, chain);
      const q: QualRow = {
        row,
        verdict: p.constructed && p.canPassInV1 ? "INSUFFICIENT" : "INELIGIBLE",
        reason: p.reason,
        samples: 0,
        windowHours: 168,
        continuityHours: 0,
        lastBreak: new Date(now).toISOString(),
        smokeRemaining: 0,
        backend: p.backend,
        liveCandidate: p.liveCandidate,
      };
      return [row, q];
    }),
  ) as Record<StrategyId, QualRow>;

  const cell: ChainCell = {
    chainId,
    mode: "simulation",
    broadcastEnabled: false,
    killTripped: false,
    killReason: null,
    envelope: defaultEnvelope(chain.defaultBribeBps),
    enabled,
    funnelLive: Object.fromEntries(STRATEGIES.map((s) => [s, emptyFunnel()])) as Record<
      StrategyId,
      FunnelCounters
    >,
    funnelReplay: replayFromOptimizer(optimizer),
    cow: emptyMouthFunnel(),
    cowWeekly: "operator-entered — not scraped",
    cowDriver: "DAO pool",
    surfaces: { mouthA: zeroSurface(), mouthB: zeroSurface(), sidecar: zeroSurface() },
    morpho: sidecarEmpty(
      chain.morpho
        ? "Zero candidates until the watchlist is warm. TOKEN_VALUATION off (liq will net zero)."
        : "Not constructed — no Morpho Blue address on this profile.",
      64,
    ),
    aave: sidecarEmpty(
      chain.aave
        ? "Zero candidates. Cap too low? Watchlist empty? TOKEN_VALUATION off."
        : "Not constructed — no Aave V3 pool on this profile.",
      128,
    ),
    oracle: sidecarEmpty(
      chain.sequencerOnly
        ? "No public mempool. Oracle backrun is observational only on sequencer chains."
        : "No transmit in the feed. This cell has no pending RPC.",
      16,
    ),
    qualification,
    soakHours: 168,
    optimizer,
    tape: [],
    equity: [],
    health: {
      headLagMs: 0,
      simP95Ms: 4,
      queueDrops: 0,
      replayDrops: 0,
      rpcErrors: 0,
      headNumber: 22_410_000 + (chainId % 97) * 1000,
      headHash: hexFromRng(rng),
    },
    alerts: [
      {
        id: `a-${chainId}-demo`,
        t: now,
        severity: "info",
        title: "DEMO DATA",
        body: "In-process shadow cell. No RPC, no signer, no broadcast. Generated feed cannot be mistaken for live.",
        resolved: false,
      },
    ],
    journal: [],
    doctor: buildDoctor(chain, optimizer),
    simPnlWei: 0n,
    now,
    lastHeadAt: now,
    tick: 0,
    lastFailedAuctionId: optimizer.lastFailedAuctionId,
  };

  journal(cell, "config", `cell boot chain=${chainId} mode=simulation broadcast=false`);
  journal(cell, "qual", "qualification clocks start at zero — INSUFFICIENT SAMPLE is the honest v1 state");

  const backfillMs = 36 * 60 * 1000;
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    cell.now = now - backfillMs + Math.floor((backfillMs / steps) * i);
    stepCell(cell, mulberry32(chainId * 1009 + i * 17), true);
  }
  cell.now = now;
  return cell;
}

export function stepCell(cell: ChainCell, rng: () => number, backfill = false): void {
  cell.tick += 1;
  const chain = chainOf(cell.chainId);
  const dt = chain.blockMs;
  if (cell.now - cell.lastHeadAt >= dt) {
    cell.lastHeadAt = cell.now;
    cell.health.headNumber += 1;
    cell.health.headHash = hexFromRng(rng);
    cell.health.headLagMs = Math.floor(rng() * 80);
    pushTape(cell, {
      t: cell.now,
      kind: "head",
      title: `head ${cell.health.headNumber}`,
      detail: `pinned ${cell.health.headHash.slice(0, 10)}… · not latest`,
      hash: cell.health.headHash,
      tag: "head",
    });
  }

  if (cell.enabled.cow_batch && rng() < 0.42) {
    runCow(cell, rng);
  } else if (cell.enabled.cow_batch) {
    bump(cell.funnelLive.cow_batch, "invocationsEmpty");
    cell.cow.invocationsEmpty++;
  }

  if (cell.enabled.liq_morpho) {
    runLiq(cell, "liq_morpho", rng);
  }
  if (cell.enabled.liq_aave) {
    runLiq(cell, "liq_aave", rng);
  }
  if (cell.enabled.oracle_backrun && rng() < 0.12) {
    runOracle(cell, rng);
  }
  if (cell.enabled.atomic_arb && rng() < 0.2) {
    runArb(cell, rng);
  }

  for (const row of STRATEGIES) {
    const p = rowPolicy(row, chain);
    if (!p.constructed) continue;
    const q = cell.qualification[row];
    q.windowHours = cell.soakHours;
    q.samples = cell.funnelLive[row].candidatesEmitted;
    q.continuityHours = Math.min(cell.soakHours, q.samples > 0 ? q.continuityHours + (backfill ? 1 : 0.01) : 0);
    q.verdict = p.canPassInV1 ? "INSUFFICIENT" : "INELIGIBLE";
    q.reason = p.reason;
  }

  const simEth = Number(cell.simPnlWei) / Number(WEI);
  cell.equity.push({ t: cell.now, simEth, finalizedEth: 0 });
  if (cell.equity.length > EQUITY_CAP) cell.equity.splice(0, cell.equity.length - EQUITY_CAP);

  cell.surfaces.mouthA.lastEventAgeMs = Math.max(0, cell.now - (cell.tape.find((e) => e.kind === "auction")?.t ?? cell.now));
  cell.surfaces.sidecar.lastEventAgeMs = Math.max(0, cell.now - (cell.tape.find((e) => e.kind === "opp")?.t ?? cell.now));
  cell.surfaces.mouthB.lastEventAgeMs = 0;
  cell.health.simP95Ms = 3 + Math.floor(rng() * 9);

  if (cell.cow.auctionsSeen >= 24) {
    const miss = cell.cow.deadlineMissed / cell.cow.auctionsSeen;
    const id = `collapse-${cell.chainId}`;
    if (miss > 0.12 && !cell.alerts.some((a) => a.id === id)) {
      cell.alerts.unshift({
        id,
        t: cell.now,
        severity: "warn",
        title: "Conversion collapse",
        body: `Mouth A deadline misses ${cell.cow.deadlineMissed}/${cell.cow.auctionsSeen}. Missing an auction is cheaper than a revert — still inspect the budget.`,
        resolved: false,
      });
    }
  }
}

function runCow(cell: ChainCell, rng: () => number) {
  const graph = demoGraph(cell.chainId + cell.health.headNumber);
  const auction = makeAuction(rng, `auc-${cell.chainId}-${cell.tick}`, cell.health.headNumber);
  cell.cow.auctionsSeen++;
  pushTape(cell, {
    t: cell.now,
    kind: "auction",
    title: `auction ${auction.id}`,
    detail: `${auction.orders.length} orders · state_block ${auction.stateBlock}`,
    tag: auction.id,
  });

  if (rng() < 0.08) {
    bump(cell.funnelLive.cow_batch, "invocationsEmpty");
    cell.cow.invocationsEmpty++;
    cell.cow.deadlineMissed++;
    pushTape(cell, {
      t: cell.now,
      kind: "mouth",
      title: "deadline miss",
      detail: "OPT_BUDGET_MS exhausted with no complete solution. Missing an auction is cheaper than a revert.",
      tag: auction.id,
    });
    return;
  }

  const naive = solveNaive(auction, graph);
  const v1 = solveV1(auction, graph);
  const emitted = v1.fills.length;
  if (emitted === 0) {
    bump(cell.funnelLive.cow_batch, "invocationsEmpty");
    cell.cow.invocationsEmpty++;
    return;
  }
  bump(cell.funnelLive.cow_batch, "invocationsWithOutput");
  cell.cow.invocationsWithOutput++;
  bump(cell.funnelLive.cow_batch, "candidatesEmitted", emitted);
  cell.cow.candidatesEmitted += emitted;

  if (!v1.fair) {
    cell.cow.fairnessRejected++;
    return;
  }

  const simOk = rng() > 0.07;
  if (simOk) {
    bump(cell.funnelLive.cow_batch, "simulationsSucceeded");
    cell.cow.simulationsSucceeded++;
    cell.cow.solutionsAccepted++;
    const profit = v1.surplusNativeWei;
    cell.simPnlWei += profit;
    cell.surfaces.mouthA.netSimWei += profit;
    cell.surfaces.mouthA.fillOrWin += 1;
    cell.cow.shadowWins += 1;
    pushTape(cell, {
      t: cell.now,
      kind: "sim",
      title: "shadow solution",
      detail: `v1 ${formatEth(v1.surplusNativeWei)} native surplus · naive ${formatEth(naive.surplusNativeWei)} · not submitted`,
      tag: auction.id,
    });
  } else {
    bump(cell.funnelLive.cow_batch, "simulationsReverted");
    cell.cow.simulationsReverted++;
    pushTape(cell, {
      t: cell.now,
      kind: "sim",
      title: "sim revert",
      detail: "Pinned-state shadow sim reverted. Payload never left the cell.",
      tag: auction.id,
    });
  }

  const decision = evaluateRisk(cell.envelope, {
    netProfitWei: v1.surplusNativeWei,
    notionalWei: 2n * WEI,
    baseFeeWei: 2n * 10n ** 9n,
    inflight: 0,
    exactPayloadSimulated: simOk,
    registryAttested: false,
    qualified: false,
    executionArmed: false,
    killTripped: cell.killTripped,
    broadcastEnabled: false,
    shadowOnly: true,
  });
  applyRisk(cell, "cow_batch", decision, `cow ${auction.id}`);
}

function runLiq(cell: ChainCell, row: "liq_morpho" | "liq_aave", rng: () => number) {
  const panel = row === "liq_morpho" ? cell.morpho : cell.aave;
  const cap = panel.watchCap;
  if (panel.watchlist < cap && rng() < 0.5) {
    panel.watchlist += 1;
  }
  const unhealthy = rng() < (row === "liq_morpho" ? 0.18 : 0.12);
  if (!unhealthy) {
    bump(cell.funnelLive[row], "invocationsEmpty");
    return;
  }
  bump(cell.funnelLive[row], "invocationsWithOutput");
  panel.nearMiss += rng() < 0.55 ? 1 : 0;
  const profit = BigInt(Math.floor(2 + rng() * 40)) * (WEI / 100n);
  bump(cell.funnelLive[row], "candidatesEmitted");
  if (!cell.envelope.tokenValuation) {
    panel.valuationMisses += 1;
  }
  const haircut = cell.envelope.tokenValuation
    ? (profit * BigInt(cell.envelope.valuationHaircutBps)) / 10_000n
    : profit;
  const net = cell.envelope.tokenValuation ? profit - haircut : 0n;
  pushTape(cell, {
    t: cell.now,
    kind: "opp",
    title: row === "liq_morpho" ? "Morpho candidate" : "Aave V3 candidate",
    detail: cell.envelope.tokenValuation
      ? `expected ${formatEth(net)} native after ${cell.envelope.valuationHaircutBps} bps haircut`
      : "TOKEN_VALUATION off — profit token uncertified, candidate nets zero for live",
    hash: hexFromRng(rng),
  });

  const simOk = rng() > 0.12;
  if (simOk) {
    bump(cell.funnelLive[row], "simulationsSucceeded");
    if (net > 0n) {
      cell.simPnlWei += net;
      panel.simWei += net;
      cell.surfaces.sidecar.netSimWei += net;
      cell.surfaces.sidecar.fillOrWin += 1;
    }
  } else {
    bump(cell.funnelLive[row], "simulationsReverted");
  }

  const decision = evaluateRisk(cell.envelope, {
    netProfitWei: net,
    notionalWei: 8n * WEI,
    baseFeeWei: 3n * 10n ** 9n,
    inflight: 0,
    exactPayloadSimulated: simOk,
    registryAttested: false,
    qualified: false,
    executionArmed: false,
    killTripped: cell.killTripped,
    broadcastEnabled: false,
    shadowOnly: true,
  });
  applyRisk(cell, row, decision, `${row} candidate`);
}

function runOracle(cell: ChainCell, rng: () => number) {
  bump(cell.funnelLive.oracle_backrun, "invocationsWithOutput");
  const sel = rng() < 0.5 ? "transmit(bytes32,bytes32)" : "poke(address)";
  cell.oracle.lastSelector = sel;
  cell.oracle.watchlist = Math.min(cell.oracle.watchCap, cell.oracle.watchlist + 1);
  cell.oracle.nearMiss += rng() < 0.3 ? 1 : 0;
  bump(cell.funnelLive.oracle_backrun, "candidatesEmitted");
  const decision = evaluateRisk(cell.envelope, {
    netProfitWei: 0n,
    notionalWei: WEI,
    baseFeeWei: 2n * 10n ** 9n,
    inflight: 0,
    exactPayloadSimulated: false,
    registryAttested: false,
    qualified: false,
    executionArmed: false,
    killTripped: cell.killTripped,
    broadcastEnabled: false,
    shadowOnly: true,
  });
  applyRisk(cell, "oracle_backrun", decision, "oracle selector");
  pushTape(cell, {
    t: cell.now,
    kind: "pending",
    title: "oracle selector",
    detail: `${sel} · observational — execution disabled until bundle transport is real`,
    hash: hexFromRng(rng),
  });
}

function runArb(cell: ChainCell, rng: () => number) {
  if (rng() < 0.55) {
    bump(cell.funnelLive.atomic_arb, "invocationsEmpty");
    return;
  }
  bump(cell.funnelLive.atomic_arb, "invocationsWithOutput");
  bump(cell.funnelLive.atomic_arb, "candidatesEmitted");
  const simOk = rng() > 0.2;
  if (simOk) bump(cell.funnelLive.atomic_arb, "simulationsSucceeded");
  else bump(cell.funnelLive.atomic_arb, "simulationsReverted");
  const decision = evaluateRisk(cell.envelope, {
    netProfitWei: 0n,
    notionalWei: 4n * WEI,
    baseFeeWei: 2n * 10n ** 9n,
    inflight: 0,
    exactPayloadSimulated: simOk,
    registryAttested: false,
    qualified: false,
    executionArmed: false,
    killTripped: cell.killTripped,
    broadcastEnabled: false,
    shadowOnly: true,
  });
  applyRisk(cell, "atomic_arb", decision, "atomic cycle");
  pushTape(cell, {
    t: cell.now,
    kind: "opp",
    title: "atomic cycle",
    detail: "WETH-anchored 3-cycle on V2 snapshot. Live scope closed.",
    hash: hexFromRng(rng),
  });
}

export function tripKill(cell: ChainCell, now: number, reason: string) {
  cell.killTripped = true;
  cell.killReason = reason;
  cell.alerts.unshift({
    id: `kill-${now}`,
    t: now,
    severity: "danger",
    title: "Kill switch tripped",
    body: reason,
    resolved: false,
  });
  journal(cell, "kill", reason);
}

export function resetKill(cell: ChainCell, now: number) {
  cell.killTripped = false;
  cell.killReason = null;
  for (const a of cell.alerts) {
    if (a.title.startsWith("Kill")) a.resolved = true;
  }
  journal(cell, "kill", "kill switch reset after typed confirm");
}

export function armingRejectedBody(): string {
  return [
    "409 — unarmed process cannot be switched live.",
    "This cell has no signer, no provider, no registry attestation, and BROADCAST_ENABLED=false.",
    ...[
      "LIVE_EXECUTION is false",
      "I_UNDERSTAND_LIVE_RISK is unset",
      "BROADCAST_ENABLED is false",
      "PROTOCOL_REGISTRY_PATH is missing",
      "qualification is INSUFFICIENT SAMPLE / INELIGIBLE on every row",
      "no reserved nonce",
      "no Anvil fork backend",
    ].map((g) => `· ${g}`),
  ].join("\n");
}
