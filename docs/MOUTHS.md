# Mouths

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

A mouth is how Aqua hears intents and how it answers them. Internally the
engine speaks `Solution`. Each mouth is a codec plus a transport.

Adding a mouth is [`ADDING.md`](ADDING.md). This file is the three that
are in scope.

---

## Mouth A — CoW Protocol

**Status:** v1, first production.

CoW batches user-signed intents and runs a solver competition. The winner
is the solution with the greatest surplus that passes fairness. Solvers
are bonded (or sit in the CoW DAO bonding pool). Compensation is weekly
COW, plus whatever execution P&L the solver’s own inventory produces.

### Why A first

- Users opted in. Surplus is the objective the protocol already scores.
- Protocol **pays** solvers. A new team can earn before it has a book.
- Onboarding is documented: local → shadow → KYC → staging → production.
- The DAO bonding pool avoids posting a full independent bond on day one.
- First live chain is **not hard-coded**. Select it from current written counterparty terms,
  transport capability, liquidity, and qualification evidence.

### What Aqua implements

1. HTTP server matching the public solver OpenAPI (`solve`, `notify`).
2. Decode `instance.json` → `Auction`.
3. `optimizer.solve`.
4. Encode CoW solution JSON. v1 interactions are on-chain AMMs and
   coincident fills. Aqua-funded legs via `AquaExecutor` are v2.
5. Do **not** write a second driver until current onboarding terms establish
   driver ownership, submission-key custody, and the integration boundary.

### Onboarding (operator evidence, not a hard-coded launch calendar)

1. Build the local solver against the current public OpenAPI and examples.
2. Obtain CoW's current written confirmation of supported shadow/staging
   environment, endpoint requirements, IP controls, driver ownership, chain
   ordering, bond/KYC, rewards address and settlement responsibilities.
3. Run shadow with an exposed, authenticated and monitored endpoint; preserve
   auction/solution/notify evidence.
4. Enter staging only with the written counterparty requirements satisfied.
5. Make production a separate approval after the environment, driver,
   qualification and capital gates pass.

The historical DAO-pool mechanics, service fees, chain ordering, reward caps,
quote amounts and payout cadence are commercial/protocol parameters, not Aqua
constants. Store a dated copy of the terms with the deployment record and
surface the chosen terms in the operator console. Do not encode them in the
optimizer or use them to infer P/L.

### Rewards and accounting

CoW's selected solution is driven by the protocol's current auction rules;
winning settlements can still fail, have negative accounting effects, or be
subject to later protocol accounting. Aqua records observed auction outcome,
actual gas/inventory effects and protocol-reported payment as separate fields.
It must not project a token reward from stale documentation or blend it with
sidecar P/L. Re-verify current rules before every environment transition.

### Mouth A funnel extras

`auctionsSeen`, `solutionsAccepted`, `wins`, `reverts`, `deadlineMissed`,
`fairnessRejected`.

Qualification backend: `solver-auction` — fork vs the protocol’s
acceptance/notify, not vs `eth_callBundle`.

---

## Mouth B — UniswapX

**Status:** designed now, implemented after Mouth A is in staging **and**
beating naive on tape.

UniswapX broadcasts signed Dutch orders. Fillers compete by taking the
order when the decaying price crosses their cost. Anyone can fill.
There is **no** protocol token subsidy. Profit is the leftover after
inventory and gas.

### Why not day one

- Different objective (your edge, not user surplus).
- Needs inventory on both sides.
- Professional fillers already sit on the deep pairs.
- Building B because A is silent hides an optimizer bug.

### What Aqua implements (phase 4)

1. A **chain-specific** order ingress: poll first, then a monitored webhook
   only when its delivery/replay semantics are proven.
2. A chain-specific auction model and typed Alloy reactor/Permit2 bindings.
   Ethereum RFQ/exclusivity, Arbitrum Dutch decay, and Base/Unichain priority
   gas auctions are separate adapters/configurations—not one generic timer.
3. `optimizer.score_fill` against a pinned snapshot and explicit auction state.
4. Fork sim of the exact reactor callback and the exact signed envelope.
5. Fill only if edge, inventory, token policy, allowance policy, nonce and
   lane-specific transport gates pass.
6. Reconcile fill, inventory, fees and post-finality markout. Negative markout
   trips a Mouth-B-only circuit, not the sidecar.

Start: one chain, stables + WETH, hard inventory cap. No cross-chain. The
current UniswapX auction taxonomy is documented by Uniswap.[^uniswapx]

[^uniswapx]: <https://docs.uniswap.org/contracts/uniswapx/auctiontypes>.

Top-of-book ETH/USDC is not the entry. Long-tail orders the desks skip
are the entry.

---

## Mouth B dialect — ERC-7683 / Across

**Status:** crate stub from day one. Implementation phase 4–5.

Cross-chain intents. Solvers front destination funds and collect origin
plus a fee. Spreads: 1–5 bps on deep stable corridors (owned), 20–50 bps
on exotic routes (the only place a new book belongs).

Same `Solution` type. Different schema and inventory topology
(origin/dest). Do not fork the optimizer; pass `Objective::CrossChain`.

UniswapX, Across, and CoW have historically been separate islands.
ERC-7683 is the bet that one filler speaks several layers. Aqua is
shaped for that. It is not required to win month one.

---

## Mouths that are watch items, not crates

| Protocol | Why watch | When it becomes a crate |
| --- | --- | --- |
| 1inch Fusion | Permissioned resolvers, Dutch-like | After UniswapX markout is green |
| Other 7683 layers (Aori, Eco, …) | Same codec if they actually speak 7683 | When volume on a route we already inventory |
| CoW cross-chain (incl. non-EVM dest) | Expanding | After EVM CoW `PASS` |

A watch item does not get a `mouth-*` crate until a written memo says the
tape or the route book justifies it. Empty crates are for things we
already know we will implement (UniswapX, 7683). Watch items stay in
[`FUTURE.md`](FUTURE.md).

---

## Shared mouth rules

- Fail-closed: no submit without sim success.
- Separate qualification row per mouth per chain.
- Runtime can only **narrow** a mouth that was constructed at boot.
- Console shows each mouth as its own scoreboard, never a blended
  “intents APY.”
- CoW JSON is never stored as the source of truth. `Solution` is. The
  encoded bytes are kept for audit.
