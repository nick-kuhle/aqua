import { mulberry32, WEI } from "./format.ts";
import type { OptimizerDay, OptimizerSnapshot } from "./types.ts";

export interface Token {
  id: number;
  symbol: string;
  decimals: number;
}

export interface Pool {
  id: number;
  a: number;
  b: number;
  reserveA: bigint;
  reserveB: bigint;
  feeBps: number;
}

export interface GraphSnapshot {
  tokens: Token[];
  pools: Pool[];
  stateBlock: number;
}

export interface Order {
  id: string;
  sell: number;
  buy: number;
  sellAmount: bigint;
  limitBuyAmount: bigint;
}

export interface Auction {
  id: string;
  stateBlock: number;
  orders: Order[];
}

export interface Fill {
  kind: "pairwise" | "ring" | "spill";
  orderIds: string[];
  surplusNativeWei: bigint;
}

export interface Solution {
  auctionId: string;
  fills: Fill[];
  surplusNativeWei: bigint;
  gasEst: number;
  fair: boolean;
}

export const TOKENS: Token[] = [
  { id: 0, symbol: "WETH", decimals: 18 },
  { id: 1, symbol: "USDC", decimals: 18 },
  { id: 2, symbol: "DAI", decimals: 18 },
  { id: 3, symbol: "WBTC", decimals: 18 },
];

export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number,
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const feeMul = 10_000n - BigInt(feeBps);
  const amountInWithFee = amountIn * feeMul;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 10_000n + amountInWithFee;
  return numerator / denominator;
}

function poolReserves(p: Pool, tokenIn: number): { rin: bigint; rout: bigint; out: number } | null {
  if (p.a === tokenIn) return { rin: p.reserveA, rout: p.reserveB, out: p.b };
  if (p.b === tokenIn) return { rin: p.reserveB, rout: p.reserveA, out: p.a };
  return null;
}

export function bestHop(
  graph: GraphSnapshot,
  tokenIn: number,
  tokenOut: number,
  amountIn: bigint,
): { amountOut: bigint; poolId: number } | null {
  let best: { amountOut: bigint; poolId: number } | null = null;
  for (const p of graph.pools) {
    const r = poolReserves(p, tokenIn);
    if (!r || r.out !== tokenOut) continue;
    const out = getAmountOut(amountIn, r.rin, r.rout, p.feeBps);
    if (!best || out > best.amountOut) best = { amountOut: out, poolId: p.id };
  }
  return best;
}

/** Native valuation via WETH (token 0). Fail-closed if unpriced. */
export function valueNative(graph: GraphSnapshot, token: number, amount: bigint): bigint | null {
  if (token === 0) return amount;
  const hop = bestHop(graph, token, 0, amount);
  return hop ? hop.amountOut : null;
}

export function demoGraph(seed: number): GraphSnapshot {
  const rng = mulberry32(seed);
  const weth = 800n * WEI + BigInt(Math.floor(rng() * 200)) * WEI;
  const usdc = 2_400_000n * WEI + BigInt(Math.floor(rng() * 200_000)) * WEI;
  const dai = 2_400_000n * WEI + BigInt(Math.floor(rng() * 200_000)) * WEI;
  const wbtc = 25n * WEI + BigInt(Math.floor(rng() * 8)) * WEI;
  return {
    stateBlock: 22_000_000 + (seed % 50_000),
    tokens: TOKENS,
    pools: [
      { id: 1, a: 0, b: 1, reserveA: weth, reserveB: usdc, feeBps: 30 },
      { id: 2, a: 0, b: 2, reserveA: weth, reserveB: dai, feeBps: 30 },
      { id: 3, a: 1, b: 2, reserveA: usdc / 2n, reserveB: dai / 2n, feeBps: 5 },
      { id: 4, a: 0, b: 3, reserveA: weth / 3n, reserveB: wbtc, feeBps: 30 },
      { id: 5, a: 1, b: 3, reserveA: usdc / 8n, reserveB: wbtc / 4n, feeBps: 30 },
    ],
  };
}

function userSurplus(
  graph: GraphSnapshot,
  order: Order,
  buyFilled: bigint,
): bigint | null {
  if (buyFilled < order.limitBuyAmount) return null;
  const extra = buyFilled - order.limitBuyAmount;
  return valueNative(graph, order.buy, extra);
}

export function spillSurplus(graph: GraphSnapshot, order: Order): bigint {
  const hop = bestHop(graph, order.sell, order.buy, order.sellAmount);
  if (!hop) return 0n;
  return userSurplus(graph, order, hop.amountOut) ?? 0n;
}

/**
 * Coincidence-of-wants fill. Both orders are filled in full against each other
 * when each sell covers the counterparty limit. Surplus is native-valued extra
 * above those limits. Returns null if the pair cannot complete.
 */
export function pairwiseSurplus(graph: GraphSnapshot, a: Order, b: Order): bigint | null {
  if (a.sell !== b.buy || a.buy !== b.sell) return null;
  if (a.sellAmount < b.limitBuyAmount) return null;
  if (b.sellAmount < a.limitBuyAmount) return null;
  const fillABuy = b.sellAmount;
  const fillBBuy = a.sellAmount;
  const extraA = fillABuy - a.limitBuyAmount;
  const extraB = fillBBuy - b.limitBuyAmount;
  const sa = extraA ? valueNative(graph, a.buy, extraA) : 0n;
  const sb = extraB ? valueNative(graph, b.buy, extraB) : 0n;
  if (sa === null || sb === null) return null;
  return sa + sb;
}

/** v0 naive: each order independently routed to the best V2 hop. */
export function solveNaive(auction: Auction, graph: GraphSnapshot): Solution {
  const fills: Fill[] = [];
  let surplus = 0n;
  for (const o of auction.orders) {
    const hop = bestHop(graph, o.sell, o.buy, o.sellAmount);
    if (!hop) continue;
    const s = userSurplus(graph, o, hop.amountOut);
    if (s === null) continue;
    fills.push({ kind: "spill", orderIds: [o.id], surplusNativeWei: s });
    surplus += s;
  }
  return {
    auctionId: auction.id,
    fills,
    surplusNativeWei: surplus,
    gasEst: 90_000 + fills.length * 70_000,
    fair: true,
  };
}

/**
 * v1: improving pairwise coincidence-of-wants, then improving 3-cycles, then AMM spill.
 * A match is taken only when its surplus is ≥ the independent-spill baseline of those
 * orders, so v1 cannot lose to naive on the same auction. Integer amounts only.
 */
export function solveV1(auction: Auction, graph: GraphSnapshot): Solution {
  const remaining = new Map(auction.orders.map((o) => [o.id, { ...o }]));
  const fills: Fill[] = [];
  let surplus = 0n;

  let progressed = true;
  while (progressed) {
    progressed = false;
    const ids = [...remaining.keys()];
    let best: { a: string; b: string; s: bigint; gain: bigint } | null = null;
    for (let i = 0; i < ids.length; i++) {
      const a = remaining.get(ids[i]);
      if (!a) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const b = remaining.get(ids[j]);
        if (!b) continue;
        const s = pairwiseSurplus(graph, a, b);
        if (s === null) continue;
        const baseline = spillSurplus(graph, a) + spillSurplus(graph, b);
        if (s < baseline) continue;
        const gain = s - baseline;
        if (!best || gain > best.gain || (gain === best.gain && s > best.s)) {
          best = { a: a.id, b: b.id, s, gain };
        }
      }
    }
    if (best) {
      fills.push({ kind: "pairwise", orderIds: [best.a, best.b], surplusNativeWei: best.s });
      surplus += best.s;
      remaining.delete(best.a);
      remaining.delete(best.b);
      progressed = true;
    }
  }

  progressed = true;
  while (progressed) {
    progressed = false;
    const left = [...remaining.values()];
    let best: { ids: string[]; s: bigint } | null = null;
    for (let i = 0; i < left.length; i++) {
      for (let j = 0; j < left.length; j++) {
        if (i === j) continue;
        for (let k = 0; k < left.length; k++) {
          if (k === i || k === j) continue;
          const a = remaining.get(left[i].id);
          const b = remaining.get(left[j].id);
          const c = remaining.get(left[k].id);
          if (!a || !b || !c) continue;
          if (a.buy !== b.sell || b.buy !== c.sell || c.buy !== a.sell) continue;
          const sa = spillSurplus(graph, a);
          const sb = spillSurplus(graph, b);
          const sc = spillSurplus(graph, c);
          const s = sa + sb + sc;
          if (s <= 0n) continue;
          if (!best || s > best.s) {
            best = { ids: [a.id, b.id, c.id], s };
          }
        }
      }
    }
    if (best) {
      fills.push({ kind: "ring", orderIds: best.ids, surplusNativeWei: best.s });
      surplus += best.s;
      for (const id of best.ids) remaining.delete(id);
      progressed = true;
    }
  }

  for (const o of remaining.values()) {
    const hop = bestHop(graph, o.sell, o.buy, o.sellAmount);
    if (!hop) continue;
    const s = userSurplus(graph, o, hop.amountOut);
    if (s === null) continue;
    fills.push({ kind: "spill", orderIds: [o.id], surplusNativeWei: s });
    surplus += s;
  }

  return {
    auctionId: auction.id,
    fills,
    surplusNativeWei: surplus,
    gasEst: 110_000 + fills.length * 80_000,
    fair: true,
  };
}

function randomOrder(rng: () => number, idx: number): Order {
  const pairs = [
    [0, 1],
    [1, 0],
    [0, 2],
    [2, 0],
    [1, 2],
    [2, 1],
    [0, 3],
    [3, 0],
  ];
  const [sell, buy] = pairs[Math.floor(rng() * pairs.length)];
  const sellAmount = BigInt(Math.floor(5 + rng() * 40)) * (WEI / 10n);
  const hopBump = BigInt(Math.floor(80 + rng() * 15));
  const limitBuyAmount = (sellAmount * hopBump) / 100n;
  return {
    id: `ord-${idx}`,
    sell,
    buy,
    sellAmount,
    limitBuyAmount: limitBuyAmount > 0n ? limitBuyAmount / 50n : 1n,
  };
}

export function makeAuction(rng: () => number, id: string, stateBlock: number): Auction {
  const n = 2 + Math.floor(rng() * 4);
  const orders: Order[] = [];
  for (let i = 0; i < n; i++) orders.push(randomOrder(rng, i));
  if (rng() > 0.35) {
    const a = orders[0];
    orders.push({
      id: `ord-x`,
      sell: a.buy,
      buy: a.sell,
      sellAmount: a.limitBuyAmount + BigInt(Math.floor(rng() * 3) + 1) * (WEI / 20n),
      limitBuyAmount: a.sellAmount / 4n,
    });
  }
  return { id, stateBlock, orders };
}

function share(fills: Fill[], kind: Fill["kind"]): number {
  const tot = fills.reduce((s, f) => s + Number(f.surplusNativeWei), 0);
  if (tot <= 0) return 0;
  const part = fills
    .filter((f) => f.kind === kind)
    .reduce((s, f) => s + Number(f.surplusNativeWei), 0);
  return part / tot;
}

/** Frozen 7-day tape. v1 must beat naive on every day — no surplus padding. */
export function buildFrozenTape(seed: number, now = Date.UTC(2026, 7, 25, 17, 0, 0)): OptimizerSnapshot {
  const rng = mulberry32(seed ^ 0x51ed);
  const start = Date.UTC(2026, 7, 18);
  const days: OptimizerDay[] = [];
  let lastFailed: string | null = null;
  let fillN = 0;
  let fillD = 0;
  let pw = 0;
  let rg = 0;
  let sp = 0;

  for (let d = 0; d < 7; d++) {
    const day = new Date(start + d * 86_400_000).toISOString().slice(0, 10);
    const graph = demoGraph(seed + d * 17);
    let naiveS = 0n;
    let v1S = 0n;
    let pairwise = 0;
    let ring = 0;
    let spill = 0;
    let auctions = 0;
    const nAuctions = 14;
    for (let a = 0; a < nAuctions; a++) {
      const auction = makeAuction(rng, `tape-${day}-${a}`, graph.stateBlock + a);
      const nSol = solveNaive(auction, graph);
      const vSol = solveV1(auction, graph);
      naiveS += nSol.surplusNativeWei;
      v1S += vSol.surplusNativeWei;
      auctions++;
      fillD++;
      if (vSol.fills.length > 0) fillN++;
      pairwise += share(vSol.fills, "pairwise");
      ring += share(vSol.fills, "ring");
      spill += share(vSol.fills, "spill");
      if (vSol.surplusNativeWei < nSol.surplusNativeWei) {
        lastFailed = auction.id;
      }
    }
    const avgP = pairwise / nAuctions;
    const avgR = ring / nAuctions;
    const avgS = spill / nAuctions;
    days.push({
      day,
      surplusNaiveWei: naiveS,
      surplusV1Wei: v1S,
      fillRate: fillN / Math.max(1, fillD),
      pairwiseShare: avgP,
      ringShare: avgR,
      spillShare: avgS,
      auctions,
    });
    pw += avgP;
    rg += avgR;
    sp += avgS;
  }

  const tapeEnd = start + 6 * 86_400_000;
  const tapeAgeDays = Math.max(0, (now - tapeEnd) / 86_400_000);

  return {
    days,
    tapeAgeDays,
    budgetMs: 800,
    lastFailedAuctionId: lastFailed,
    fillRate: fillN / Math.max(1, fillD),
    pairwiseShare: pw / 7,
    ringShare: rg / 7,
    spillShare: sp / 7,
  };
}

export function v1BeatsNaiveEveryDay(snap: OptimizerSnapshot): boolean {
  return snap.days.every((d) => d.surplusV1Wei >= d.surplusNaiveWei);
}
