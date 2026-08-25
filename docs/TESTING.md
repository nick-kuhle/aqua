# Testing

Three layers. All blocking on `main`.

---

## 1. Rust unit

`cargo test --all`

No network. Optimizer, integer AMM math, Morpho share math, risk,
qualification snapshots, RLP, signing, funnel units, CoW JSON codecs
against fixtures.

`optimizer` crate: naive vs v1 on committed tapes. A PR that loses to
naive on the frozen 7-day set fails.

## 2. Foundry

`forge test` in `contracts/`. Profit invariant, guards, flash loan,
two-leg baseline, access control, fuzz on budget/bribe.

`forge fmt --check`. Artifact job: committed runtime hex ==
`compile-check.js` output. `AquaExecutor` size is a tracked number.

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
a codec fixture is incomplete. A math PR without a tape delta is
incomplete.
