# Aqua research brief — Web3, intents, solver markets, and liquidation engines

**Research cut:** 25 August 2026 (America/Los_Angeles). **Purpose:** decision
input for Aqua, not investment advice. External facts are volatile; verify
addresses, APIs, incentives, and legal obligations immediately before use.
Every external claim below carries a source link and the date it was read.

## Executive conclusion

Aqua should not try to be a generic MEV bot. The investable wedge is a
**risk-bounded, multi-venue execution engine** with two independent products:

1. **User-opted intent solving:** compete on user surplus or fill quality where
   the protocol defines the auction and the user has signed constraints.
2. **Liquidation execution:** monitor solvency, price collateral conservatively,
   and compete only where the complete transaction is profitable after gas,
   financing, slippage, builder payment, auction payment, and failure risk.

The durable moat is not a router. It is replayable state, fast and correct
simulation, route-specific inventory, execution reliability, protocol
qualification, and realized markout data. Keep the two businesses separate in
risk, keys, nonces, accounting, and qualification.

### What changed between the 2025 assumptions and August 2026

Five structural changes invalidate parts of a 2024–2025 searcher design. Each
one has a direct consequence for Aqua and is expanded below.

| # | 2026 reality | Consequence for Aqua |
| --- | --- | --- |
| 1 | Oracle-triggered liquidation value on major venues is increasingly **auctioned by the protocol** (Chainlink SVR + Atlas, Aave), not won by a public gas race. | `oracle_backrun` is a **bid-into-an-auction** strategy on SVR-covered feeds, not a mempool race. Model the auction payment as a cost line. |
| 2 | Ethereum bundle delivery is moving to **TEE-based, refund-paying block building** (BuilderNet/rbuilder), with explicit refund and bundle-merge semantics. | Transport must record refund terms (`refundPercent`, `refundRecipient`, `droppingTxHashes`) and treat refunds as receivable revenue reconciled from finalized data, never assumed. |
| 3 | **Aave v4** (Ethereum, 30 Mar 2026; Avalanche, 15 Jul 2026) replaced fixed close factors with **target-health-factor** repayment and a **health-scaled variable bonus**, plus dust-clearance rules. | An Aave v3 close-factor adapter is *wrong* against v4. v4 is a separate capability, separate math, separate fixtures, separate qualification row. |
| 4 | **Morpho** now spans Blue (isolated, LLTV) and V2/Midnight (intent-based fixed-rate, fixed-term, curator-priced, cross-chain callbacks). | Morpho is two unrelated liquidation surfaces. Blue-only share math must not be pointed at a V2 term loan. |
| 5 | **CoW CIP-67 fair combinatorial auctions** score *per directed token pair* and filter unfair batches; consistency rewards since 30 June 2026 combine **bid quality × settlement success**. | The optimizer objective is per-pair competitiveness plus revert avoidance, not batch size. Reverting is doubly punished (missing score + consistency). |

## 1. Market model

### Intents are outcome constraints, not transactions

An intent says what must be true (assets, minimum output, recipient, deadline,
fee and privacy constraints); the solver chooses how. This moves path finding,
liquidity sourcing, gas sponsorship, and some MEV competition into an auction.
It improves UX and can reduce public-mempool exposure, but it does **not** make
execution trustless by itself: the user still depends on settlement contracts,
solver capital, relayers, bridges, or attestors.

Relevant production patterns:

| Pattern | Example | Strength | Aqua implication |
| --- | --- | --- | --- |
| Batch auction / combinatorial matching | CoW Protocol | Netting, coincidence of wants, per-pair fairness filter | Build a deterministic solver and a *fairness pre-check*; optimize settlement reliability before latency |
| Dutch / exclusive auction | UniswapX | Simple filler market and route flexibility | Model decay time, inventory, adverse selection, chain-specific auction rules |
| Resolver / RFQ | 1inch Fusion | Gasless execution and private liquidity | Treat resolver eligibility and order API as external capability data |
| Cross-chain filler | Across, Eco, LI.FI, UniswapX cross-chain, ERC-7683/OIF | Solver fronts destination liquidity | Price bridge/finality/refund/credit risk; ERC-7683 is an interface, not a bridge |
| Intent-based **credit** | Morpho V2 / Midnight | Fixed-rate, fixed-term matching by curator offers | A *different* product from swap solving; research only, no adapter in v1 |

ERC-7683 was ratified in early 2025 and, by 2026, is implemented in production
by Across, UniswapX, Eco and (since February 2026) a CoW adapter, with the
Ethereum Foundation's Open Intents Framework as shared reference tooling
backed by 30+ teams.[^7683][^oif] The practical effect for solvers is that a
single inventory pool can quote several venues because the order struct is
shared — which also means **competition converges and spreads tighten**. Do not
model a cross-chain fill as a private niche.

[^7683]: EIP-7683 <https://eips.ethereum.org/EIPS/eip-7683>; adoption status
    read 25 Aug 2026 at <https://eco.com/support/en/articles/14799834-erc-7683-cross-chain-intents-standard-explained>.
[^oif]: Open Intents Framework overview, read 25 Aug 2026:
    <https://www.gate.com/learn/articles/ethereum-s-new-open-intents-framework/8051>.

### CoW: what the 2026 auction actually rewards

CoW's current mechanism is a **fair combinatorial auction** (CIP-67). Solutions
are bids; the protocol first computes the best bid on each *directed token
pair* as a reference outcome, filters batched bids that are worse than that
reference on any pair, and then chooses the combination of surviving bids that
maximizes total score. Payment follows a VCG-style rule:

```text
payment = cap( totalScore − referenceScore_i − missingScore_i )
```

where `missingScore_i` is the score of the winning solutions of solver `i`
that **reverted on-chain**. Negative results are paid *by* the solver.[^cip67]

Since **30 June 2026** the consistency budget is shared in proportion to a
metric combining **bid quality** (share of proposed surplus on each executed
order, only counting solutions that survived fairness filtering) and
**settlement success rate**.[^cowrewards] CIP-72 additionally requires that a
quote-reward-earning solver also bid a matching amount in the competition.

Engineering conclusions, which are normative for [`OPTIMIZER.md`](OPTIMIZER.md):

1. Score must be **cost-adjusted**: report surplus net of expected gas and
   expected revert loss. Truthful cost-adjusted bidding is near-optimal while
   the reward cap is not binding; overbidding is a slashable social rule
   violation, not a clever strategy.
2. A batched solution that is worse than the single-pair reference on *any*
   pair is discarded entirely. Aqua must compute its own per-pair reference
   from baseline liquidity and **self-filter before submitting**.
3. Revert risk is priced twice (missing score + consistency metric). Settlement
   reliability is the product, not throughput.
4. Uniform directional clearing prices, no surplus shifting between orders
   sharing a token, no score inflation, and legitimate-only buffer use are
   competition rules with slashing exposure.[^cowrules]

Onboarding remains: local → shadow → (KYC if joining the CoW DAO bonding pool)
→ staging (barn) → production, with driver and submission keys managed by the
CoW team for DAO-pool solvers, and per-chain enablement requiring a rewards
address and endpoints per network.[^cowonboard] Aqua's chain-first decision
stays **evidence-driven**, taken from current written terms, not from this doc.

[^cip67]: Competition rules <https://docs.cow.fi/cow-protocol/reference/core/auctions/competition-rules> (read 25 Aug 2026).
[^cowrewards]: Solver rewards <https://docs.cow.fi/cow-protocol/reference/core/auctions/rewards> (read 25 Aug 2026).
[^cowrules]: CIP-11/CIP-13 rules summarized in the competition-rules page above.
[^cowonboard]: Solver onboarding <https://docs.cow.fi/cow-protocol/tutorials/solvers/onboard> (read 25 Aug 2026).

### Modern MEV competition and transport

Competition is private, specialized, and builder/sequencer-aware. A private
transaction is not a guarantee of inclusion, atomicity, or zero cost.

**BuilderNet** is the important 2026 change for an independent searcher.
Flashbots retired its centralized builders and migrated orderflow and refunds
to BuilderNet: multiple operators run the same open-source `rbuilder` inside
Intel TDX TEEs, share orderflow over P2P, and distribute **refunds by marginal
contribution** using a published rule. Refund eligibility is restricted to
privately submitted transactions/bundles; a bundle containing only public
mempool transactions is not eligible, and bundles from the same signer are
merged as non-competitive.[^bnet][^bnetdeep] The `eth_sendBundle` surface
carries `refundPercent` (1–99), `refundRecipient`, and `droppingTxHashes`
(transactions the builder may drop — but not revert — to merge OFA
backruns).[^bnet13]

Engineering conclusions:

- Transport is a policy object with fields: endpoint identity, auth, target
  block/range, privacy class, cancellation/replacement semantics, refund terms,
  simulation response, inclusion/rejection reason. `bundle: true` is banned.
- Refunds are **receivable, not revenue**. Persist expected refund, then
  reconcile against finalized on-chain payout transactions before it enters
  realized P/L.
- `droppingTxHashes` changes atomicity assumptions: a merged bundle may land
  without a transaction you assumed present. Only set it where the candidate is
  still correct if that transaction is absent.
- Multi-builder submission must be modeled per endpoint with independent
  reconciliation; two endpoints landing the same nonce is a safety incident,
  not a duplicate log line.

On L2s, sequencer-specific ordering dominates. **Base Flashblocks** are 200 ms
preconfirmations streamed by the sequencer (live since mid-2025); they are a
*hint*, not a block, and require a Flashblocks-aware endpoint.[^flash]
**Arbitrum Timeboost** is a sealed-bid, second-price auction for a 200 ms
express lane, live since April 2025 and used by a material share of Arbitrum
DEX volume.[^timeboost] These are three different transports with three
different guarantees; none is an alias of an Ethereum bundle.

**BSC/PoSA-style chains** concentrate flow in a whitelisted builder set with
direct validator relationships and private RPC channels; measurement work in
2026 attributes the large majority of profitable arbitrage flow to those
private channels.[^bsc] Aqua's exclusion of BNB-style latency racing is an
economic decision, not a gap.

[^bnet]: BuilderNet introduction <https://buildernet.org/blog/introducing-buildernet>; migration note <https://writings.flashbots.net/migrating-to-buildernet>.
[^bnetdeep]: Refund rule / architecture walkthrough, read 25 Aug 2026: <https://bytenoob.io/2026-02-12-block-builder-buildernet-1.html>.
[^bnet13]: BuilderNet v1.3 API <https://buildernet.org/blog/2025/04/28/buildernet-v1.3>.
[^flash]: Base docs <https://docs.base.org/base-chain/flashblocks/app-integration>; lifecycle summary <https://chainstack.com/base-transaction-lifecycle-sequencer-finality-rpc/> (read 25 Aug 2026).
[^timeboost]: <https://www.theblock.co/post/361058/arbitrum-timeboost-fees> (read 25 Aug 2026).
[^bsc]: "MEV in Binance Builder", arXiv 2602.15395 (read 25 Aug 2026).

## 2. Liquidation-engine model

A production liquidation engine is a pipeline, not a bot loop:

```text
state/log ingest → candidate index → solvency calculation → conservative valuation
→ route/financing search → exact fork simulation → auction/transport policy
→ fenced submission → receipt/finality/reorg reconciliation → realized P/L
```

The key distinctions are:

- **Trigger:** Aave v3 health factor, **Aave v4 target-health-factor**, Morpho
  Blue LLTV, Morpho V2 term/maturity state, Compound absorbability, Maker
  auction state, or a protocol-specific oracle update.
- **Reward:** liquidation bonus/incentive (fixed in v3, **health-scaled in
  v4**), seized collateral discount, protocol fee, minus any OEV auction
  payment.
- **Capital:** own inventory, flash liquidity, or solver credit. Flash liquidity
  removes principal but never removes gas, callback, slippage, or revert risk.
- **Valuation:** collateral is not cash. Use executable routes, depth limits,
  conservative haircuts, and token-behavior policy — not a display oracle.
- **Competition:** first eligible fill, same-block oracle backrun, **protocol-run
  OEV auction**, or private auction. The strategy must name which.

### Aave v4 changes the math, not just the addresses

Aave v4 launched on Ethereum mainnet 30 March 2026 with a Hub & Spoke
architecture — a Liquidity Hub per network holding liquidity and accounting,
and Spokes as isolated borrow markets with their own parameters, oracles, and
liquidation rules — and expanded to Avalanche on 15 July 2026.[^aavev4][^aavechangelog]
Liquidation semantics differ from v3 in three ways that break a v3 adapter:

1. **Target Health Factor.** Liquidators repay only enough debt to restore the
   position to a Spoke-level target HF; there is no fixed close factor. Max
   repayable debt is a *function of the position and the Spoke's target*, and
   must be computed, not assumed.
2. **Variable liquidation bonus.** The bonus scales with how far the health
   factor has fallen — a Dutch-auction-shaped incentive. Profitability is
   time/price dependent, so the candidate's expected bonus must be recomputed
   at the pinned state, never cached from discovery.
3. **Dust prevention.** If remaining debt or collateral would fall below a
   USD-denominated floor (~$1,000 at launch), the liquidator must fully clear
   the position — which changes required capital and route depth.

Aave v3 remains the larger TVL surface during migration, so **both** are needed
and they are different registry capabilities: `aave_v3_pool` and
`aave_v4_spoke` / `aave_v4_hub`. Spoke-level parameters may also be adjusted
by a Risk Steward contract within governance bounds — meaning parameters can
change without a governance vote, so parameter reads must be pinned and
re-read, never cached across blocks.

[^aavev4]: Aave v4 docs <https://aave.com/docs/aave-v4> (read 25 Aug 2026).
[^aavechangelog]: Aave changelog <https://aave.com/docs/resources/changelog> (read 25 Aug 2026).

### Morpho is now two surfaces

- **Morpho Blue**: isolated markets, one collateral / one loan asset, immutable
  parameters, LLTV-triggered liquidation at oracle price, market-specific share
  math and a liquidation callback path.
- **Morpho V2 / Midnight**: intent-based fixed-rate, fixed-term credit with
  curator-published offers, multi-asset collateral, and cross-chain settlement
  via curator-specified callbacks. Midnight went live on Base with cbBTC/USDC
  across maturities in July 2026.[^morphov2][^midnight]

Default-off for V2/Midnight in Aqua v1: maturity/term default handling,
multi-asset collateral valuation, and curator-defined callbacks are each a
separate risk memo. Blue is the only Morpho capability eligible for the first
simulation-only sidecar.

[^morphov2]: Morpho V2 architecture summary <https://oakresearch.io/en/analyses/innovations/morpho-v2-intent-based-platform-power-on-chain-lending> (read 25 Aug 2026).
[^midnight]: Morpho Midnight on Base, July 2026, read 25 Aug 2026: <https://www.cryptobreaking.com/morpho-introduces-fixed-rate-lending/>.

### OEV is now largely an auction you pay into

This is the single biggest correction to a 2025-era liquidation plan.

Chainlink **SVR** (Smart Value Recapture) routes a feed update through a
private flow where searchers bid for the exclusive right to backrun it; the
winning bid is recaptured by the protocol rather than paid to validators. It
went live with Aave on Ethereum in March 2025. Through early February 2026 it
had handled roughly **$675m of liquidations across ~3,900 events, recapturing
about $16m**, split 65% Aave / 35% Chainlink, at an average recapture rate
reported near 73% of non-toxic liquidation MEV; weekly SVR revenue in mid-2026
was reported in the millions, ~92% of it from Aave.[^svraave][^svrrev] In
January 2026 Chainlink acquired **Atlas** as the transaction-ordering/auction
layer for SVR, bundling the oracle update and the liquidation into a single
atomic operation.[^atlas]

What this means concretely:

- On an SVR-covered feed/market, **there is no gas race to win**. There is an
  auction to bid into, and the expected margin is roughly
  `bonus − route cost − gas − winning bid`. A recapture rate near 70% means the
  searcher's residual share is thin and competitive.
- The auction is an **external capability with its own endpoint, auth, bid
  semantics, and settlement guarantee**. It is a distinct `Transport`
  implementation with its own qualification row — not a flag on a bundle.
- Feeds move in and out of SVR coverage per asset and per market. Coverage is
  **registry data with a revalidation date**, and an unknown coverage state
  must disable the oracle-backrun capability for that market.
- Non-SVR feeds, non-SVR markets, Morpho Blue markets with independent oracles,
  and long-tail deployments are where an unauctioned edge can still exist — and
  are exactly the places where oracle quality is worst. Measure before arming.

[^svraave]: Aave, "How Aave Liquidations Perform Under Volatile Conditions" <https://aave.com/blog/historical-liquidations> (read 25 Aug 2026).
[^svrrev]: SVR revenue reporting, July 2026, read 25 Aug 2026: <https://pluang.com/en/news-feed/chainlink-svr-hasilkan-pendapatan-4juta-tahun-ini-12juta>.
[^atlas]: <https://www.theblock.co/post/386743/chainlink-acquires-transaction-ordering-solution-atlas-accelerating-rollout-of-its-non-toxic-mev-tool> (read 25 Aug 2026).

## 3. 25 August 2026 risk lessons

A reported Morpho PT-reUSD incident on 25 August 2026 attributed roughly
$36.4m of liquidations to a short-horizon TWAP and thin PT/YT liquidity. Treat
this as a timely risk signal pending primary post-mortem confirmation, not as a
stable protocol fact. The engineering lesson is independent of the headline:
short TWAPs, yield-token inverse pricing, high leverage, and concentrated
liquidity can turn a modest manipulation into a large liquidation cascade.

A separate March 2026 Aave CAPO configuration incident reportedly caused tens
of millions of dollars of wstETH liquidations without protocol bad debt. Again,
regardless of final figures, configuration and snapshot/timestamp consistency
must be tested like code. A correct oracle algorithm with an incorrect parameter
is still an unsafe liquidation input.

Required controls: multi-source or bounded prices where feasible, stale/deviation
checks, circuit breakers, per-market caps, oracle/config snapshot consistency,
shadow detection, independent-provider comparison, and compensation/incident
records for incorrect liquidations.

## 4. Simulation: the 2026 performance baseline

Simulation correctness is non-negotiable; simulation *cost* decides how many
candidates can be evaluated per block. Published Rust benchmarks comparing
`eth_call`, Anvil, and in-process `revm` on the same workload show roughly:
100 sequential `eth_call`s ≈ 89 ms against a local node and ≈ 4.4 s against a
third-party provider; Anvil ≈ 120 ms / 868 ms; in-process `revm` ≈ 80 ms /
1010 ms; and `revm` with a warm state cache plus a purpose-built quoter
contract ≈ 19 ms / 405 ms — a ~10× reduction in both latency and RPC
calls.[^revm] Foundry/Anvil and Reth are themselves `revm` consumers.

Aqua's decision, normative for [`ALLOY.md`](ALLOY.md) and W4:

- **Anvil stays the audit/authority backend.** It is the reference the exact
  signed payload must pass, and it is what a reviewer can reproduce by hand.
- **An in-process `revm` backend is added behind the same `Simulator` trait**
  as the *screening* backend, with a mandatory differential test: for a
  committed fixture corpus, `revm` and Anvil must agree on revert status, gas,
  and every balance delta, or the candidate is rejected and an alarm fires.
- A candidate may never reach a send-capable interface on `revm` evidence
  alone; the authority backend result is what is persisted as simulation
  evidence.
- Reth **ExEx** is the recorded long-term ingestion option (post-execution
  hooks, reorg-aware, no polling) but is a W10 concern, not v1.

[^revm]: <https://hotpath.rs/blog/revm-alloy-anvil-arbitrage> (methodology and
    numbers read 25 Aug 2026; treat as order-of-magnitude, re-benchmark on
    Aqua's own hardware before quoting).

## 5. Recommended Aqua positioning and economics

### Initial wedge

- One EVM chain cell at a time; Ethereum L1 is the best first liquidation test
  because ordering, bundle semantics, and SVR auction behavior are observable,
  while one low-complexity L2 may be the best first intent test if the
  counterparty supports it.
- CoW shadow solving is the first intent experiment because it has a defined
  fairness/auction objective and does not require Aqua to own a market-making
  book.
- Morpho **Blue** and Aave **v3** are the first simulation-only sidecars; Aave
  **v4** is a fast-follow with its own math and fixtures because that is where
  liquidity is migrating.
- UniswapX and cross-chain fills come later because they require inventory,
  adverse-selection measurement, and route-specific credit/finality controls.

### Unit economics that must be recorded

For every candidate, persist:

```text
gross user/protocol surplus or liquidation incentive
− AMM price impact and fees
− gas and priority fee
− builder/sequencer payment
− OEV/express-lane auction bid paid
− flash-loan fee and financing cost
− expected revert / inclusion / reorg loss
− inventory opportunity cost and adverse markout
− protocol/solver fees
+ expected transport refund (receivable; excluded from realized P/L until
  reconciled against a finalized payout)
= conservative expected net profit
```

Do not use token reward schedules, estimated oracle prices, or simulated balance
deltas as realized P/L. Report expected, submitted, included, finalized, and
reconciled values separately.

## 6. Architecture decisions this research supports

1. Keep `optimizer` pure and deterministic; providers, clocks, keys, and
   transports live outside it.
2. Make `Mouth`, `Strategy`, `ChainProfile`, `Transport`, and `RiskRow` closed
   capability enums until their tests and registry evidence exist.
3. Give every candidate a state hash, registry digest, payload hash, artifact
   hash, signer/lane, deadline, and idempotency key.
4. Add a `valuation_confidence`/haircut and an `oracle_provenance` record; a
   number without provenance cannot clear a live gate.
5. Make transport selection a policy decision carrying refund, privacy,
   cancellation and auction-payment semantics — not a `bundle: true` boolean.
6. Measure solver quality by user surplus **per directed token pair**, fairness
   survival, settlement success, and realized markout — not quote count.
7. Prefer market isolation and hard caps over a global risk budget for
   liquidation lanes; one bad oracle must not pause every product.
8. Model protocol-run OEV auctions as a first-class competitor and cost line,
   not as an obstacle to route around.
9. Two-tier simulation (`revm` screen, Anvil authority) with a differential
   test gate; never one backend claiming both roles.

## 7. Research backlog

- Obtain current written CoW onboarding, driver, bond, chain, and reward terms,
  including which chains a DAO-pool solver can be enabled on today.
- Obtain the current SVR/Atlas searcher-side auction interface, auth model, bid
  mechanics, per-feed coverage list, and settlement guarantee in writing.
- Verify BuilderNet refund-rule version, eligibility, and dashboard/API surface
  before treating refunds as receivable.
- Verify Aave v4 Spoke parameter surface, target-HF math, and Risk Steward
  bounds directly against deployed ABIs at a pinned block.
- Verify Morpho Blue liquidation share math and callback semantics against the
  deployed contracts, and scope V2/Midnight separately.
- Verify ERC-7683 settlement, filler reimbursement and refund timing per
  implementer before any cross-chain adapter proposal.
- Benchmark `revm` vs Anvil parity and throughput on Aqua's own fixture corpus.

## 8. What would invalidate this brief

- SVR/Atlas coverage expands to substantially all major lending feeds, or the
  recapture rate rises further: the oracle-backrun row's expected value goes to
  approximately zero and should be retired rather than optimized.
- BuilderNet refund rules change eligibility or Sybil constraints: recompute
  transport selection and stop booking refunds as receivable.
- Aave v4 migration completes: v3 becomes the legacy row and should be
  de-prioritized, not maintained at parity.
- CoW replaces the CIP-67 fairness filter or the consistency metric: the
  optimizer objective in [`OPTIMIZER.md`](OPTIMIZER.md) needs a dated rewrite.
- A credible, permissionless, unbonded, still-paid solver path appears on a
  chain Aqua supports: re-rank the intent wedge.

Write the date on every edit to this file.
