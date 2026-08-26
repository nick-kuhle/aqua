# Aqua

> **Foundation status — 25 August 2026:** Aqua is not a runnable bot. A small,
> non-networked Rust safety kernel now exists: typed state/lane primitives,
> fail-closed configuration parsing, deterministic risk-gate unit tests, and an
> `aqua doctor` config-only CLI. There is still no provider, signer, contract,
> frontend, deployment configuration, CI pipeline, replay fixture, simulator,
> API, protocol adapter, transport, database, or production capability. See
> [`docs/FOUNDATION.md`](docs/FOUNDATION.md) for the authoritative ledger.
> Everything else below is **target architecture**, not available software.

Aqua is specified as a simulation-first **intent solver and liquidation
engine**. Its product boundary is user-opted intent-auction surplus and
liquidations that maintain protocol solvency; it excludes public-mempool
sandwiching, JIT-as-revenue, and directional token sniping.

The intended design is one isolated chain cell per process, a generic atomic
executor, a forked EVM as the final profit authority, protocol-specific intent
adapters, isolated liquidation lanes, and an operator console. It is a
measurement instrument allowed to trade only after independently verified
safety, economic, transport, and qualification gates.

```text
TARGET ARCHITECTURE — NOT IMPLEMENTED

Rust / Alloy engine             Foundry contracts              Next.js console
intent adapters             ->  AquaExecutor.execute()    ->  P/L + qualification
liquidation sidecar             profit-or-revert guard         funnel + arming
Anvil exact-payload sim         flash-loan callback             same-origin API
state journal + reconciliation  searcher allowlist              demo mode
```

## Read this first

1. [`docs/FOUNDATION.md`](docs/FOUNDATION.md) — exact implemented/not-
   implemented ledger; read this before making an implementation claim.
2. [`docs/RESEARCH_2026.md`](docs/RESEARCH_2026.md) — current intent, MEV, and liquidation-engine research.
3. [`docs/CURRENT_STATE_2026.md`](docs/CURRENT_STATE_2026.md) — audited
   project status, August 2026 market corrections, and launch gates.
4. [`docs/BUILD_NOW.md`](docs/BUILD_NOW.md) — the deliberately narrow,
   shadow-only vertical slice to build first.
5. [`docs/ALLOY.md`](docs/ALLOY.md) — mandatory Rust/EVM implementation
   standard. All EVM-facing Rust must use Alloy.
6. [`docs/PROTOCOL_REGISTRY.md`](docs/PROTOCOL_REGISTRY.md) — required
   code-hash-attested integration lifecycle.
7. [`docs/SCALE.md`](docs/SCALE.md) — vertical/horizontal chain-cell, leader,
   data, HA, and SLO model.
8. [`docs/TRANSPORT.md`](docs/TRANSPORT.md) — the closed transport enum,
   refund ledger, bundle-mutation safety, and ordering-auction rules.

### What the August 2026 market forced into the design

The plan was re-grounded against current sources on 25 August 2026
([`docs/RESEARCH_2026.md`](docs/RESEARCH_2026.md) carries the citations):

- **Oracle liquidation value is largely auctioned now, not raced.** Chainlink
  SVR with Atlas recaptures the majority of oracle-triggered liquidation MEV
  for the lending protocol. Aqua treats covered feeds as a bid-into-an-auction
  strategy with a hard bid cap, and disables the row when coverage is unknown.
- **Bundle delivery pays refunds and may mutate bundles.** BuilderNet-style TEE
  block building refunds by marginal contribution and can drop/merge
  transactions. Refunds are booked as receivable, never revenue, and any
  droppable transaction needs a test proving the candidate survives without it.
- **Aave v4 changed liquidation math.** Target health factor replaces the close
  factor, the bonus scales with health, and dust rules force full clears. v3
  and v4 are separate rows with separate fixtures.
- **CoW scores per directed token pair and charges for reverts.** The optimizer
  self-filters unfair batches and reports cost-adjusted scores; settlement
  success is a product metric, not an ops statistic.
- **Simulation is two-tier.** In-process `revm` screens candidates cheaply;
  Anvil remains the only authority, guarded by a differential-parity corpus.

## Planned safety model

When implemented, a value-bearing payload must not reach a solver driver,
reactor, relay, builder, sequencer, or raw RPC until all of the following are
true:

1. the protocol/asset/oracle registry entry is reviewed and matches code and
   proxy identity at the pinned state;
2. the candidate passes lane-specific risk, inventory, and drawdown policy;
3. the exact signed payload succeeds on a pinned-state Anvil fork;
4. the fenced execution leader durably reserves the nonce before network I/O;
5. the selected transport's simulation, privacy, target, cancellation, and
   idempotency semantics are known;
6. the strategy, chain, lane, artifact/config identity, and transport have
   separate qualification evidence; and
7. finality/reorg reconciliation records realized—not estimated—outcome.

A reverted private bundle is not a blanket no-cost guarantee. Relay/builder
behavior, raw inclusion, protocol settlement, token behavior, and transport
semantics remain separate risks. See [`docs/RISK.md`](docs/RISK.md).

## Planned opportunity surfaces

| Surface | Intended role | Earliest status |
| --- | --- | --- |
| CoW solver adapter | User-opted batch-auction surplus | Shadow only, after current CoW onboarding is verified |
| Morpho Blue / Aave V3 sidecar | Permissionless liquidation candidates | Simulation only, after registry/binding/fork fixtures |
| UniswapX adapter | Chain-specific filler strategy with inventory and markout controls | Later; not a generic Dutch-order adapter |
| ERC-7683 adapters | Protocol-specific cross-chain fill routes | Later; standard format alone is not settlement/finality/inventory |
| Atomic graph arb / oracle backrun | Research and simulation candidates | No live scope until a chain-specific ordering/transport integration is proven |

## Planned implementation stack

| Component | Intended standard | Non-negotiable boundary |
| --- | --- | --- |
| Execution engine | **Rust** application using the **Alloy Rust** libraries | Alloy supplies typed EVM ABI/RPC/providers/signers; no bespoke RLP or signing stack |
| Contracts | Solidity + Foundry | Generic executor; no strategy-specific arbitrary trading functions |
| Exact simulation | Anvil fork plus transport-specific checks | Explicit block number/hash/state identity, never silent `latest` |
| Safety state | SQLite first, transactional HA store only when justified | Durable nonce, kill, payload and transition journal |
| Console | Next.js, same-origin server routes | Browser never has execution keys or direct bot credentials |

The intended toolchain versions and future developer workflow are documented in
[`docs/SETUP.md`](docs/SETUP.md). They cannot be run from this commit.

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/AQUA_WORK_ORDER.md`](docs/AQUA_WORK_ORDER.md) | Complete development program, workstreams, gates, owners, and acceptance criteria |
| [`docs/CURRENT_STATE_2026.md`](docs/CURRENT_STATE_2026.md) | Audited repository status, current-market corrections, launch gates |
| [`docs/ALLOY.md`](docs/ALLOY.md) | Mandatory Rust EVM implementation boundary |
| [`docs/SCALE.md`](docs/SCALE.md) | Chain-cell scaling, HA, backpressure and SLOs |
| [`docs/PROTOCOL_REGISTRY.md`](docs/PROTOCOL_REGISTRY.md) | Attested protocol/asset/oracle integration lifecycle |
| [`docs/BUILD_NOW.md`](docs/BUILD_NOW.md) | First build cut and explicit exclusions |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Target wiring, crates, loops, cells |
| [`docs/ENGINE.md`](docs/ENGINE.md) | Target types, funnel, lanes, API and transport records |
| [`docs/OPTIMIZER.md`](docs/OPTIMIZER.md) | Solver objectives and deterministic baseline contract |
| [`docs/MOUTHS.md`](docs/MOUTHS.md) | CoW, UniswapX, and cross-chain adapter requirements |
| [`docs/SIDECAR.md`](docs/SIDECAR.md) | Liquidation/oracle candidate design |
| [`docs/STRATEGIES.md`](docs/STRATEGIES.md) | Opportunity surface and product exclusions |
| [`docs/DEX.md`](docs/DEX.md) | Graph/edge design and AMM integration rules |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | Target `AquaExecutor` contract surface |
| [`docs/RISK.md`](docs/RISK.md) | Fail-closed execution and incident boundaries |
| [`docs/QUALIFICATION.md`](docs/QUALIFICATION.md) | Per-row qualification specification |
| [`docs/CONFIG.md`](docs/CONFIG.md) | Target environment/configuration schema |
| [`docs/CHAINS.md`](docs/CHAINS.md) | Per-chain capability and rollout rules |
| [`docs/ADDING.md`](docs/ADDING.md) | Required work for any integration or row |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phases and kill gates |
| [`docs/TESTING.md`](docs/TESTING.md) | Required unit, fork, tape, failure and restore tests |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Operator-console specification |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Future deployment/operations design |
| [`docs/DAY0_RUNBOOK.md`](docs/DAY0_RUNBOOK.md) | Future first-host runbook |
| [`docs/MAINTAINING.md`](docs/MAINTAINING.md) | Change discipline and footguns |
| [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md) | Dated external market observations |
| [`docs/FUTURE.md`](docs/FUTURE.md) | Explicit later scope |
| [`docs/SIM_TO_LIVE.md`](docs/SIM_TO_LIVE.md) | Future arming sequence |
| [`docs/PATH_TO_LIVE.md`](docs/PATH_TO_LIVE.md) | Future operator checklist |

## Status and next milestone

No lane is eligible for live execution, qualification, or a production claim.
The first credible milestone is a **shadow-only** vertical slice: Alloy
read client with block/hash pinning, deterministic V2 baseline fixtures,
`AquaExecutor` tests, exact-payload Anvil fork simulation, a durable safety
journal, and a CoW adapter only after current onboarding terms are confirmed.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the build order. No example
configuration is a license to arm execution.
