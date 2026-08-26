# Liquidation sidecar

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The sidecar is an independent liquidation product; it may be researched while Mouth A is in
shadow, but it never inherits Mouth A qualification, capital, signer, nonce, or risk budget. It does not wait on KYC, auctions, or inventory.

It is **not** a second engine. It shares `AquaExecutor`, the anvil fork,
the DEX graph, valuation, risk *parameters*, storage, and the console. It
will have its own signer, nonce lane, smoke budget, drawdown, and
qualification rows.

Isolation pattern: the same polarity as any lane whose failure mode must
not contaminate solver submissions.

---

## Current-market correction — 25 August 2026

### The OEV race has largely become an OEV auction

This is the most important correction to the original sidecar plan. On
SVR-covered Chainlink feeds, the right to backrun a price update is **auctioned
by the protocol** through Chainlink SVR and the Atlas ordering layer, and the
winning bid is recaptured by the lending protocol. Aave has run SVR on Ethereum
since March 2025; through early February 2026 it covered roughly $675m of
liquidations across ~3,900 events and recaptured about $16m, with a reported
average recapture rate near 73% of non-toxic liquidation MEV. See
[`RESEARCH_2026.md`](RESEARCH_2026.md) §2 for sources.

Consequences, all normative:

- On a covered feed there is **no gas race to win**. Expected margin is
  `bonus − route cost − gas − winning auction bid`, and a ~70% recapture rate
  means the residual is thin. A row that assumes a free bonus is mispriced.
- SVR/Atlas participation is a distinct `Transport` with its own endpoint,
  auth, bid semantics and settlement guarantee. It is **not** a flag on a
  bundle and it does not inherit bundle qualification. See
  [`TRANSPORT.md`](TRANSPORT.md).
- **Per-feed, per-market SVR coverage is registry data** with a revalidation
  date. `svr_coverage: covered | uncovered | unknown` is required on every
  oracle-bearing capability, and `unknown` disables `oracle_backrun` for that
  market. Coverage changes as assets are onboarded.
- The remaining unauctioned edge is in uncovered feeds, Morpho Blue markets
  with independent oracles, and long-tail deployments — which is precisely
  where oracle quality is worst. Measure before arming; do not assume the
  absence of an auction implies an opportunity.

### Valuation provenance

Liquidation eligibility is not sufficient evidence of safe valuation. Add an
explicit `OracleProvenance` record to every candidate: source(s), decimals,
round/timestamp or block, deviation/staleness checks, configuration snapshot,
haircut, and executable exit route. Markets with PT/YT, rebasing, fee-on-transfer,
ERC-777, thin pools, or short TWAPs default to disabled until dedicated fixtures
and manipulation tests exist.

The reported 25 August 2026 Morpho PT-reUSD event is a cautionary incident
report, not a primary-source protocol fact. Its lesson—short TWAPs plus thin
liquidity and leverage can cascade—must be enforced by controls, not by a
headline-based parameter. Likewise, an oracle/config snapshot mismatch can
create incorrect liquidations even when the oracle algorithm is healthy.

## v1 rows

| Row | Protocol | Trigger | Reward shape | Capital |
| --- | --- | --- | --- | --- |
| `liq_morpho_blue` | Morpho Blue | `maxBorrow < borrowed` (share math, virtual shares) | LLTV-proportional incentive, cap 15% | Flash loan of the loan token |
| `liq_aave_v3` | Aave v3 | `healthFactor < 1e18` | Per-reserve liquidation bonus, close-factor bounded | Flash loan of the debt asset |
| `liq_aave_v4` | Aave v4 Spoke | `healthFactor < 1e18` on a Spoke | **Health-scaled variable bonus**, repay to **target HF**, dust rule | Flash loan of the debt asset |
| `oracle_backrun_uncovered` | Uncovered Chainlink / Maker OSM | Pending `transmit` / `poke` matching a near-miss lead | Same as the owning protocol, one block earlier | Same as the rebuilt lead |
| `oev_auction_svr` | SVR-covered feed | Auction round for a covered feed/market | Bonus **minus winning bid** | Same as the rebuilt lead |

`liq_aave_v3` and `liq_aave_v4` are **separate rows with separate math,
fixtures, capabilities and qualification**. v4 is not a version bump of the v3
adapter and must never share its close-factor code path.

`oracle_backrun_uncovered` and `oev_auction_svr` are separate rows because they
have different competitors, different transports, different cost structures and
different failure modes. A `PASS` on one grants nothing to the other.

**Why Morpho is the gap.** Permissionless markets, long-tail collateral,
less saturation than Aave’s core list. Incentive is smaller on high-LLTV
markets (~2.6% at 0.915) and larger on the dangerous ones. Price the
tail; do not fight for ETH-USDC.

**Why Aave still ships.** Depth. When a large position flips, the bonus
is real. Expect company — and on Ethereum core markets, expect that company to
be bidding in an SVR auction rather than racing gas.

**Why v4 matters even though v3 is bigger today.** Aave v4 launched on Ethereum
mainnet 30 March 2026 and on Avalanche 15 July 2026, and liquidity is migrating
into Spokes. Building only a v3 adapter buys a shrinking surface.

---

## Aave v4 (Hub & Spoke)

**Status:** simulation-only row, fast-follow after `liq_aave_v3` has fixtures.

v4 splits the protocol into a per-network **Liquidity Hub** (liquidity and
system-wide accounting, per-Spoke credit/debit lines) and **Spokes** (isolated
borrow markets with their own collateral list, risk parameters, oracle wiring
and liquidation rules). Three behaviours break any v3 code reuse:

1. **Target Health Factor replaces the close factor.** A liquidator may repay
   only the minimum debt required to restore the position to the Spoke's
   configured target HF. Maximum repayable debt is a computed function of the
   position and the Spoke config — never a 50%/100% constant. Compute it, then
   let the fork confirm it.
2. **Variable liquidation bonus.** The bonus scales up as health factor falls,
   Dutch-auction style. Expected reward is therefore a function of the health
   factor *at the pinned execution state*, not at discovery. Recompute at the
   pinned block; a cached bonus is a rejection reason, not an optimization.
3. **Dust prevention.** If the remaining debt or collateral after a partial
   liquidation would fall below the configured USD floor (~$1,000 at launch),
   the position must be fully cleared. This changes required flash-loan size
   and route depth, so it is an input to sizing, not a post-check.

Additional v4-specific requirements:

- Spoke parameters may be adjusted by a **Risk Steward** contract within
  governance-set bounds, i.e. without a governance vote. Parameters must be
  read at the pinned block for every candidate and may never be cached across
  blocks. A parameter read that disagrees between independent providers halts
  the row.
- Registry capabilities are `aave_v4_hub` and `aave_v4_spoke`, one entry per
  deployed Spoke. There is no "Aave v4" blanket capability and no "all chains"
  assumption.
- Fixtures must cover: target-HF repayment sizing at several health factors,
  bonus at the low/high ends of the scale, the dust-clearance boundary on both
  sides, a Spoke parameter change between discovery and execution, and a
  competing liquidator restoring HF before inclusion.

---

## Morpho

Discovery: activity logs (`Supply`, `SupplyCollateral`, `Borrow` — both
current and pre-v1.1 `Borrow` signatures, OR’d). `idToMarketParams`.
Whitelist markets the swap leg can price (stable loans against
ETH/BTC/LST collateral to start). Caps: `MORPHO_MARKET_CAP`,
`MORPHO_BORROWER_CAP`.

Health: `borrowed = ceil(shares · (tba+1) / (tbs+1e6))`,
`maxBorrow = collateral · price/1e36 · lltv`. Two batched reads plus one
oracle `price()` per market.

Shape:

```
flash loan token → approve Blue
  → liquidate(params, borrower, 0, borrowShares, "")
  → swap seized collateral → repay
```

Full close, repay-by-shares. The deployed singleton’s `liquidate` takes
market params, not an `id`. Selectors verified against bytecode before
the row is allowed to construct.

Not v1: partial liquidations sized to pool depth; MetaMorpho; oracles
that need historical rounds.

### Morpho V2 / Midnight is a different protocol, not a newer Morpho

Morpho now spans two unrelated surfaces. **Blue** is the isolated-market,
LLTV-triggered, immutable-parameter design described above and is the only
Morpho capability in scope for v1. **Morpho V2 / Midnight** is intent-based
fixed-rate, fixed-term credit: curator-published offers, multi-asset
collateral, maturity/term semantics, and cross-chain settlement through
curator-specified callbacks (live on Base with cbBTC/USDC across maturities
since July 2026).

`liq_morpho_v2` is **not** a roadmap item. It is a separate proposal requiring
its own risk memo covering term/maturity default handling, multi-asset
collateral valuation, curator callback trust, and cross-chain settlement
finality. Pointing Blue share math at a V2 term loan is a correctness bug that
the type system must prevent: the two are distinct registry capabilities
(`morpho_blue`, `morpho_v2_market`) and distinct `Strategy` variants.

---

## Aave v3

Discovery: `Borrow` logs → watchlist. Each block, `getUserAccountData` in
batches of 100. Cap `LIQUIDATION_WATCH_CAP`, LRU eviction.

Unhealthy: read `getUserConfiguration` + batched `getUserReserveData` for
touched reserves (bound 8) + `getReserveConfigurationData` for the real
bonus (cached per block). Pair largest debt with largest collateral.

Shape:

```
flash debt asset → liquidationCall (underlying, not aToken)
  → swap collateral → repay
```

Close factor: HF-based 50% / 100% when HF < 0.95. The fork absorbs
v3.1 per-reserve residue. Do not guess a close factor the simulation
will contradict.

Near-miss `[1.00, 1.05)` publishes into `LiquidationLeads` every block.
That is what lets the oracle row act in the same block as the price
change.

---

## Oracle-update rows: auction first, race second

Before building either oracle row, resolve the market's SVR coverage. The
decision tree is mandatory:

```text
feed/market SVR coverage?
  unknown   -> oracle rows DISABLED for this market (fail-closed)
  covered   -> oev_auction_svr only; bid into the auction, never race
  uncovered -> oracle_backrun_uncovered may be evaluated (shadow first)
```

Coverage is a registry field with a revalidation date, resolved per feed *and*
per market, because a market can be liquidatable via a covered feed while
seizing collateral priced by an uncovered one. Both must be resolved.

### `oev_auction_svr`

Participation is bidding into a protocol-run auction whose winner receives the
exclusive right to backrun the update, with the oracle update and liquidation
bundled atomically. Requirements before this row may leave `disabled`:

- Written, current SVR/Atlas searcher interface: endpoint, auth, bid encoding,
  round timing, settlement guarantee, and failure/refund semantics.
- A dedicated `Transport` implementation with its own reconciliation; a lost or
  ambiguous auction response is an unknown-send incident.
- The winning bid recorded as an explicit cost line on the candidate, and the
  auction outcome (won/lost/no-bid) recorded on the funnel.
- Its own qualification row. It shares nothing with bundle transport evidence.

Aqua's default posture on covered feeds is **observe and measure first**: log
auction rounds, model what a winning bid would have cost, and compare against
realized outcomes for a full qualification window before proposing to bid.

### `oracle_backrun_uncovered`

The other rows watch *state* and arrive a block late. This row watches
the *event that changes state*.

| Source | Shape | Notes |
| --- | --- | --- |
| Chainlink OCR2 | `transmit(bytes)` to the **aggregator** | proxy is what protocols read; aggregator from `proxy.aggregator()`, refresh ~50 blocks |
| Chainlink legacy | `submit(...)` | same target set |
| Maker OSM | `poke()` / `poke(bytes32)` | hour delay on some pips |
| Maker Spot | `poke(bytes32)` | many ilks at once |

On a match, up to `ORACLE_BACKRUN_MAX_LEADS` leads rebuild with the
owning protocol’s own builder. Bundles are **back-runs**: oracle tx is
the victim, our calls run behind it.

The new price is **not** decoded out of the OCR report. The fork replays
victim → back and decides. Upward or too-small updates revert the
liquidation; the bundle dies; private orderflow means nothing lands.

**Eligibility.** Engineering-live on Ethereum for **uncovered** feeds once a
bundle path is wired. Observational on sequencer chains (you cannot buy
pre-update ordering). Do not leave the row looking like a soak-pending
strategy — `shadow_only_reason()` must distinguish at least: `"no bundle
market"`, `"feed under SVR auction"`, and `"SVR coverage unknown"`.

Not v1: Redstone/Api3, decoding the upcoming price pre-sim, Maker
medianizer hour-ahead.

---

## Valuation

Liquidations settle in seized collateral, not ETH. The simulator’s
accounting is a balance delta. Without valuation, every liq nets to
zero and cannot clear `MIN_NET_PROFIT_WEI`.

Rules (risk-relevant):

- Pinned to the pre-bundle fork block, never `latest`.
- Route: Uni V3 QuoterV2 across 100 / 500 / 3000 / 10000 (best wins) →
  V2 reserves → nothing.
- Fail-closed. No route, no bid.
- Haircut `VALUATION_HAIRCUT_BPS` (default 200).
- Off until `TOKEN_VALUATION=true`. Opt-in, like every path that turns
  an estimate into a bid.

A quote is not a fill. It does not model other liquidators in the same
block. Raise the haircut for illiquid collateral.

Only the fork backend is authoritative. Comparison backends that still
report `net_profit_wei = 0` must not feed qualification.

---

## v1 not-yet

| Row | Why later |
| --- | --- |
| Morpho V2 / Midnight | Term/maturity defaults, multi-asset collateral, curator callbacks, cross-chain finality — separate risk memo |
| Compound V3 | Two-step `absorb` + `buyCollateral`; no continuous HF for oracle leads |
| Maker | Vat emits nothing; gem-join harvest; bark + clip `take` with deterministic `kicks+1` | Fine to port as v1.1 if Morpho/Aave funnel is live |
| Base Aave/Morpho | Protocols exist; register addresses after Ethereum sim evidence, not before |
| Multi-account Comet absorb | Extra search |

---

## Sidecar risk extras

- Own `SIDECAR_SEARCHER_PRIVATE_KEY`. Derived address checked at boot.
- Own drawdown. A liq trip does not pause CoW.
- `LIVE_SMOKE_MAX` independent of Mouth A.
- Flash loans: zero inventory, but the executor must hold gas ETH.
- Competing liquidators are not modelled. Realised profit ≤ simulated.
  That is already in the known-limitations list; do not “fix” it by
  loosening `minProfit`.
- **Auction bid cap.** `MAX_OEV_BID_BPS` bounds the fraction of simulated gross
  incentive that may be offered into an OEV auction. It is a boot-time envelope
  that runtime can only narrow, and it is evaluated *before* transport
  selection, so a bid can never be widened to win a round.
- **Per-protocol, per-version caps.** `liq_aave_v3`, `liq_aave_v4`,
  `liq_morpho_blue` and each oracle row carry independent caps, drawdowns and
  kill switches. An Aave v4 Spoke parameter incident must not pause Morpho.
