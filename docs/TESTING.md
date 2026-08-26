# Testing

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The target suite has three layers. Only the small Rust foundation unit tests
currently exist; the Foundry, frontend, tape, CI and fork suites are not yet
implemented. See [`FOUNDATION.md`](FOUNDATION.md). All layers become blocking
on `main` once implemented.

---

## 1. Rust unit

`cargo test --all`

No network. Optimizer, integer AMM math, Morpho share math, risk,
qualification snapshots, Alloy primitive/typed-ABI codecs, signed-envelope
fixtures, funnel units and CoW JSON codecs against fixtures. Do not replace
these with handwritten RLP or signing tests; Alloy owns encoding and Aqua owns
its payload invariants.

`optimizer` crate: naive vs v1 on committed tapes. A PR that loses to
naive on the frozen 7-day set fails.

## 2. Foundry

`forge test` in `contracts/`. Profit invariant, guards, flash loan,
two-leg baseline, access control, fuzz on budget/bribe.

`forge fmt --check`. Artifact job: committed runtime hex ==
`compile-check.js` output. `AquaExecutor` size is a tracked number. Every
protocol write selector and custom error has a typed Alloy binding assertion
and a pinned-fork execution test; every registry entry is checked against its
address code hash and proxy implementation.

## 3. Frontend

`npm run typecheck` and `npm run build` in `frontend/`. No network
to the bot required. Demo mode must render.

---

## Tape

`make tape` → `replay/cow-batches/` (redacted). Refresh monthly. Tape
age > 32 days is a warning on the optimizer page, not a CI fail (CI
uses the committed set).

Liquidation windows in `replay/liq-windows/` for oracle + HF fixtures.
Optional nightly fork tests against a pinned block; not on every PR
unless the state is vendored.

---

## What not to do

- Live RPC in CI.
- Tests that assert “opportunities exist on mainnet right now.”
- Golden tests on absolute solc metadata hashes that embed paths —
  `bytecode_hash = "none"`.
- Snapshotting full SQLite files.

---

## PR bar

`fmt`, `clippy -D warnings` on the bot, `forge fmt`, tests, artifact
job, tape job if `optimizer/` or tapes changed. Console typecheck.

A strategy PR without a funnel test is incomplete. A mouth PR without
a codec fixture is incomplete. A math PR without a tape delta is incomplete.

## Scale and failure tests

Before a cell advances beyond shadow, test duplicate/out-of-order ingress,
websocket gap + rewind, RPC disagreement/429/timeout, stale proxy code,
process crash between nonce reservation and send, transport timeout after send,
reorg, database restore and leader-failover fencing. The expected outcome is
one auditable submission or no submission—not a best-effort retry. See
[`SCALE.md`](SCALE.md) and [`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md).
