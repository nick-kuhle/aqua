# What is buildable now

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

August 2026. This is the honest cut of Aqua that a small team can ship
without waiting on a protocol, a bond, or a research result.

“Buildable now” means: interfaces are stable, counterparties exist, test
fixtures can be obtained, and nothing in the design depends on a feed or
auction that is vapour. Scaling is designed in; it is not implemented in
week one.

---

## Day-one binary (Phase 0–1)

A compiling engine that **cannot broadcast**, plus a console that can be
demoed on generated data. At present, only the non-networked config/risk
foundation has been started; neither the engine nor console compiles yet. See
[`FOUNDATION.md`](FOUNDATION.md).

| Slice | Why it is buildable today | Scaling hook you put in now, not later |
| --- | --- | --- |
| `AquaExecutor` + Foundry tests | Solidity 0.8.26, Cancun, Balancer V2 flash loans, EIP-1153 transient storage — all live on Ethereum and Base | `Call[]` encoding. Never a strategy-specific function |
| Engine-core: types, config, Alloy RPC boundary, risk, store | Alloy supplies maintained typed EVM primitives, bindings, providers and signing | `Strategy` / `Mouth` enums closed in the compiler; adding a row is a compile error until funnel + risk + qualification are wired |
| Anvil fork simulator | Foundry `anvil` is the sim engine | Pin `state_block`. Never quote `latest`. Second backend (relay / sequencer compare) is a trait, even if only Anvil is implemented |
| DEX graph: Uni V2 + Uni V3 via QuoterV2 | Factories and QuoterV2 are deployed and stable | `Edge` trait. V2 is an adapter, not the graph’s native type |
| `optimizer::naive` | Independent per-order AMM route on the graph | Frozen as a CI baseline. Every later solver is scored against it |
| Mouth A HTTP skeleton | CoW solver OpenAPI is public; shadow competition is open | Mouths are adapters over `Solution`. CoW JSON is not the engine’s internal type |
| Sidecar Morpho + Aave, sim-only | Both ABIs are immutable-enough on Ethereum; flash loans work | Separate nonce lane and signer domain from day one |
| Qualification + funnel counters | Pure accounting | Per-row clocks. A new mouth cannot borrow another row’s `PASS` |
| Console shell | Next.js, same-origin proxy | Every panel keys on `chain`. Demo badge when the bot is down |
| `make doctor` | HTTP/WS probes | Fail-closed env names. Legacy aliases that silently no-op are a start error |

If Phase 0 does not look like this, the repo is already too clever.

---

## Buildable in the first 90 days (needs counterparties, not inventions)

| Slice | External dependency | First live venue |
| --- | --- | --- |
| CoW shadow → staging → BNB production | Company KYC, CoW DAO bonding pool, BNB gas | BNB Chain |
| Morpho liquidations, Ethereum, live-smoke then soak | Archive RPC, Balancer vault, Flashbots or equivalent for L1 | Ethereum |
| Aave V3 liquidations, Ethereum, sim then soak | Same | Ethereum |
| Oracle-update *detection* | Public or private mempool of `transmit` / `poke` | Ethereum (observational) |
| Oracle-update *execution* | Bundle placement behind the update | Ethereum, only after the bundle path is real |
| Ops: systemd, Docker, `/api/metrics`, alerts | A host | Any chain process |

CoW environment, supported first chain, driver ownership, bond/KYC and reward
terms are external prerequisites. Confirm them with CoW in writing immediately
before onboarding; do not bake a BNB-first launch assumption into code or an
operator promise. See [`CURRENT_STATE_2026.md`](CURRENT_STATE_2026.md).

---

## Designed now, implemented later (do not fake them)

These are **real** 2026 markets. They are not day-one code. The types and
the target module boundaries are documented so month-four work does not rewrite the engine.

| Slice | Why not day one | What you freeze now |
| --- | --- | --- |
| UniswapX filler | Needs inventory and a different objective (your edge, not user surplus) | `mouth-uniswapx` crate, `Order` type, `MIN_FILL_BPS` |
| ERC-7683 / Across | Needs origin/dest inventory and a fill schema | `mouth-7683` stub, `Intent7683` type |
| Base Flashblocks backrun | Needs a Flashblocks-aware provider, a `state_id`, and “searcher tx only” semantics | `TxSource::Flashblock`, `Opportunity` fields for preconfirmed state — never reuse `victim_hashes` |
| Aerodrome volatile/stable | Exact fee location and stable-curve math must be verified live | `Edge` impl behind `DEX_AERODROME_VOLATILE=false` |
| Curve / Balancer as graph legs | Different conservation rules | Pricing modules in `dex-graph`, not new strategies |
| Compound V3 / Maker sidecar | Extra ABIs, extra discovery | Strategy rows that construct only when the chain profile has addresses |
| Arbitrum Timeboost | Express-lane auction, not a Flashbots bundle | Chain profile + `SubmissionMode` variant, unimplemented |
| 1inch Fusion resolver | Permissioned resolver set | Mouth stub, no driver |
| Inventory-as-edge | Needs a book and a cost model | `InventoryEdge` in the optimizer, unused until Mouth B |

Empty crates that panic with `not implemented` are fine. Empty crates that
silently pretend to be CoW are not.

---

## Explicitly not buildable as a business in 2026

These can be *typed* so the compiler knows they exist. They must not be
live candidates.

- Public-mempool sandwiching (front, victim, back). The victim population
  is a shrinking, adversarially priced residue. Aqua’s product decision is
  to refuse this row.
- JIT liquidity as a revenue lane. Settlement and tick-crossing are not
  solved by more soak data.
- Buy-and-hold new-token sniping. Worst case is the entire buy. That
  invariant does not belong next to profit-or-revert.
- Solana. Different execution model. Shared console later, separate engine
  never-the-same-repo until an EVM chain has a `PASS` with real money.

A strategy enum may contain `Unimplemented` placeholders. `live_candidate()`
returns false. The console shows the reason, so “PENDING” is never confused
with “needs more soak.”

---

## Scaling rules you write on day one

Cheap to put in now, expensive to retrofit:

1. **One process per chain.** `CHAIN_ID` selects a profile. Qualification,
   kill switch, smoke budget, nonce, and SQLite are per process. Arming
   Base cannot touch BNB.
2. **Mouths are adapters.** Internal type is `Solution`. CoW JSON,
   UniswapX reactor calldata, and 7683 fills are codecs.
3. **Strategies are pure-ish.** `on_pending` / `on_block` / `on_auction`
   return candidates. They do not submit, persist, or change risk.
4. **Funnel is mandatory.** A new row that does not report
   `invocations*` and `candidatesEmitted` is not merged.
5. **Qualification is per row.** Evidence populations do not overlap.
   Sequencer compare and relay compare are different columns.
6. **Env is fail-closed.** Unknown names that look like they should work
   (`MIN_NET_PROFIT_ETH` vs `_WEI`) refuse boot.
7. **Console keys on chain.** A Base screenshot cannot silently show
   Ethereum numbers.
8. **Executor bytecode is a CI artifact.** Strategy changes do not move
   it. If it moves, the job fails until someone meant to.

---

## Suggested first makefile

```text
setup          submodules, npm, example env
doctor         RPC, WS, (optional) CoW shadow ping, anvil
bot-run        cargo run --release --bin aqua
front-dev      next dev
test           cargo test --all && forge test
tape           optimizer vs naive on replay/cow-batches/
fmt            rustfmt + forge fmt + prettier
```

No live keys in any of those targets.

---

## Capital required to *build* vs to *arm*

| | Build (now) | Arm Mouth A (BNB) | Arm sidecar (ETH) | Arm Mouth B |
| --- | --- | --- | --- | --- |
| People | math + 2 eng | + entity/KYC | + bundle access | + inventory |
| Money | RPC, laptops | BNB gas, company | gas ETH, tiny smoke | stables + WETH cap |
| Bond | none | CoW DAO pool | none | none |
| Inventory | none | none | none (flash loan) | yes |

Aqua is buildable now without a market-making book and without a $750k
solver bond. That is the point of the 90-day cut.
