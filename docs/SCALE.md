# Scalability and reliability architecture

**Status: normative target specification — only the non-networked foundation
in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or
execution path exists.** This is the scale plan for Aqua after the shadow-only vertical
slice is correct. Scaling means preserving the safety properties in
[`RISK.md`](RISK.md), not increasing candidate count or chains first.

## Design objective

Aqua must scale **vertically** on a chain before it scales **horizontally** to
another chain or strategy. A candidate is useful only if its state identity,
exact payload, economic decision, signer/nonce authority, transport attempt
and final result remain auditable as one causal record.

**Hard invariants**

- A `(chain_id, signer, nonce)` has one active owner and one durable decision.
- One candidate is evaluated against one explicit `(block_number, block_hash,
  state_source)`; no component silently falls back to `latest`.
- Only a designated execution leader can sign or submit for a lane.
- Every external message is idempotent by a stable source key and every state
  transition is append-only/auditable.
- Loss of a cache, worker, websocket, RPC endpoint or replica may reduce
  throughput; it must never create an unrecorded submission or widen risk.

## Scale in this order

| Stage | Scope | Exit before advancing |
| --- | --- | --- |
| S0 | One process, one chain, shadow only | deterministic replay and fault tests; no live keys. |
| S1 | One process, one chain, one qualified live lane | nonce/restart/reorg/reconciliation drills and alert ownership. |
| S2 | Vertical workers behind one execution leader | bounded queues, backpressure, p99 deadline budget and deterministic result ordering. |
| S3 | Hot standby / regional redundancy for one chain | leader fencing; disaster restore; forced failover without duplicate signing. |
| S4 | Additional independent chain processes | each has separate registry/config/db/key/lane/qualification/incident budget. |
| S5 | Shared control plane and read-only analytics | no control-plane outage may submit, arm or modify live execution. |

A new strategy is not a scale stage. It repeats S0–S2 in shadow with its own
qualification population and route-specific risk memo.

## Vertical scale: a chain cell

A **chain cell** is the unit of deployment and failure. It owns one chain,
protocol registry snapshot, event journal, state snapshots, SQLite/Postgres
safety store, risk envelope, signer lanes, transport adapters and metrics.

```text
sources -> durable ingest journal -> normalize/dedupe -> bounded work queues
                                          |                  |
                                          v                  v
                                   state snapshotter    pure search workers
                                          |                  |
                                          +---- candidate ----+
                                                    |
                                             risk + exact sim
                                                    |
                                      single execution leader
                                      (reserve nonce, sign, submit)
                                                    |
                                   transport-specific reconciliation
                                                    |
                                      finality / reorg ledger
```

### Work classes and budgets

Separate bounded queues and semaphores by class. A slow archival RPC must not
starve a CoW deadline; a flood of pending transactions must not postpone nonce
recovery.

1. **Safety/control:** nonce reservations, kill switch, config and registry
   verification. Synchronous/durable; never dropped.
2. **Deadline critical:** auction solve, selected liquidation simulation,
   transport retries. Admission controlled; shed low-ranked work.
3. **State ingestion:** heads, logs, orderflow and pool discovery. Cursor-based
   and rewindable; deduplicated.
4. **Best effort:** analytics, console SSE, traces and historical enrichment.
   Drop/coalesce with a visible counter.

Every queue has a maximum item count, byte budget, deadline and shed metric.
No unbounded Tokio channel, task-per-event burst, or retry loop is permitted.

### State and compute

- Cache snapshots by `(chain_id, block_hash)`, not block number alone.
- Use immutable graph snapshots passed by reference to pure workers; do not
  lock a mutable global graph during search.
- Partition search by deterministic work key (auction ID, market ID, pool
  component). Merge candidate results in stable order with a fixed deadline.
- A worker produces proposals, never a signed transaction. It cannot possess a
  production key or submitter credential.
- Cache only data with an explicit validity interval and invalidation trigger.
  Pool/oracle/proxy/cache misses are a fail-closed candidate rejection, not a
  stale quote.

### Execution leader and HA

The execution leader is deliberately a bottleneck. It serializes per-signer
nonce allocation and the irreversible transition from simulated candidate to
signed payload. Do not distribute this with a generic lock alone.

For S0–S2, one local process and durable transactional store is safer. For S3,
use a leased leader record with monotonically increasing fencing token. The
signer service must refuse a request with a stale fence; the submission ledger
must atomically persist `(fence, lane, nonce, signed_payload_hash)` before
network I/O. A standby may replay/read/reconcile, but must not sign or submit
until it owns the lease and has reconciled every in-flight nonce.

If a remote signer/HSM is introduced, it must enforce lane allowlists, chain
ID, destination/call policy, rate/amount caps and the fencing token; “sign any
hash” is not acceptable. Human recovery requires two-person approval and an
incident record.

## Horizontal scale: independent cells, not a global bot

Run one deployable cell per chain and environment. It gets separate:

- database/schema/backup and encryption context;
- API auth identity, metrics labels and on-call routing;
- protocol registry manifest and artifact hashes;
- execution and transport-auth signers;
- risk/drawdown/inventory/qualification state;
- RPC vendor pools and circuit breakers.

A shared control plane may distribute **signed, versioned, reviewed** config
manifests and aggregate read-only telemetry. It cannot hold raw execution keys
or issue direct “send” commands. A cell accepts a manifest only after schema,
signature, compatibility, expiry and local safety validation. It applies a
change at a recorded block boundary; any widening change requires restart and
local operator approval.

Do not use cross-chain atomicity as a premise. Cross-chain fills are separate
capital and settlement businesses with route-specific finality and recovery
state machines, as explained in [`CURRENT_STATE_2026.md`](CURRENT_STATE_2026.md).

## Data/storage evolution

SQLite is appropriate for S0/S1 and is safety state, not a dashboard cache.
Use WAL mode, `FULL`/appropriate synchronous durability for nonce/kill writes,
file-system snapshots, encrypted off-host backup and restore drills. Keep a
small append-only transition journal so a row’s decision can be reconstructed.

Move only the chain cell safety store to Postgres (or equivalent transactional
HA database) when S3 requires failover. Use one transaction/outbox for nonce
reservation and submission-intent persistence. Analytics should consume a
redacted outbox/event stream into a separate warehouse; analytics failure may
not block or alter execution. Never share one global database transaction or
nonce table across chains.

## Observability SLOs

Measure, alert and gate on these rather than vanity opportunity counts:

- head/log/orderflow freshness and gap/rewind duration;
- RPC endpoint disagreement, error/429 rate and p50/p95/p99 latency;
- candidate age at simulation and send; deadline misses by reason;
- queue depth, shed count and work cancellation by class;
- sim/runtime/transport/reconciliation outcome split;
- nonce reservation age, in-flight nonce age and recovery actions;
- state-hash/proxy-code registry mismatch;
- simulated-to-realized P/L delta, markout and drawdown;
- leader lease/fence changes, backup age and restore drill result.

Set SLO targets per chain only after a shadow baseline. Breaching an execution
freshness, state disagreement, nonce or registry SLO narrows the affected lane
to simulation; it never triggers more aggressive retrying.

## Capacity planning rules

Profile with recorded traffic, replay at 2×/5×/10× current peak, and publish
CPU, memory, disk, RPC and deadline headroom per cell. Optimize in this order:

1. reduce work with source filters/deduplication and deterministic admission;
2. batch/cache pinned reads without crossing state identities;
3. parallelize pure search and simulations under explicit resource budgets;
4. add redundant RPC and hot standby only after correctness/failover drills;
5. add a new cell only after the previous cell’s operator workload is stable.

Vertical performance wins must preserve the exact same candidate output for a
frozen replay. A faster optimizer that changes integer rounding, state source,
call ordering or risk inputs is a strategy change and needs new qualification.
