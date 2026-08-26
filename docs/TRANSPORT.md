# Transport

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no transport, signer, or submission path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

A transport is **how a signed payload reaches a block**, together with every
guarantee and cost that choice implies. This document exists because the single
most common architectural failure in a searcher codebase is a generic
`send(tx, bundle: bool)` that silently equates delivery paths with completely
different atomicity, privacy, cancellation, refund and payment semantics.

**Rule: there is no generic `send`.** Each transport is a separate adapter with
its own auth, payload record, simulation call, error taxonomy, reconciliation
procedure, metrics and qualification row. Adding one is a reviewed change under
[`ADDING.md`](ADDING.md), never a config value.

---

## Why this is a 2026 problem, not a 2023 problem

Three changes since the original design (sources and dates in
[`RESEARCH_2026.md`](RESEARCH_2026.md)):

1. **Ethereum bundle delivery pays refunds.** Flashbots retired its centralized
   builders and migrated orderflow and refunds to BuilderNet: multi-operator
   `rbuilder` instances inside Intel TDX TEEs, shared orderflow, and refunds
   distributed by marginal contribution under a published rule. Refunds are
   real receivable value with **eligibility rules** — private submissions
   qualify, public-mempool-only bundles do not, and bundles from the same
   signer are merged as non-competitive (an explicit anti-Sybil constraint).
2. **Bundles can be mutated.** `eth_sendBundle` now carries `refundPercent`
   (1–99), `refundRecipient`, and `droppingTxHashes` — transactions the builder
   may **drop** (but not revert) in order to merge multiple OFA backruns. Any
   assumption that "my bundle lands exactly as written" is no longer safe by
   default.
3. **Value-bearing delivery can be an auction you pay into.** SVR/Atlas for
   oracle-triggered liquidations, and Arbitrum Timeboost's sealed-bid
   second-price express-lane auction, both price *ordering* explicitly. The bid
   is a cost line on the candidate, not an infrastructure detail.

---

## The closed transport enum

`Transport` is a closed Rust enum. A new variant is a compile error everywhere
it is not handled — funnel, risk, reconciliation, qualification and console
copy must all be updated before it builds.

| Variant | Chain class | Atomicity | Privacy | Cancellable | Pays for ordering | Refund |
| --- | --- | --- | --- | --- | --- | --- |
| `PublicRaw` | any | none | none | replace-by-fee only | priority fee | none |
| `PrivateRaw` | L1 + private-RPC chains | none | endpoint-scoped | endpoint-specific | priority fee | endpoint-specific |
| `Bundle` | Ethereum L1 | bundle-scoped | private | by replacement/uuid | coinbase payment | BuilderNet rule |
| `BundleMergeable` | Ethereum L1 | **partial** (`droppingTxHashes`) | private | by replacement/uuid | coinbase payment | BuilderNet rule |
| `OevAuction` | protocol-run (SVR/Atlas) | auction-scoped atomic | auction-scoped | auction round semantics | **winning bid** | n/a |
| `ExpressLane` | Arbitrum Timeboost | none beyond ordering | none | sequencer semantics | **auction bid** | n/a |
| `SequencerRaw` | OP-stack / L2 sequencer | none | none | none | priority fee | none |

`Flashblock` is **not** a transport. It is an ingest source
(`TxSource::Flashblock`, a 200 ms preconfirmation *hint* carrying its own state
id) and must never be used as evidence of inclusion or as a submission target.

### Forbidden shapes

- A boolean `bundle` field anywhere on a candidate, config, or API payload.
- A `Transport` chosen at runtime by string comparison on an env var.
- One adapter that branches internally on chain id to change semantics.
- Reusing a `PrivateRaw` reconciliation routine for a `Bundle` submission.
- Any code path where an unhandled transport falls through to `PublicRaw`.

---

## Required per-transport record

Every submission attempt persists, before any network I/O (see W3's
reserve→persist→sign→submit ordering):

```text
transport variant + adapter version
endpoint identity (host, key id — never the secret)
auth scheme and credential id
signed payload hash + exact payload bytes
lane, signer address, reserved nonce, fencing token
state identity (chain_id, block_number, block_hash)
target block or block range
privacy class and information disclosed (hints, if any)
cancellation/replacement semantics available and used
declared coinbase payment / auction bid / priority fee
refund terms requested (refundPercent, refundRecipient)
droppingTxHashes set, if any, and why the candidate tolerates each drop
simulation response from the endpoint (if the endpoint simulates)
deadline and idempotency key
```

And on resolution:

```text
outcome class (included | rejected | expired | replaced | unknown)
rejection reason as reported, verbatim, plus Aqua's classification
inclusion block + hash, finality status, reorg status
actual coinbase payment / bid paid
refund expected vs refund observed vs refund reconciled
realized balance deltas and gas at finality
```

An `unknown` outcome for a value-bearing request is an **absolute stop
condition**: narrow to simulation and open an incident. It is never retried
blind.

---

## Refunds are receivable, not revenue

BuilderNet-style refunds arrive as a payout transaction and are subject to a
rule Aqua does not control. Therefore:

- `refund_expected_wei` is recorded on the candidate and is **excluded** from
  realized P/L.
- `refund_reconciled_wei` enters realized P/L only after the payout is observed
  in a finalized block and attributed to the specific submission.
- A persistent gap between expected and reconciled refunds is an alert
  (`refund_shortfall`), because it usually means eligibility was misunderstood
  — for example a bundle that was ineligible, or a signer-identity merge.
- Refund eligibility rules are **registry data with a revalidation date**, not
  constants. Unknown eligibility means refunds are modeled as zero.
- Because same-signer bundles are merged as non-competitive, splitting
  submissions across signer identities to increase refunds is **prohibited**:
  it is Sybil behaviour against an explicit anti-Sybil constraint, and Aqua's
  lane/signer model must make it impossible to do accidentally.

## Bundle mutation changes correctness, not just accounting

`droppingTxHashes` permits the builder to remove listed transactions to merge
backruns. Rules:

- The set defaults to **empty**.
- A hash may be added only when the candidate has a test proving it is still
  correct and still profitable with that transaction absent.
- Each entry carries a recorded justification, reviewed like a code change.
- The exact-payload simulation must be run for the *drop-applied* variants that
  the builder is permitted to produce, not only the full bundle. If the variant
  space is not enumerable, the set must stay empty.

## Paying for ordering

`OevAuction` and `ExpressLane` bids are **costs on the candidate**, evaluated
against `MAX_OEV_BID_BPS` / `MAX_ORDERING_BID_BPS` before transport selection.
Consequences:

- A bid may never be raised to win a round. The envelope is set at boot and
  runtime may only narrow it.
- Auction loss is a normal, counted funnel outcome (`auctionLost`), not an
  error.
- Auction win with failed downstream execution is an incident, because the bid
  may be owed regardless.
- Each auction venue is a distinct qualification row. Timeboost evidence grants
  nothing to SVR and vice versa.

---

## Multi-endpoint submission

Submitting one candidate to several builders is normal and is also the easiest
way to double-spend a nonce. Required invariants:

1. One reserved nonce per `(chain, signer)` per candidate, regardless of how
   many endpoints receive it.
2. Every endpoint receives the **identical signed payload**; a per-endpoint
   re-sign is prohibited.
3. Reconciliation is per endpoint, but inclusion is resolved per `(chain,
   signer, nonce)`. Two endpoints reporting inclusion of different payloads for
   one nonce is a safety incident.
4. Endpoint fan-out is bounded and configured at boot.
5. A single endpoint's failure must not block reconciliation of the others.

---

## Chain-specific notes

**Ethereum L1.** `Bundle` / `BundleMergeable` against BuilderNet and other
builders. Record target block *and* the block range if resubmitted. Private
submission is a precondition of refund eligibility.

**Base / OP stack.** `SequencerRaw`. Flashblocks are an ingest hint at ~200 ms
with `latest` at ~2 s; safe/finalized are minutes away. Never treat a
Flashblock as inclusion, and never treat OP-stack ordering as bundle-like.

**Arbitrum.** `SequencerRaw` by default; `ExpressLane` only after the Timeboost
auction interface, round timing, and settlement are integration-tested. The
express lane buys 200 ms of ordering priority — it is not atomicity.

**BSC / PoSA-style.** Out of scope. Flow concentrates in a whitelisted builder
set with direct validator channels; competing there is a latency capital
business Aqua has explicitly declined.

---

## Testing requirements

| Layer | Required evidence |
| --- | --- |
| Unit | payload record completeness; enum exhaustiveness; bid cap enforcement |
| Adapter contract | mocked endpoint: accept, reject, malformed, timeout, 429, auth failure, duplicate submit |
| Reconciliation | included, not included, expired, replaced, reorged out, unknown |
| Refund | expected vs observed vs reconciled; ineligible bundle; shortfall alert |
| Mutation | drop-applied bundle variants still profitable; non-enumerable variant space forces empty set |
| Auction | win, loss, no-bid, win-with-failed-execution, ambiguous response |
| Multi-endpoint | one nonce across N endpoints; conflicting inclusion reports raise an incident |
| Failure | endpoint outage mid-flight; response lost after send; clock skew at deadline |

No transport may leave `disabled` without the full row above, a written
counterparty-terms record, and its own qualification evidence.
