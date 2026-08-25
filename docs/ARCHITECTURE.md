# Architecture

**Status: normative target specification — no implementation exists as of 24 August 2026.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

```
 CoW instance.json ─┐
 UniswapX orders  ──┤
 ERC-7683 intents ──┤
 newHeads          ─┤
 Flashblocks       ─┤   ingest  →  normalise  →  EngineEvent
 oracle txs        ─┤
 lending logs      ─┘
                         │
          ┌──────────────┼──────────────────┐
          ▼                                 ▼
   intent_loop                         sidecar_loop
   optimizer.solve(graph)              liq / oracle / arb
          │                                 │
          └──────────────┬──────────────────┘
                         ▼
                      RiskEngine
                         ▼
                 sim/  anvil fork
                 (pinned state_block)
                         ▼
              store (SQLite) + qualification
                         ▼
         submit/   cow | uniswapx | bundle | raw
                         ▼
              console  REST + SSE
```

---

## Why this shape

**One normalised event type.** Every source — an auction, a Dutch order, a
pending oracle update, a new head, a Flashblock — becomes an `EngineEvent`
before a mouth or sidecar sees it. Adding a source is one function in
ingest. No strategy change.

**Two loops, one process.** Intent auctions and liquidations have different
deadlines, different signers, and different failure modes. They share the
graph, the fork, the executor, the store, and the API. They do **not**
share a nonce lane. A CoW revert must not strand a liquidation nonce, and
a liquidation kill switch must not pause Mouth A.

**Strategies (and the optimizer) are pure-ish.** They take a context and
return `Vec<Solution>` or `Vec<Opportunity>`. They do not execute, persist,
or decide risk. That is how the surplus math is unit-tested without a
chain, and how the AMM sizing is tested against integer fixtures.

**Simulation is the arbiter, not the estimator.** The off-chain number
exists to decide whether a candidate is worth a fork slot. The number that
lands in P/L always comes from a forked EVM executing the real payload
against real state at a pinned block.

**Mouths are codecs.** Internally Aqua speaks `Solution`. CoW solution
JSON, UniswapX reactor fills, and ERC-7683 settlements are encodings of
that type. A third mouth is a crate and a codec, not a fork of the engine.

**The optimizer is the company.** Settlement, risk, and the console are
how a correct optimizer reaches production. They are not the product.

---

## Repository layout

```
aqua/
  README.md
  Makefile
  docs/                         this tree
  bot/
    Cargo.toml                  workspace; pinned Alloy dependencies
    rust-toolchain.toml
    crates/
      engine-core/
      dex-graph/
      sim/
      settlement/
      optimizer/                no RPC; fixtures in, Solution out
      mouth-cow/
      mouth-uniswapx/
      mouth-7683/               stub until phase 3
      sidecar-liq/
      sidecar-arb/              dormant
      submit/
      node/                     bin aqua
  contracts/
    foundry.toml
    src/AquaExecutor.sol
    src/interfaces/
    test/
    script/compile-check.js     ABI + runtime hex the bot embeds
  frontend/                     Next.js console
  replay/
    cow-batches/                frozen auctions for tape tests
    liq-windows/                oracle + health-factor fixtures
  deploy/                       systemd, docker-compose
```

The crate graph is deliberate. `optimizer` does not depend on an RPC provider,
signer, transport or wall clock. `mouth-*` depend on `optimizer` and
`engine-core`, not on each other. `sidecar-liq` does not import `mouth-cow`.
All EVM-facing crates use Alloy; the typed binding/provider boundary is
specified in [`ALLOY.md`](ALLOY.md). Deleting a mouth crate removes that mouth.

---

## The two loops

### intent_loop

1. Mouth receives an auction or order (HTTP for CoW, stream for UniswapX).
2. Graph snapshot at `state_block` (the block the auction/order is priced
   against — never `latest`).
3. `optimizer.solve` → `Solution`.
4. Risk gate.
5. Fork sim of the exact settlement encoding.
6. If the mouth is live-armed **and** that mouth’s qualification is `PASS`
   (or a remaining smoke slot), submit through that mouth’s transport.
7. Persist. Reconcile later.

### sidecar_loop

1. `on_block` and `on_pending` for lending logs, health polls, oracle
   selectors.
2. Build `Opportunity` (flash loan + `Call[]`).
3. Same risk → sim → qualify → submit path, **other nonce lane**,
   `SubmissionMode::Bundle` on Ethereum, `Raw` on sequencer chains.
4. Oracle-update backruns on L1 are the one place a foreign transaction
   (the price update) is in the payload. That field is `victim_hashes`.
   It is never used to smuggle a CoW batch or a Flashblocks backrun.

---

## Multi-chain

The engine is single-chain by construction: one `Config`, one fork, one
store, one nonce lane per domain. A second chain is a **second process**.
A process is a chain cell: it owns its event journal, registry snapshot, risk,
keys and safety state. Pure search can scale behind one fenced execution leader;
no worker other than that leader may sign or submit. Full vertical/horizontal
scale, HA and data rules are normative in [`SCALE.md`](SCALE.md).

`CHAIN_ID` selects a built-in address profile. Env `*_ADDRESS` overrides
win field-by-field, so a chain without a profile is fully env-driven.

| Chain | Id | Role in v1 | Submission | Qualification backend |
| --- | --- | --- | --- | --- |
| BNB | 56 | Candidate only; verify current CoW terms | CoW driver only if current onboarding grants it | solver-auction |
| Ethereum | 1 | Sidecar liquidations; CoW later | bundle + CoW driver | relay + solver-auction |
| Base | 8453 | CoW after BNB; sidecar after ETH evidence; Flashblocks later | raw / CoW driver | sequencer |
| Arbitrum | 42161 | CoW after Base | raw / CoW driver | sequencer |

See [`CHAINS.md`](CHAINS.md). Sequencer chains have no public mempool and
no builder market. Front-running rows are not constructed there.

---

## Address registry

`ChainAddresses` is capabilities, not errors. A `None` protocol address
means that strategy is skipped at construction with a boot warning. A
mainnet Aave address accidentally used on Base would simulate garbage;
fail-loud is the correct polarity.

The registry holds tokens, factories, quoters, routers, the Balancer
vault, lending pools, and chain behaviour (block time, default
`SubmissionMode`, default `QualificationBackend`, `sequencer_only`).

---

## The execution path, end to end (CoW)

1. CoW autopilot posts `instance.json` to the solver HTTP.
2. Mouth A decodes `Auction`.
3. Optimizer produces `Solution` (matches + AMM spill) under fairness.
4. Risk. Fork sim against the auction’s state.
5. Encode CoW solution JSON. Driver submits (DAO pool holds keys at
   first).
6. `notify` from the protocol updates win/lose/revert. Store + funnel.
7. Weekly COW accounting is observed, not computed here. Reverts of
   winning solutions are incidents.

## The execution path, end to end (liquidation)

1. New head. Sidecar refreshes watchlists (bounded).
2. Unhealthy Morpho or Aave position → flash-loan `Opportunity`.
3. Valuation prices the profit token at the fork block.
4. Risk. Fork sim. If live-qualified, reserved nonce, re-sim, bundle or
   raw send.
5. Finality reconciliation. Partial inclusion is an incident.

---

## Console boundary

The browser never sees bot URLs or signing keys. Next routes:

- `/api/bot/*` — authenticated proxy to the local engine
- `/api/stream?chain=` — SSE
- `/api/eth` — read-only RPC proxy for contract reads

Mutating engine endpoints (`/api/mode`, `/api/risk`, `/api/risk/reset`)
require `API_AUTH_TOKEN` whenever `API_BIND` is not loopback — including
in simulation. The process refuses to start otherwise.

---

## What “thin” means

- No bespoke Ethereum signing/RPC stack. Alloy typed bindings, envelopes and
  signer/provider boundary are small, pinned and reviewed; Aqua owns exact
  payload, state-pinning and transport policy. See [`ALLOY.md`](ALLOY.md).
- No strategy-specific Solidity. `Call[]` or the foreign settlement
  contract (CoW).
- No in-engine dashboard renderer. The console is a separate app.
- No unbounded queues. Ingest, replay, and persistence drop-and-count
  when full. Searcher decisions do not wait on SQLite.
- Optimizer has a wall-clock budget. Missing a CoW deadline is better
  than returning a half-search as if it were complete — unless the
  solution is explicitly marked partial, which v1 forbids.
