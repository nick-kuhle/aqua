# Optimizer

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The optimizer is the company. Settlement, risk, and the console exist so a
correct optimizer can trade. If this crate cannot beat a naive AMM router
on a frozen tape, Aqua is not a solver.

The planned crate must have **no RPC**. A `GraphSnapshot` and an `Auction` (or
`Order`) will go in; a deterministic `Solution` will come out. Once fixtures
and CI exist, replay must not require a node.

---

## Ownership

| | Math | Eng |
| --- | --- | --- |
| Objective, matching, rings, fairness | owns | reviews |
| `naive` baseline, frozen tapes | specifies | owns fixtures + CI job |
| Graph snapshot shape | specifies | owns `dex-graph` |
| Encoding to CoW JSON / reactor | reviews | owns mouths |
| Fork-sim of the solution | — | owns |

If math is writing HTTP servers, the split is wrong. If eng is inventing
surplus formulas, the split is wrong.

---

## Current-market correction — 25 August 2026

Solver quality is not quote count or nominal auction wins. The objective must
be evaluated as **expected realized value**: user/protocol surplus minus gas,
fees, builder/sequencer payment, financing, inventory opportunity cost,
expected revert/inclusion loss, and adverse markout. Keep expected, submitted,
included, finalized, and reconciled values as separate fields.

The optimizer remains pure, but its input snapshot must include provenance:
state identity, registry digest, valuation source/confidence, transport policy,
deadline, and inventory reservation. A route that is mathematically optimal
without those inputs is not eligible for a live candidate.

## Objectives by mouth

They are not the same function. Do not “reuse CoW surplus” as a UniswapX
score.

### Mouth A — CoW

The objective changed shape with the CIP-67 fair combinatorial auction and the
30 June 2026 consistency metric. Sources and the full mechanism summary are in
[`RESEARCH_2026.md`](RESEARCH_2026.md) §1; the normative statement is here.

```
maximize  Σ cost_adjusted_score_i  over filled orders
where
  cost_adjusted_score_i = surplus_i + protocol_fee_i
                          − E[gas_i] − E[revert_loss_i]
subject to
  each fill respects the user's limit price
  uniform directional clearing prices
  token conservation, and NO surplus shifting between orders sharing a token
  PER-PAIR FAIRNESS: for every directed token pair p in the solution,
      score_p(solution) >= own_reference_score_p
  gas within the auction cap
  every AMM spill is executable on the pinned graph
  wall clock <= OPT_BUDGET_MS
```

Three consequences that are merge-blocking:

1. **Self-filter on the per-pair reference.** The protocol computes the best
   single-pair bid per directed token pair and discards any batched bid that is
   worse on *any* pair. The optimizer must compute its own
   `own_reference_score_p` from baseline liquidity and refuse to submit a batch
   it predicts will be filtered. Counter: `fairnessSelfRejected`. Submitting
   predictable-filtered bids also depresses the bid-quality half of the
   consistency metric, so it is worse than not bidding.
2. **Price the revert.** Payment is
   `cap(totalScore − referenceScore_i − missingScore_i)`, where
   `missingScore_i` covers this solver's winning solutions that reverted
   on-chain, and the result may be negative. `E[revert_loss_i]` is therefore
   part of the reported score, not a post-hoc risk note. Reverting is charged
   twice: once here, once through the settlement-success half of the
   consistency metric.
3. **Never inflate.** Truthful cost-adjusted bidding is the design target while
   the reward cap is not binding. Pennying/overbidding and score inflation are
   slashable social-rule violations. There must be no configuration key, no
   multiplier, and no "aggressiveness" parameter capable of expressing them —
   this is a code-level exclusion like the sandwich exclusion, not a policy.

Surplus is denominated in native via the same valuation path the sidecar
uses (pinned block, fail-closed, haircut). A solution whose surplus cannot
be priced is not a solution.

**Tape scoring for Mouth A changes accordingly.** A candidate optimizer version
is compared to `naive` on: total cost-adjusted score, fairness survival rate,
and simulated settlement success. A version that raises raw surplus while
lowering fairness survival or settlement success **loses**, and does not merge.

### Mouth B — UniswapX

```
maximize  dutch_price(t) − fill_cost − gas
subject to
  edge ≥ MIN_FILL_BPS
  inventory exists
  fork sim success
  you are willing to be first at this t
```

Fill too early and you lose money. Wait too long and someone else fills.
This is market making against a decaying quote, not surplus maximization.

### Mouth B dialect — ERC-7683

Same filler objective with origin/dest inventory and a bridge-shaped
deadline. Exotic routes (20–50 bps) before USDC corridors (1–5 bps, owned).

---

## Versions

### v0 — `naive` (week 1, permanent)

Each order independently routed to the best Uni V2/V3 hop on the snapshot.
No matching, no rings, no inventory.

This number is written down. **Every later solver is a regression against
it.** A PR that loses to naive on the frozen 7-day tape fails CI. Never
delete `naive`.

### v1 — matching + rings + spill (weeks 2–6)

1. Pairwise coincidence-of-wants (true CoWs).
2. 3-cycles (A→B→C→A).
3. Spill unmatched legs onto `dex-graph` (cycle search as a *router*).
4. Integer amounts. Dust rules. No `f64` on the settlement path.

v1 must beat naive **on every day of a frozen 7-day tape**, not on
average. Averages hide the day you would have reverted.

### v2 — more venues + quotes (month 2–3)

- Additional `Edge` impls the tape says would have won (Balancer, Curve)
  — only after measured lift.
- CoW price-estimation quotes (`min(native, 6 COW)` per winning quote).
  Small money; required for market-order flow.
- `InventoryEdge` type exists, unused until there is a book.

### v3 — Mouth B scorer (after Mouth A staging)

UniswapX `score_fill`. Same graph, different objective. Do not start v3
because shadow CoW is silent. Silence is an optimizer bug.

---

## Fairness

CoW will reject (and can slash bonded solvers for) solutions that fail
EBBO and related filters. v1 treats fairness as a hard constraint, not a
score term. Encode the protocol’s current rules; do not invent a private
interpretation of “best price.”

When rules change, this file gets a dated note and a tape that would have
failed.

---

## Time and incompleteness

Auctions give seconds, not 25 ms. `OPT_BUDGET_MS` is config.

v1 does **not** return a partial search marked as complete. If the budget
expires:

- if a feasible solution exists, return the best complete one found;
- else return no solution.

Missing an auction is cheaper than a revert. Reverts of wins are negative
rewards under the June 2026 CoW consistency metric (bid quality ×
settlement success). Repeated win-and-fail is how a solver goes negative.

---

## Tape tests

The future `replay/cow-batches/` directory will hold redacted historical auctions; it is empty today.

```text
cargo test -p optimizer -- --ignored   # optional long tape
make tape                              # CI: 7-day frozen set vs naive
```

Metrics written to the console via `GET /api/optimizer`:

- `surplus_v1 / surplus_naive` (must be > 1, target > 1.1 **and** positive realized markout after all costs)
- fill rate
- estimated revert rate (from fork, on a sample)
- tape age (stale tape is itself a signal)

Refresh the tape monthly. A solver that only beats stale historical flow may lose in
2026.

---

## What the optimizer is not

- Not a sandwich sizer.
- Not a latency race against a builder.
- Not allowed to call RPC.
- Not allowed to know which mouth encoded it, except via the objective
  enum passed in.
