import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { demoBootValues, parseBootConfig } from "./config.ts";
import { rowPolicy } from "./eligibility.ts";
import { bootstrapCell, tripKill, resetKill, stepCell, armingRejectedBody, replayFromOptimizer } from "./engine.ts";
import {
  formatEth,
  parseWei,
  weiFromEthString,
  ratioLabel,
  WEI,
  mulberry32,
} from "./format.ts";
import {
  getAmountOut,
  demoGraph,
  makeAuction,
  solveNaive,
  solveV1,
  buildFrozenTape,
  v1BeatsNaiveEveryDay,
  pairwiseSurplus,
} from "./optimizer.ts";
import { defaultEnvelope, evaluateRisk } from "./risk.ts";
import { chainOf } from "./chains.ts";
import type { CandidateRisk } from "./types.ts";

const ALLOWED: CandidateRisk = {
  netProfitWei: WEI,
  notionalWei: WEI,
  baseFeeWei: 1n,
  inflight: 0,
  exactPayloadSimulated: true,
  registryAttested: true,
  qualified: true,
  executionArmed: true,
  killTripped: false,
  broadcastEnabled: true,
  shadowOnly: false,
};

describe("config", () => {
  it("parses demo boot values as simulation", () => {
    const parsed = parseBootConfig(demoBootValues(1));
    assert.equal("kind" in parsed, false);
    if ("kind" in parsed) return;
    assert.equal(parsed.chainId, 1);
    assert.equal(parsed.mode, "simulation");
    assert.equal(parsed.broadcastEnabled, false);
  });

  it("refuses forbidden unit aliases", () => {
    const err = parseBootConfig({
      ...demoBootValues(1),
      MIN_NET_PROFIT_ETH: "0.01",
    });
    assert.equal("kind" in err, true);
    if (!("kind" in err)) return;
    assert.equal(err.kind, "ForbiddenNamePresent");
  });

  it("refuses live without acknowledgement, broadcast, and registry", () => {
    const base = { ...demoBootValues(1), LIVE_EXECUTION: "true" };
    const a = parseBootConfig(base);
    assert.equal("kind" in a && a.kind === "LiveAcknowledgementMissing", true);
    const b = parseBootConfig({ ...base, I_UNDERSTAND_LIVE_RISK: "yes" });
    assert.equal("kind" in b && b.kind === "LiveBroadcastDisabled", true);
    const c = parseBootConfig({
      ...base,
      I_UNDERSTAND_LIVE_RISK: "yes",
      BROADCAST_ENABLED: "true",
    });
    assert.equal("kind" in c && c.kind === "LiveRegistryMissing", true);
  });
});

describe("risk kernel", () => {
  const env = defaultEnvelope(9000);

  it("allows a fully qualified live candidate", () => {
    const d = evaluateRisk(env, ALLOWED);
    assert.deepEqual(d, { kind: "Allow" });
  });

  it("evaluates fail-closed in documented order", () => {
    assert.equal(evaluateRisk(env, { ...ALLOWED, killTripped: true }).kind, "Reject");
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, killTripped: true }) as { reason: string }).reason,
      "KillTripped",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, executionArmed: false }) as { reason: string }).reason,
      "NotArmed",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, broadcastEnabled: false }) as { reason: string }).reason,
      "BroadcastDisabled",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, shadowOnly: true }) as { reason: string }).reason,
      "ShadowOnly",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, qualified: false }) as { reason: string }).reason,
      "NotQualified",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, registryAttested: false }) as { reason: string }).reason,
      "RegistryNotAttested",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, exactPayloadSimulated: false }) as { reason: string }).reason,
      "ExactPayloadNotSimulated",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, netProfitWei: 0n }) as { reason: string }).reason,
      "ProfitBelowMinimum",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, notionalWei: env.maxPositionWei + 1n }) as { reason: string }).reason,
      "PositionAboveMaximum",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, baseFeeWei: env.maxBaseFeeWei + 1n }) as { reason: string }).reason,
      "BaseFeeAboveMaximum",
    );
    assert.equal(
      (evaluateRisk(env, { ...ALLOWED, inflight: env.maxInflight }) as { reason: string }).reason,
      "InflightLimitReached",
    );
  });
});

describe("optimizer", () => {
  it("matches constant-product with fee", () => {
    const out = getAmountOut(1000n, 100_000n, 100_000n, 30);
    assert.equal(out, 987n);
  });

  it("v1 surplus is ≥ naive on every frozen tape day", () => {
    const snap = buildFrozenTape(31, Date.UTC(2026, 7, 25, 17, 0, 0));
    assert.equal(v1BeatsNaiveEveryDay(snap), true);
    for (const d of snap.days) {
      assert.ok(d.surplusV1Wei >= d.surplusNaiveWei, d.day);
    }
  });

  it("v1 does not lose to naive on random auctions", () => {
    const rng = mulberry32(20260825);
    for (let i = 0; i < 80; i++) {
      const graph = demoGraph(1000 + i);
      const auction = makeAuction(rng, `r-${i}`, graph.stateBlock);
      const naive = solveNaive(auction, graph);
      const v1 = solveV1(auction, graph);
      assert.ok(
        v1.surplusNativeWei >= naive.surplusNativeWei,
        `auction ${auction.id}: v1 ${v1.surplusNativeWei} < naive ${naive.surplusNativeWei}`,
      );
    }
  });

  it("pairwise match of complementary orders is priced", () => {
    const graph = demoGraph(7);
    const a = {
      id: "a",
      sell: 0,
      buy: 1,
      sellAmount: WEI,
      limitBuyAmount: WEI / 1000n,
    };
    const b = {
      id: "b",
      sell: 1,
      buy: 0,
      sellAmount: WEI,
      limitBuyAmount: WEI / 1000n,
    };
    const s = pairwiseSurplus(graph, a, b);
    assert.ok(s !== null);
    assert.ok((s ?? 0n) > 0n);
  });
});

describe("eligibility", () => {
  it("keeps UniswapX and 7683 as crate stubs", () => {
    const eth = chainOf(1);
    assert.equal(rowPolicy("uniswapx_fill", eth).constructed, false);
    assert.equal(rowPolicy("erc7683_fill", eth).constructed, false);
    assert.equal(rowPolicy("liq_morpho", eth).constructed, true);
    assert.equal(rowPolicy("liq_morpho", chainOf(8453)).constructed, false);
  });
});

describe("format", () => {
  it("round-trips wei strings", () => {
    assert.equal(parseWei("100"), 100n);
    assert.equal(parseWei("1.2"), null);
    assert.equal(weiFromEthString("1.5"), WEI + WEI / 2n);
    assert.equal(formatEth(WEI), "1.0000");
    assert.equal(ratioLabel(1100n, 1000n), 1.1);
  });
});

describe("engine cell", () => {
  it("boots in simulation with zero submitted and honest doctor", () => {
    const cell = bootstrapCell(1, Date.UTC(2026, 7, 25, 17, 0, 0));
    assert.equal(cell.mode, "simulation");
    assert.equal(cell.broadcastEnabled, false);
    assert.equal(cell.funnelLive.cow_batch.submitted, 0);
    assert.equal(cell.surfaces.mouthA.fillOrWin > 0, true);
    assert.equal(
      cell.doctor.find((d) => d.name === "v1 vs naive (7-day tape)")?.ok,
      true,
    );
    assert.equal(
      cell.doctor.find((d) => d.name === "signer / broadcast")?.ok,
      true,
    );
    assert.match(armingRejectedBody(), /409/);
  });

  it("kill switch is durable until typed RESET", () => {
    const cell = bootstrapCell(1, Date.UTC(2026, 7, 25, 17, 0, 0));
    tripKill(cell, cell.now, "test");
    assert.equal(cell.killTripped, true);
    resetKill(cell, cell.now + 1);
    assert.equal(cell.killTripped, false);
    const gated = evaluateRisk(cell.envelope, {
      ...ALLOWED,
      killTripped: true,
    });
    assert.equal(gated.kind === "Reject" && gated.reason === "KillTripped", true);
  });

  it("never submits while stepping", () => {
    const cell = bootstrapCell(56, Date.UTC(2026, 7, 25, 17, 0, 0));
    const rng = mulberry32(9);
    for (let i = 0; i < 40; i++) {
      cell.now += 900;
      stepCell(cell, rng);
    }
    assert.equal(cell.funnelLive.cow_batch.submitted, 0);
    assert.equal(cell.surfaces.mouthB.fillOrWin, 0);
  });

  it("replay funnel is CoW tape only and never submitted", () => {
    const cell = bootstrapCell(1, Date.UTC(2026, 7, 25, 17, 0, 0));
    const replay = replayFromOptimizer(cell.optimizer);
    assert.equal(replay.cow_batch.submitted, 0);
    assert.ok(replay.cow_batch.invocationsWithOutput > 0);
    assert.equal(replay.liq_morpho.candidatesEmitted, 0);
    assert.equal(replay.uniswapx_fill.candidatesEmitted, 0);
  });
});
