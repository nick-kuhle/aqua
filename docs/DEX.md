# DEX graph

Strategies do not know which AMM they are trading. They consume `Edge`s.
New venues are pricing modules, not new strategies.

---

## Edge

Each directed edge exposes:

- venue and pool identity
- token in / out
- state identity / block
- exact quote for an input
- conservative gas estimate
- calldata builder for `AquaExecutor`
- flags: volatile / stable / concentrated

V2 is an adapter over reserves and `getAmountOut` (integer, rounds down,
matches the pair). V3 is **not** a V2 approximation. V3 quotes go through
QuoterV2 or a proven tick-state implementation pinned to the same block.

A V3 pool in the V2 cache would be priced by constant-product math, look
plausible, be wrong, and pass every downstream gate. The caches are
separate on purpose.

---

## Discovery

- V2: `PairCreated` from each factory on the chain profile, cursor-safe,
  bounded overlapping scans, shared log decode.
- V3: `PoolCreated` into `V3PoolCache`.
- Refresh: cooldown `POOL_DISCOVERY_INTERVAL_BLOCKS` (default 1). A
  rewind always re-runs. Skipped blocks widen the next log window; they
  do not drop pools.

Core tokens (non-WETH) from the profile stay loaded on every registered
V2 venue so the block-cadence arb and the solver spill have a base graph
before discovery catches up.

---

## Search

WETH-anchored simple cycles, each pool at most once, max length
`ARB_MAX_CYCLE_LEN` (default 3). Optimal input by ternary search over
composed **integer** curves, which are unimodal for V2 and for the
composed V2-style spill. If an edge’s profit curve is not unimodal, do
not ternary-search it.

Budgets (config, not comments):

- `ARB_ENUMERATION_BUDGET_MS` (historical 25 ms for per-block arb)
- `ARB_MAX_POOLS` (historical 200)
- `OPT_BUDGET_MS` for solver spill (seconds, auction-shaped)

The search makes no RPC. Quotes for V3 edges in the snapshot were taken
when the snapshot was built.

Cycles that never touch WETH are skipped: profit would be in a token the
gas model cannot price. Any cycle that *touches* WETH can be rotated to
start there.

---

## v1 venues

| Venue | Chains | Quote | Calldata |
| --- | --- | --- | --- |
| Uniswap V2 / clones | ETH, Base, BNB as deployed | integer CPMM | pair `swap` |
| Sushi V2 | ETH | same | same |
| Uniswap V3 | ETH, Base, BNB as deployed | QuoterV2 | SwapRouter02 / pool |

Balancer V2 is a **flash-loan source**, not a v1 swap edge.

---

## Next venues (flags default off)

| Venue | Flag | Gate to flip |
| --- | --- | --- |
| Aerodrome volatile | `DEX_AERODROME_VOLATILE` | Live fee location verified; fork parity at boundaries |
| Aerodrome stable | `DEX_AERODROME_STABLE` | Iterative stable math ≤ 1 wei vs chain; soak |
| Curve stableswap | `DEX_CURVE` | Reference math + fork tests |
| Balancer weighted | `DEX_BALANCER_SWAP` | Separate from the vault flash-loan path |
| Uni V4 hooked pools | `DEX_UNIV4` | Only pools whose hook is in an allowlist we understand |

Do not register an AMM as “V2-compatible” unless fee location, reserve
accounting, discovery, and calldata are verified. Wrong fees look like
edge.

---

## Footguns

- No `f64` on settlement quotes.
- No ternary search over QuoterV2 (RPC storm). Snapshot, then search.
- No `sol!` ABI change without checking the 4-byte selector against
  chain bytecode.
- Graph width is a budget. Raising `ARB_MAX_CYCLE_LEN` to 5 because
  “more opportunities” is how the pending path blows 150 ms.
