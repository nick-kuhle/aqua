# Mouths

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
- First live chain is **BNB**, then other L2s, Ethereum last. Cheap gas,
  limited blast radius, subsidized rewards.

### What Aqua implements

1. HTTP server matching the public solver OpenAPI (`solve`, `notify`).
2. Decode `instance.json` → `Auction`.
3. `optimizer.solve`.
4. Encode CoW solution JSON. v1 interactions are on-chain AMMs and
   coincident fills. Aqua-funded legs via `AquaExecutor` are v2.
5. Do **not** write a second driver. The DAO-pool driver holds submission
   keys at first.

### Onboarding (operator, week 1)

1. Local solver + open-source examples from CoW’s `solvers` crate.
2. Shadow competition (exposed endpoint, solvers Telegram).
3. Onboarding call: bonding pool, KYC, surplus shifting, EBBO, slippage.
4. KYC: company incorporation, shareholder details, passports.
5. Staging: rewards address, gas on the solving chain.
6. Production on the next Tuesday release after staging. **BNB first.**

DAO pool: core team operates the driver initially. Service fee on weekly
COW (starts after six months under current rules). A fraction of rewards
locks toward a bond. Graduation to a self-run driver and then a full
independent bond is later, not a 90-day goal.

### Rewards Aqua must respect

Performance rewards are capped as a share of protocol fees the solver
generated (`β` = 50% on Ethereum, Arbitrum, Base; 100% on smaller nets
under current rules). Negative performance is possible.

Consistency rewards (since 30 June 2026) scale with **bid quality ×
settlement success**. Winning and reverting is how you go negative.

Quote rewards exist for verified winning quotes on fill-or-kill market
orders — `min(native, 6 COW)` per quote. Crumbs. Required for flow.

Payouts: weekly, Tuesday, in COW.

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

1. Order stream.
2. `optimizer.score_fill` at current `t`.
3. Fork sim of the reactor callback.
4. Fill if `edge ≥ MIN_FILL_BPS` and inventory gate passes.
5. Markout after finality. Negative markout trips a Mouth-B-only
   circuit, not the sidecar.

Start: one chain, stables + WETH, hard inventory cap. No cross-chain.

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
