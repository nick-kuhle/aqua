# Liquidation sidecar

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The sidecar is how Aqua makes (or loses) money while Mouth A is still in
shadow. It does not wait on KYC, auctions, or inventory.

It is **not** a second engine. It shares `AquaExecutor`, the anvil fork,
the DEX graph, valuation, risk *parameters*, storage, and the console. It
will have its own signer, nonce lane, smoke budget, drawdown, and
qualification rows.

Isolation pattern: the same polarity as any lane whose failure mode must
not contaminate solver submissions.

---

## v1 rows

| Row | Protocol | Trigger | Reward shape | Capital |
| --- | --- | --- | --- | --- |
| `liq_morpho` | Morpho Blue | `maxBorrow < borrowed` (share math, virtual shares) | LLTV-proportional incentive, cap 15% | Flash loan of the loan token |
| `liq_aave` | Aave V3 | `healthFactor < 1e18` | Per-reserve liquidation bonus | Flash loan of the debt asset |
| `oracle_backrun` | Chainlink / Maker OSM | Pending `transmit` / `poke` matching a near-miss lead | Same as the owning protocol, one block earlier | Same as the rebuilt lead |

**Why Morpho is the gap.** Permissionless markets, long-tail collateral,
less saturation than Aave’s core list. Incentive is smaller on high-LLTV
markets (~2.6% at 0.915) and larger on the dangerous ones. Price the
tail; do not fight for ETH-USDC.

**Why Aave still ships.** Depth. When a large position flips, the bonus
is real. Expect company.

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

---

## Aave V3

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

## Oracle-update backrun

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

**Eligibility.** Engineering-live on Ethereum once a bundle path is
wired. Observational on sequencer chains (you cannot buy pre-update
ordering). Do not leave the row looking like a soak-pending strategy —
`shadow_only_reason()` must say “no bundle market” where that is true.

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
