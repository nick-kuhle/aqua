# Landscape

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

For the dated research synthesis and primary-source links, read [`RESEARCH_2026.md`](RESEARCH_2026.md). This file records implications, not unverifiable market-share claims.

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

This file ages fastest. Review quarterly. The implications for Aqua are
the durable part.

---

## Private orderflow and intents

Flow is venue- and chain-specific; do not assume a universal private-orderflow share. Intent auctions, private relays, public mempools, and sequencer-specific paths have different observability and settlement semantics.

**Implication:** Aqua’s primary ingest is auctions and signed orders,
not `newPendingTransactions`. Mempool remains for oracle selectors and
for L1 bundle placement, not as the business.

Intent solver networks are power-law: a handful of teams take most
volume. Protocol reward pools are hundreds of thousands of dollars per
month across *all* solvers, not per solver. Year-one expected value for
a new CoW solver is near zero; year-two is a niche or nothing. That is
still the highest-EV EVM use of this chassis.

---

## CoW economics (as of 2026)

- Quarterly volume is billions, not tens of billions every month.
- Protocol shares fees with solvers; `β` and consistency rules move.
- Since CIP-67 the auction is a **fair combinatorial auction**: bids are
  filtered per directed token pair against a single-pair reference, then the
  best fair combination wins. A strong batch with one weak leg is discarded.
- Payment is `cap(totalScore − referenceScore − missingScore)` and can be
  negative; reverted winning solutions are charged.
- June 30 2026: consistency metric = bid quality × settlement success.
- CoW onboarding/bonding terms are external and changeable. Verify the current
  DAO-pool, supported-chain, KYC, driver, bond and reward terms directly with
  CoW; this specification makes no chain-first onboarding claim.
- Full independent bond remains large. Do not plan to self-bond in 2026
  unless withholdals actually accumulate.

**Implication:** optimize for not reverting, not for spraying. Read
CIPs. When rules change, `OPTIMIZER.md` gets a dated note.

---

## UniswapX / 7683

Permissionless fill, no subsidy, inventory required, Dutch decay.
Cross-chain intents: 1–5 bps on stables (owned), 20–50 bps on exotic
routes. The same dozen MMs solve most layers.

**Implication:** Mouth B is a second codec, not a second company. Enter
on long-tail and exotic routes with a hard inventory cap.

---

## Liquidations

Aave still largest, now split across v3 (bulk of TVL, migrating) and v4
(Ethereum from 30 Mar 2026, Avalanche from 15 Jul 2026; hub-and-spoke,
target-health-factor repayment, health-scaled bonus, dust clearance). Morpho
has scaled into the same order of magnitude with permissionless Blue markets,
and separately launched intent-based fixed-term credit (V2/Midnight).

Liquidations are FCFS **only where the oracle value is not already auctioned**.
On Chainlink SVR-covered feeds — Aave core Ethereum markets among them — the
right to backrun the update is auctioned via Atlas and recaptured by the
protocol, at a reported average recapture rate near 73%. Same-block oracle
access there is bought, not won.

**Implication:** the sidecar is Morpho Blue tail + Aave v3 + a separate Aave v4
adapter, with the oracle row split into an uncovered-feed backrun and an
SVR-auction participant that observes and measures before it ever bids. Aave is
table stakes. Compound/Maker are ports, not identity. Morpho V2 is a different
protocol, not a version bump.

---

## L2 sequencers

Base, Arbitrum, OP still run centralized sequencers in 2026. Sequencer
revenue is the bulk of L2 MEV. Searcher leftover is backruns, often
spam-shaped, cheap gas.

Flashblocks (Base, ~200 ms) are a preconfirmed **state**, not a public
mempool. Arbitrum Timeboost is an express-lane **auction**.

**Implication:** do not map L2 onto Flashbots bundles. `Transport::SequencerRaw`,
`TxSource::Flashblock` with `state_id`, searcher-tx-only. Timeboost is
`Transport::ExpressLane` — a later chain-specific submitter with an auction bid
as a cost line, not a flag on raw mode. A Flashblock is a 200 ms preconfirmation
hint and is never inclusion evidence.

On L1, the relevant 2026 change is that bundle delivery pays contribution-based
refunds (BuilderNet/rbuilder in TEEs) and may drop/merge transactions. That is
transport semantics, not a tuning knob. See [`TRANSPORT.md`](TRANSPORT.md).

Sandwiching on private-mempool L2s is empirically unprofitable. Aqua
does not try.

---

## AMM design churn

V2, V3, V4 hooks, Aerodrome, Curve, Balancer, dynamic fees, LVR-recapture
hooks. Spark-scale stable TVL has already moved onto v4 hooks.

**Implication:** `Edge` trait. Allowlist V4 hooks we understand. Do not
become a general hook interpreter.

---

## Account abstraction

ERC-4337 and EIP-7702 change what “a swap” looks like. UserOperations
contain batches; sponsored gas breaks naive `tx.value` cost bases.

**Implication:** watch quarterly. Unwrap UOs when the share of sidecar
relevant flow (oracle, lending) justifies it. Mouths already see signed
intents, not raw swaps — they are less exposed.

---

## Regulatory / product

Sandwiching is under scrutiny and is a bad business. Aqua’s product
decision: intents the user signed, and liquidations the protocol
invites. Document that in the README so the next person does not add a
flag.

---

## What would change this file’s conclusions

- CoW (or UniswapX) publishes a permissionless, unbonded, still-paid
  solver path on a chain we don’t support — add a profile.
- Flashblocks (or equivalent) become the standard L2 preconfirm —
  promote `flashblock_backrun`.
- Morpho/Aave deploy a new liquidation mechanic — treat as a new row,
  don’t patch the old ABI.
- Public mempool share *rises* and stays up for a quarter — still not
  a sandwich row; maybe more oracle flow.

Write the date on every edit.
