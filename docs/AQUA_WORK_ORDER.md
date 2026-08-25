# AQUA_WORK_ORDER — complete development work order

**Status: authoritative delivery work order — 24 August 2026.** This document
turns Aqua’s specifications into a sequenced engineering program. It does not
authorize live trading. A task is complete only when its acceptance evidence is
committed, reviewed, and linked from the release record.

## 0. Product mandate

Build Aqua as a Rust + Alloy, simulation-first execution system for:

1. user-opted intent-auction solving; and
2. permissionless liquidations that improve lending-protocol solvency.

Do **not** build public-mempool sandwiches, JIT liquidity as a revenue product,
directional token sniping, a retail router, a custody product, or Solana into
this engine. The architecture must make excluded strategies impossible to arm,
not merely undocumented.

## 1. Current starting point

The only implementation that exists is the Foundation 0 Rust safety kernel,
recorded in [`FOUNDATION.md`](FOUNDATION.md): workspace/toolchain pin,
Alloy primitives, state/lane types, fail-closed boot parsing, deterministic
risk gating, config-only `aqua doctor`, lockfile, and seven passing unit tests.

No provider, signer, contract, frontend, database, simulator, protocol
adapter, submission transport, qualification store, or live execution path
exists. This work order begins from that exact state.

## 2. Non-negotiable engineering decisions

| Area | Decision |
| --- | --- |
| Engine language | Rust 1.90+ |
| EVM stack | Alloy for Rust; no ethers-rs, hand-rolled RLP/signing/ABI/RPC stack |
| Contracts | Solidity + Foundry; no upgradeable executor |
| UI | Next.js + TypeScript; browser never has execution keys or bot credentials |
| Deployment unit | One chain cell/process per chain and environment |
| Execution authority | One fenced execution leader per signer/lane; workers cannot sign or submit |
| State identity | `chain_id + block_number + block_hash`; never a silent `latest` fallback |
| Integration source of truth | Signed/versioned protocol registry with code/proxy/ABI attestation |
| Initial execution mode | Shadow/simulation only; live code is built only behind hard gates |
| Accounting | Finalized realized balance deltas and gas, never an estimated P/L claim |

Read [`ALLOY.md`](ALLOY.md), [`SCALE.md`](SCALE.md),
[`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md), and [`RISK.md`](RISK.md)
before changing an execution path.

## 3. Delivery rules

### Definition of ready

A work item may start only when it has:

- an owner and reviewer;
- its dependent registry/schema/API changes identified;
- test fixtures or a plan to create deterministic fixtures;
- explicit failure behavior; and
- a statement of whether it can affect a live lane.

### Definition of done

A work item is done only when:

- Rust format, clippy (`-D warnings`) and applicable tests pass;
- its failure/restart/reorg behavior is tested where relevant;
- no secret, RPC credential, execution key, or production address is committed;
- docs/config/schema/console copy are updated in the same change;
- metrics, structured audit events, and an operator-visible failure reason exist;
- a reviewer verifies that it neither broadens boot/runtime authority nor
  introduces an unreviewed arbitrary-call/signer/transport path.

### Release rule

Only immutable tagged releases can collect qualification evidence. Every
qualification record identifies release tag, git commit, contract bytecode hash,
registry manifest digest, risk config digest, chain, lane, strategy and
transport. A source branch is never a soak target.

## 4. Workstream map

| ID | Workstream | Primary owner | Cannot start until | Gate to exit |
| --- | --- | --- | --- | --- |
| W0 | Program controls and CI | platform lead | now | reproducible, protected build/test pipeline |
| W1 | Alloy read boundary and state identity | Rust/EVM lead | W0 | pinned, reorg-aware reads and mocks |
| W2 | Registry and artifact governance | security/EVM lead | W0, W1 | code/ABI/proxy-attested capabilities |
| W3 | Safety persistence and execution leadership | systems lead | W0, W1 | durable/fenced nonce state, crash drills |
| W4 | Anvil simulation and executor contract | Solidity + Rust leads | W1, W2 | exact-call fork simulation and invariant-tested contract |
| W5 | DEX snapshot and deterministic baseline | quant + Rust leads | W1, W2 | replayable V2 baseline and graph correctness |
| W6 | CoW shadow adapter | protocol + quant leads | W1–W5 | audited shadow-only auction solutions |
| W7 | Operations/API/observability | platform + product ops | W1, W3 | safe operator controls and evidence ledger |
| W8 | Liquidation simulation adapters | protocol + Rust leads | W1–W5, W7 | Morpho/Aave simulation-only evidence |
| W9 | Controlled live path | security + operators | W0–W8 | independent go/no-go review; lane-specific smoke only |
| W10 | Scale/HA and additional cells | systems lead | one stable qualified cell | fenced failover and SLO evidence |
| W11 | Later intent/ordering integrations | protocol/quant lead | W9 success | route-specific approval; no inheritance of PASS |

## 5. Work packages

## W0 — repository, supply chain, and CI controls

### Deliverables

- GitHub Actions or equivalent protected CI for Rust, Foundry, docs/link checks,
  dependency audit, secret scan, license scan, and generated-artifact drift.
- Branch protection requiring review and successful checks.
- `CODEOWNERS` for execution, contracts, registry, and deployment changes.
- Dependabot/Renovate policy with human review; lockfiles committed.
- SBOM/provenance artifact for tagged releases.
- Pre-commit hooks for formatting, secret detection, and no `.env` commits.
- Release template recording commit, dependency lock hashes, registry digest,
  contract artifacts, config schema version, and operator approval.

### Acceptance criteria

- A clean checkout can run `make fmt` and `make test` without manually editing
  dependencies.
- CI rejects an unformatted Rust change, clippy warning, broken documentation
  link, leaked private key pattern, or changed generated artifact.
- No CI job contacts a live RPC, submits an order, or needs a secret.

## W1 — Alloy read-only boundary and state lifecycle

### Deliverables

Create `engine-core` traits and a concrete Alloy read adapter. Keep all
write/signing operations absent from this package.

- `ChainReader` interface: chain ID, head, block by hash/number, code, storage,
  logs, call-at-block, account nonce, receipt, and block receipts if supported.
- Alloy HTTP and supervised WS implementations with explicit deadlines,
  rate-limit/backoff layer, endpoint identity, metrics, and no implicit retries
  for non-idempotent work.
- `HeadTracker`: canonical head chain, parent/hash continuity, gap detection,
  bounded rollback and rewind events.
- `PinnedReadContext`: all candidate reads carry a `StateIdentity`.
- Independent-provider comparison for chain ID, head/hash, executor code,
  nonce, and reconciliation facts.
- Deterministic in-memory/mock reader fixtures for all error/reorg paths.

### Acceptance criteria

- No public API accepts only a block number where execution-relevant state is
  read; it needs a hash or explicit canonical verification.
- Tests cover timeout, 429, malformed response, chain mismatch, WS disconnect,
  duplicate head, gap, shallow reorg, deep-reorg halt, and provider
  disagreement.
- No `PrivateKeySigner`, wallet, `send_transaction`, raw transaction, or
  transport submission dependency is reachable from W1 crates.

## W2 — registry, ABI, token, and artifact governance

### Deliverables

Implement the machine-readable registry described in
[`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md).

- Versioned manifest schema and signature/approval metadata.
- Registry loader with schema validation, expiry/review date, digest, and
  environment/chain/capability matching.
- Alloy `sol!` binding module with source ABI content digest and selector/error
  assertions.
- Code/proxy/implementation/admin/config attestation reader.
- Token policy: address/code hash/decimals/allowance/behavior classification.
- Capability state machine: `disabled`, `shadow`, `limited_live`, `paused`,
  `expired`; immediate disable is allowed, widening requires release/approval.
- Registry change generator/reviewer tooling and fixtures for proxy upgrade,
  code mismatch, decimal mismatch, stale review, and unknown capability.

### Acceptance criteria

- No protocol call, router target, feed, token, settlement contract, or
  executor deployment can be selected from a bare env address in a live-capable
  configuration.
- Unknown/changed code or proxy implementation blocks the dependent capability.
- Every Alloy write binding has selector/custom-error tests and pinned-fork test
  stubs before its adapter uses it.

## W3 — safety store, event journal, and execution-leader semantics

### Deliverables

- SQLite schema/migrations for source events, candidate decisions, simulations,
  nonce reservations, signed payload hashes, submission attempts, outcomes,
  kill switches, smoke slots, qualification evidence, and audit transitions.
- One transactional transition/outbox pattern for `reserve nonce -> persist
  intent -> sign -> submit attempt`; network I/O cannot precede durable intent.
- Idempotency/source keys for auction/order/log/head ingestion.
- `Lane`-scoped nonce manager and recovery state machine.
- Restart reconciliation: query nonce/receipt/transport outcome before any reuse.
- Bounded async persistence for best-effort telemetry; safety writes are
  synchronous and never dropped.
- Backup, integrity-check, restore, and migration rollback procedures.

### Acceptance criteria

- Crash tests cover every transition boundary, including after reservation,
  after payload persistence, after unknown send timeout, and during receipt
  reconciliation.
- A nonce cannot be reserved by both lanes, reused before resolution, or
  silently lost on restart.
- Database corruption/full-disk/locked-store conditions halt the affected lane.

## W4 — executor contract and exact-payload simulation

### Contract deliverables

Create the Foundry project under `contracts/`.

- `AquaExecutor.sol` as specified in [`CONTRACTS.md`](CONTRACTS.md): searcher
  allowlist, bounded generic `Call[]`, retained-profit measurement, min-profit,
  deadline/base-fee/bribe guards, callback/reentrancy protections, owner-only
  sweep, and no upgradeability.
- Interfaces/mocks for ERC-20, WETH, Balancer flash-loan callback, and expected
  protocol interactions.
- Deployment script with registry-driven immutables and deterministic artifact
  output.
- Artifact/code-hash check consumed by W2 registry tooling.

### Simulation deliverables

- Anvil manager pinned to a block/hash and isolated process lifecycle.
- Exact calldata/value/from/nonce/fee execution on the pinned fork.
- Structured success/revert trace decoder and balance-delta accounting.
- Explicit simulation record digest binding candidate, registry, payload,
  state, and artifact identity.
- Re-fork/replay when the canonical head changes; no cached successful sim may
  cross a changed state identity.

### Acceptance criteria

- Foundry unit, fuzz, invariant, callback, access-control, error bubbling,
  profit/bribe/principal, and gas-limit tests pass.
- Rust integration test executes a known payload against a local Anvil fork and
  persists a complete simulation record.
- No simulation result can be passed into a sender without matching exact
  payload hash, state identity, registry digest, and contract code hash.

## W5 — DEX snapshots and deterministic naive baseline

### Deliverables

- Registry-backed V2 factory/pair discovery with cursors, overlap/rewind safety
  and event deduplication.
- Immutable graph snapshots keyed by state identity.
- Integer-only V2 quote/route math and calldata builder; exact rounding tests
  against known fixtures.
- Deterministic one-hop/best-route `naive` optimizer, independent of provider,
  wall clock, signer, database, and transport.
- Redacted replay fixture format with provenance, state identity, checksums and
  versioning.
- Initial CoW-auction fixture importer without any public endpoint exposure.

### Acceptance criteria

- Same input fixture produces byte-for-byte identical candidate output.
- V2 quote parity boundary tests pass; unsupported V3/Curve/Balancer/hook pools
  are rejected, not approximated.
- Optimizer CI can run offline against committed fixtures.

## W6 — CoW Protocol shadow adapter

### Preconditions

Obtain current written CoW onboarding terms: environment, supported chain,
shadow endpoint requirements, network/auth/IP requirements, driver custody,
bond/KYC requirements, protocol rules, reward/accounting terms, and incident
contact. Archive the dated evidence outside the repository’s secrets.

### Deliverables

- Strict auction schema decoder and source-id deduplication.
- Deadline-aware handler with bounded work, cancellation, and explicit
  no-solution behavior.
- CoW solution codec; record canonical `Solution` plus encoded request bytes.
- Fairness/EBBO validation as hard constraints based on current documented
  protocol rules.
- Shadow-only response route protected by authentication and request limits.
- Notify/outcome state machine and protocol-vs-local accounting separation.
- Frozen replay tape, naive comparison, acceptance/rejection/deadline metrics.

### Acceptance criteria

- Shadow endpoint passes integration contract tests and current CoW onboarding
  validation.
- Every reply is linked to auction ID, state identity, solver version, graph
  snapshot, optimizer result, codec bytes, and decision reason.
- No submission key is loaded. No production/staging endpoint is configured in
  a default build. No outcome can become a live qualification result.

## W7 — API, observability, operator console, and operations

### Deliverables

- Authenticated Rust API with read endpoints for status, funnel, evidence,
  candidates, simulations, registry, artifact identity, and alerts.
- Mutating endpoints limited to narrowing risk/pause/reset semantics; CSRF/auth
  controls, audit events, rate limits, and explicit all-or-nothing validation.
- Prometheus metrics and structured logs with redaction.
- Next.js operator console using same-origin routes only; generated data carries
  unmissable demo provenance and cannot be confused with engine output.
- Alert rules for state freshness, reorg, provider disagreement, registry drift,
  nonce age, store failure, queue shedding, simulation failure, drawdown and
  execution attempts.
- systemd/container manifests, non-root service account, least-privilege file
  permissions, encrypted backup, and restore drill.

### Acceptance criteria

- Browser code contains no RPC secret, execution key, transport auth credential,
  or direct bot host URL.
- An unauthenticated mutating request fails. A runtime patch cannot widen a
  boot envelope or construct a disabled strategy.
- Dashboard distinguishes generated data, replay, shadow, simulation and
  finalized real outcomes at every surface.

## W8 — Morpho Blue and Aave V3 simulation-only sidecars

### Deliverables

- Registry entries/bindings for each supported deployment, market/reserve and
  asset; no “all chains” assumption.
- Bounded event/poll discovery, watchlist capacity/LRU, health calculations,
  oracle validity policy, liquidation builder, flash-loan builder, valuation,
  and exact fork simulation.
- Morpho share math and callback path tests.
- Aave account/reserve/EMode/close-factor/liquidation-bonus tests.
- Collateral route/token policy/haircut handling and uncertainty rejection.
- Separate funnel, caps, signer lane, evidence population, P/L ledger and
  incident rules per protocol.

### Acceptance criteria

- Each candidate is independently reproducible from a fixture and pinned fork.
- No candidate reaches a send-capable interface. `TOKEN_VALUATION=false` or
  missing route/attestation causes an explicit rejection.
- A competing liquidator, changed oracle, insufficient liquidity, callback
  revert, or adverse route is represented in test fixtures/failure accounting.

## W9 — controlled execution and qualification

This workstream is **not automatically authorized** by code completion. It
requires a written go/no-go review by security, operator, protocol, and owner.

### Deliverables before any send-capable code

- Separate local/remote signer architecture and signer-policy tests.
- Concrete transport adapters with endpoint-specific auth, payload record,
  target block/range, privacy/builder policy, simulation, replacement,
  cancellation, rate limit, error classification and reconciliation.
- Bundle/private-raw/CoW-driver behavior implemented as separate adapters—not a
  generic `send` function.
- Durable smoke-slot/drawdown kill state and independent lane kill switches.
- Qualification evaluator that binds evidence to immutable release/config/
  registry/transport identity.
- Operator runbook exercises: pause, restart, unknown send, nonce recovery,
  reorg, provider outage, registry drift, key compromise, backup restore and
  incident communication.

### Execution progression

1. Shadow only.
2. Current protocol-approved staging environment, if available.
3. Simulation evidence review.
4. Optional tightly capped smoke in one lane after written approval.
5. Per-row, per-chain, per-transport qualification period.
6. Limited live only after `PASS`; any artifact/registry/config/transport
   material change resets evidence.

### Absolute stop conditions

Immediately narrow to simulation and open an incident on: registry mismatch,
provider disagreement on critical fact, store/nonce uncertainty, unaccounted
inclusion, partial inclusion, signer-policy violation, drawdown breach,
unbounded queue, reorg beyond supported depth, failed restore drill, or an
unknown transport response for a value-bearing request.

## W10 — scale, HA, and additional chain cells

Only begin after one cell has stable evidence and operators can run its
incidents without ad-hoc database edits.

### Deliverables

- Capacity replay at 2×, 5× and 10× recorded peak load.
- Bounded worker pools and deterministic work partitioning behind a single
  execution leader.
- Hot standby with lease/fencing-token enforcement at signer and persistence
  boundaries; no generic distributed lock is sufficient.
- Transactional HA store migration only after restore/failover design review.
- Separate chain-cell manifests, credentials, stores, SLOs, alert routes,
  qualification and risk budgets.
- Read-only aggregate control plane; it may distribute signed config but cannot
  hold execution keys or directly submit.

### Acceptance criteria

- Forced leader failover yields at most one signed/submitted payload per
  `(chain, signer, nonce)` and leaves an auditable recovery trace.
- A control-plane or analytics failure cannot arm, widen, sign, or submit.
- New chain cells begin in shadow and have no inherited qualification.

## W11 — later integrations

These are separate proposals, never automatic roadmap work:

- UniswapX: per-chain adapter with actual auction semantics, inventory,
  Permit2/callback, fill/cancel and markout model.
- ERC-7683: protocol-specific origin/destination settler adapter with explicit
  bridge/finality/reimbursement/refund/capital risk state machine.
- Oracle-update backrun: only after chain-specific private ordering/transport
  contract tests; no speculative pending-feed execution.
- Arbitrum Timeboost, OP Stack Flashblocks, Base ordering features: only after
  a documented current API/ordering guarantee and dedicated transport adapter.
- V3, Curve, Balancer, Aerodrome, Uniswap v4: each as a separately attested
  edge with exact math/calldata/fork parity.
- Compound/Maker: separate discovery, settlement, and risk memo.

## 6. Required test matrix

| Layer | Required evidence |
| --- | --- |
| Pure Rust | unit/property tests for math, config, state transitions, codecs and risk |
| Alloy boundary | mock/provider contract tests, pinned reads, timeout/429/reorg/disagreement |
| Database | migration, crash, idempotency, nonce reservation, backup/restore |
| Foundry | unit, fuzz, invariant, callback and fork tests |
| Differential | protocol quote/selector/ABI/code-hash comparisons at edge cases |
| Replay | deterministic offline tapes with versioned provenance |
| Integration | local Anvil plus mocked protocol/transport endpoints |
| Failure | WS gap, stale cache, changed proxy, lost response, full disk, signer denial, failover |
| Operations | alert delivery, pause, restart, recovery, restore and access-control drills |
| Security | dependency/license/secret scans, threat-model review, registry approval review |

## 7. Security work order

Before W9, commission an independent review covering:

- executor arbitrary-call/approval/sweep/callback/profit accounting surface;
- signer custody and authorization policy;
- transport privacy, builder/relay trust, replay and replacement semantics;
- registry supply chain/proxy upgrade/token behavior;
- database/audit integrity and HA fencing;
- API/frontend authentication and operator privilege model;
- denial-of-service and resource-exhaustion paths;
- liquidation/intent economic adversarial cases;
- incident response and key rotation.

Critical/high findings block live progression until fixed and retested. The
review report may be private, but its scope, date, release hash and remediation
status must be recorded in the release record.

## 8. Roles and decision rights

| Role | May approve | May not unilaterally approve |
| --- | --- | --- |
| Rust/EVM lead | internal code design, read-only adapters | live transport, risk widening, registry live capability |
| Solidity lead | contract implementation/tests | deploy/live executor use without security review |
| Quant lead | objective/baseline/tape methodology | weakens risk, fairness, qualification or product boundary |
| Security lead | registry/signer/contract/transport controls | profitability claims or operator arming alone |
| Operator | pause/narrow, evidence review, incident response | runtime widening, code bypass, undocumented address change |
| Product owner | roadmap and resource allocation | overriding hard safety or qualification stops |

Live enablement requires at least product-owner, security, and operator approval
plus the evidence gates above. No single developer key or console action may
arm all lanes.

## 9. Completion definition for “Aqua v1”

Aqua v1 is complete only when all of the following are true:

- one production-quality chain cell is deployed with documented SLOs and backup
  restore evidence;
- exact payload simulation, registry attestation, durable nonce recovery,
  transport reconciliation, finalized accounting, and kill behavior are proven;
- one intended opportunity surface has independent, immutable qualification
  evidence and written operational approval;
- every live claim in the README/console is derived from evidence, not a config
  flag or estimate;
- the independent security review has no unresolved critical/high finding;
- on-call/operator runbooks have passed drills;
- the product still enforces its strategy exclusions in code and UI;
- documentation, registry, artifacts, release tag and configuration are
  internally consistent.

“Code compiles,” “a bundle landed,” “the dashboard is visible,” and “an
opportunity was simulated” are not v1 completion criteria.

## 10. Immediate next three pull requests

1. **`ci: add reproducible Rust quality gates`**
   - CI workflow, cargo cache, locked dependency check, fmt/clippy/test, docs
     links, secret scan, dependency/license scan.
2. **`feat: add read-only Alloy chain reader`**
   - `alloy-provider`/HTTP adapter behind trait; head/block/hash/code reads;
     mock tests; no signer or send API.
3. **`feat: add pinned head tracker and reorg tests`**
   - canonical head continuity, rewind events, state context, metrics and
     timeout/provider-disagreement behavior.

Do not start a CoW adapter, executor contract, liquidation strategy, frontend,
or submission transport before these three are reviewed and green.
