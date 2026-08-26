# Engine

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The planned binary name is `aqua`. When implemented, it will run two loops in
one process, one chain at a time. This document is the target type-level
contract; no binary, mouths, or sidecars exist yet.

---

## Events

Every source flattens to `EngineEvent`:

| Variant | Produced by | Consumed by |
| --- | --- | --- |
| `Auction(Auction)` | mouth-cow HTTP | intent_loop |
| `Order(Order)` | mouth-uniswapx stream | intent_loop |
| `Intent7683(...)` | protocol-specific 7683 adapter | intent_loop (later; 7683 is a wire format, not a settlement guarantee) |
| `Head(BlockHead)` | `newHeads` | both loops, graph refresh |
| `Pending(PendingTx)` | mempool / sequencer / flashblocks | sidecar (oracle, optional backrun arb) |
| `Logs(LogBatch)` | lending + factory logs | sidecar, dex discovery |

`PendingTx` carries `source: TxSource`. Back-run-only sources
(`Sequencer`, `Flashblock`, unsigned private flow) refuse any candidate
that requires placing a transaction *in front* of the observed one.

`Flashblock` is not an alias of `Sequencer`. It carries `block_number`,
`flashblock_index`, and a `state_id`. A dependency on preconfirmed state
is **not** a victim hash.

---

## Solutions vs opportunities

Two candidate types, on purpose.

**`Solution`** — intent mouths. No victim. Has:

- `mouth: Cow | UniswapX | Erc7683`
- `fills` (matched CoWs + spilled AMM legs)
- `calls` or mouth-specific encoding
- `surplus_native`
- `gas_est`
- `state_block`
- `expires_at`
- `revert_risk`

**`Opportunity`** — sidecar. May have `victim_hashes` (oracle backrun
only). Has `front_calls`, `back_calls`, flash loan arrays, `profit_token`,
`expected_profit_wei`, `notional_wei`, `target_block`.

Do not overload `Opportunity.victim_hashes` to mean “the auction we are
solving.” That encoding bug will leak into raw transport, which must not
resubmit foreign payloads.

---

## Strategy rows

```text
CowBatch
UniswapXFill
AcrossFill
LiquidationAave
LiquidationMorpho
LiquidationCompound      // constructed only if the profile has Comet
LiquidationMaker         // constructed only if maker = true
OracleBackrun
AtomicArb
```

`live_candidate()` is engineering eligibility (atomic settlement into a
valuable profit token, or a mouth with a real driver). It is not
permission to broadcast. Qualification still has to `PASS`.

`shadow_only_reason()` is mandatory for ineligible rows so the console
never shows them as `PENDING` soak.

---

## Traits

```text
trait Mouth {
    fn id(&self) -> MouthId;
    async fn pull(&self) -> Vec<EngineEvent>;
    fn encode(&self, solution: &Solution) -> EncodedPayload;
}

trait StrategyImpl {
    fn kind(&self) -> Strategy;
    async fn on_pending(...) -> Vec<Opportunity>;
    async fn on_block(...) -> Vec<Opportunity>;
}

trait Optimizer {
    fn solve(&self, auction: &Auction, graph: &GraphSnapshot) -> Solution;
    fn score_fill(&self, order: &Order, graph: &GraphSnapshot) -> Option<Solution>;
}
```

`optimizer::naive` is a real `Optimizer`. It is never deleted.

---

## Funnel

Two units. Never divide one into the other.

| Counter | Unit | Meaning |
| --- | --- | --- |
| `invocationsWithOutput` | calls | produced ≥ 1 candidate |
| `invocationsEmpty` | calls | produced none |
| `candidatesEmitted` | candidates | total built |
| `gatedByRisk` | candidates | |
| `simulationsSucceeded` / `Reverted` | candidates | |
| `submittable` | candidates | survived sim + risk, still not a send |
| `submitted` | payloads | |
| `revertedOnchain` | payloads | incidents |

Provenance split: `funnel` (live) vs `funnelReplay` (already-mined). Never
read a rate across the two.

Mouth A adds auction-specific counters: `auctionsSeen`, `solutionsAccepted`,
`wins`, `shadowWins`, `deadlineMissed`.

---

## Submission transport

`Transport` is a closed enum, not a routing label and not a universal API.
The full per-variant contract is [`TRANSPORT.md`](TRANSPORT.md). Each concrete
transport records endpoint identity, auth identity, request bytes, target
block/range, privacy/builder policy, replacement/cancellation key, simulation
result, response and reconciliation state. At minimum distinguish CoW driver,
private raw transaction, `eth_sendBundle`, `mev_sendBundle`, and chain-specific
sequencer/express-lane APIs, and protocol-run OEV auction venues. Each
records its refund terms and whether the endpoint may drop or merge
transactions. A transport may only retry a request after its
idempotency/cancellation semantics are known. Flashbots documents distinct
advanced relay methods and bundle cancellation/replacement behavior.[^fb]

[^fb]: <https://docs.flashbots.net/flashbots-auction/advanced/rpc-endpoint>.

## Nonce and inventory

Two serialized lanes: `intent` and `sidecar`. Each has:

- durable reservation in SQLite
- startup cancellation / recovery
- fail-closed reuse until target expiry
- exact reserved-nonce re-sim before send

ETH/WETH balances tracked. `INVENTORY_GATE` opt-in. Mouth B later adds
token balances for the fill set.

Raw mode (sequencer chains): no revert protection. Unqualified smoke
requires `LIVE_SMOKE_MAX` **and** `LIVE_SMOKE_MAX_GAS_COST_WEI`. Each send
reserves `gasLimit × maxFeePerGas`.

---

## Persistence

SQLite is **safety state**, not just observability:

- qualification evidence
- nonce reservations
- submitted payloads and mouth notify
- finalized outcomes
- drawdown kill switch
- smoke slots remaining

Hot-path writes go through a bounded async writer. Full queue drops
*observability* rows and counts. It must not drop nonce reservations or
kill-switch trips — those are synchronous.

Backup the file. Never delete it during recovery or go-live.

---

## Latency budgets

| Path | Budget | If exceeded |
| --- | --- | --- |
| CoW `solve` | auction deadline minus encode margin | return no solution (v1 does not return partial) |
| Sidecar pending (oracle) | ~150 ms to sim start on L1 | shed, count `evaluationsShed` |
| Graph refresh | cooldown blocks, rewind always re-runs | |

The pending path uses one task per transaction, strategies in a `JoinSet`,
a global concurrency semaphore with `try_acquire` (shed, never queue work
for a block that has passed).

---

## API (engine)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/status` | process, chain, mode, kill switch |
| GET | `/api/funnel` | per-row, live vs replay |
| GET | `/api/qualification` | per-row verdict |
| GET/POST | `/api/mode` | can only narrow boot arming |
| GET/POST | `/api/risk` | runtime envelope; strategies only narrow |
| POST | `/api/risk/reset` | re-arm durable kill switch |
| GET | `/api/metrics` | Prometheus |
| GET | `/api/alerts` | |
| GET | `/api/optimizer` | surplus vs naive, tape age |
| GET | `/sse` | feed |

Mutating routes authenticate. Bind-not-loopback without a token is a
boot error in every mode.
