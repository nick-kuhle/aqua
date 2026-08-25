# Opportunity surface

Aqua’s job is to attach as many **real** opportunity rows as the
architecture will carry, without pretending dead rows are live.

A row is a **live candidate** when it settles atomically into a profit
token that can be valued, or when it is a mouth with a real driver, and
the executor (or foreign settlement contract) enforces the right
invariant. Eligibility is not approval. Broadcast still needs that row’s
own `PASS`.

---

## Status legend

| Tag | Meaning |
| --- | --- |
| **now** | Build in phases 0–3 |
| **next** | Types exist; implement after a kill-gate |
| **later** | Real market, not on the 90-day board |
| **watch** | Landscape may open it; no crate until a memo |
| **out** | Will not ship as a live row |

---

## Intent mouths

| Row | Tag | Trigger | Why it exists |
| --- | --- | --- | --- |
| `cow_batch` | **now** | CoW auction | Subsidized, user-opted surplus. First dollar. |
| `uniswapx_fill` | **next** | Dutch order | Same graph, filler objective, inventory. |
| `erc7683_fill` | **next** | Cross-chain intent | Exotic-route spreads still exist. |
| `fusion_fill` | **watch** | 1inch Fusion | Permissioned resolvers. After UniswapX is green. |
| `cow_crosschain` | **watch** | CoW non-EVM dest | After EVM CoW `PASS`. |

---

## Liquidation sidecar

| Row | Tag | Trigger | Why it exists |
| --- | --- | --- | --- |
| `liq_morpho` | **now** | Share-math insolvency | Long-tail markets. Best sidecar EV. |
| `liq_aave` | **now** | HF < 1 | Depth. Competitive, still real. |
| `oracle_backrun` | **now** (L1 exec / L2 observe) | Price-feed tx | Same-block vs one-block-late. |
| `liq_compound` | **later** | `isLiquidatable` | Two-step storefront. Port when v1 prints. |
| `liq_maker` | **later** | vat unsafe | Bark + atomic clip take. Discovery is ugly; math is exact. |
| `liq_spark` / fork-Aaves | **watch** | Same as Aave | Address-profile only if TVL justifies. |
| `liq_morpho_base` | **next** | Same as Morpho | Register Base addresses after ETH evidence. |

---

## Graph / backrun

| Row | Tag | Trigger | Why it exists |
| --- | --- | --- | --- |
| `atomic_arb` | **now** (sim), **next** (live on L2) | New head / large swap | Solver spill uses the same search. Standalone live on Base after Flashblocks. |
| `flashblock_backrun` | **next** | Preconfirmed state | Searcher tx only, pinned `state_id`. |
| `mevshare_backrun` | **later** | MEV-Share hint with enough data | Privacy hints; most are redacted. |
| `cex_dex_arb` | **watch** | CEX vs DEX | Inventory + custody. Different company unless the book already exists for Mouth B. |

`atomic_arb` search: WETH-anchored simple cycles, max length 3, pool cap,
wall-clock budget, no RPC inside the search. Capital: Balancer flash
loan. V3 legs via QuoterV2 edges, never a V2 approximation of V3.

---

## Out of scope (rows we will not live-arm)

| Row | Why out |
| --- | --- |
| Public-mempool sandwich (front · victim · back) | Structurally dead for a new independent searcher: shrinking public flow, builder-integrated competition, 90% bribes, extractive. Architecture does not construct this strategy. |
| JIT liquidity as revenue | Settlement/tick-crossing limitations. Not rescued by soak data. |
| Directional new-token sniper | Worst case is the entire buy. Breaks profit-or-revert. Not in this repo. |
| Solana searcher | Different engine. Console may one day multiplex; this binary will not. |

If someone asks for sandwiches, the answer is this table, not a flag.

---

## Funnel hygiene

V2 and V3 graph legs are **not** separate opportunity rows; they are
edges. Liquidation protocols **are** separate rows (different victims,
bonuses, revert modes). Mouths **are** separate rows.

`candidatesEmitted / invocationsWithOutput` is search width.
`submittable / candidatesEmitted` is conversion. Do not blend Mouth A
with Morpho and call it “Aqua APY.”

---

## Adding a row

See [`ADDING.md`](ADDING.md). Minimum: enum variant, boot toggle,
construct only if the profile can support it, funnel counters, console
empty-state copy, `live_candidate` / `shadow_only_reason`, qualification
row, tests for a happy path and a reject path.

A row that runs on every pending transaction is profiled before merge.
The pending path is the hot path.
