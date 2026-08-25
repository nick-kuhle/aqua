# Aqua

A simulation-first **intent solver** and **liquidation engine**.

One process per chain. One generic executor. One forked EVM as the arbiter of
profit. Two intent mouths (CoW Protocol now, UniswapX next), a liquidation
sidecar that does not wait on auctions, and a console that makes every gate
visible.

Broadcasting is disabled by default and fail-closed. Live transport exists, but
a payload reaches a relay, a solver driver, a reactor, or a raw RPC only after
boot arming, an independent broadcast flag, authenticated runtime mode, risk
and inventory approval, durable nonce recovery, exact-payload simulation, and
a per-row qualification `PASS` from at least seven continuously observed days.

```
bot (Rust)                     contracts (Foundry)           console (Next.js)
──────────                     ───────────────────           ────────────────
intent mouths  ─────────────▶  AquaExecutor.execute()  ──▶  P/L + equity
  CoW · UniswapX · 7683        profit-or-revert guard       mouth scoreboard
liquidation sidecar            Balancer flash loans         live funnel
  Morpho · Aave · oracle       searcher allowlist           risk + arming
atomic spillover arb           coinbase bribe               qualification
anvil fork simulation                                        chain switcher
SQLite + REST/SSE
```

Aqua is a **measurement instrument that is allowed to trade**, not a money
printer with a dashboard. The steady state is few opportunities surviving the
gates. That is the system working.

---

## Quick start

```bash
git clone --recurse-submodules <this repo> && cd aqua
make setup
$EDITOR .env                    # RPC URLs first; never keys in git

make doctor                     # every endpoint answers
make bot-run                    # engine + API
make front-dev                  # console
```

The console works before the bot does. If the API is unreachable it renders
generated data behind a **DEMO DATA** badge so the shape of every panel is
visible on day one.

Requirements — walkthrough in [`docs/SETUP.md`](docs/SETUP.md):

| Tool | Version | Why |
| --- | --- | --- |
| **Rust** | 1.90+ | engine, simulator, API (`bot/`) |
| **Foundry** | latest | contracts; `anvil` is the simulation engine |
| **Node.js** | 22+ | console (`frontend/`) |
| RPC | archive-capable | live + historical state, per chain |

---

## What it does

Aqua has three surfaces that share settlement, simulation, risk, and storage.
They do **not** share nonce lanes, signers, or qualification clocks.

| Surface | Trigger | What it optimizes | Inventory |
| --- | --- | --- | --- |
| **Mouth A — CoW** | Batch auction (`instance.json`) | User surplus under fairness, then gas, then revert risk | None required (AMM spill) |
| **Mouth B — UniswapX / ERC-7683** | Dutch orders / cross-chain intents | Filler edge vs decaying price and gas | Yes (start stables + WETH) |
| **Sidecar — liquidations** | Health factor, oracle update, new block | Seized bonus minus gas, valued in native | None (flash loan) |

A fourth, dormant until a sequencer chain has a real preconfirmed-state feed:
**atomic spillover arb** on the same DEX graph the solver already uses.

### How a candidate is scored

1. A mouth or sidecar proposes a `Solution` or an `Opportunity`.
2. `RiskEngine` gates notional, base fee, inflight count, kill switch.
3. The exact payload is replayed inside an `anvil` fork of the target chain at
   the **pinned** state block. Automine off, so atomic batches land in one
   block.
4. Realised executor balance delta, minus gas and any builder payment, is the
   recorded P/L — not an estimate. Non-native profit is valued at the same
   pinned block or the candidate is uncertified.
5. Only a qualified live row enters its serialized durable nonce lane. That
   exact reserved-nonce payload is rechecked and sent.
6. Own hashes are reconciled after finality into gross, builder/solver payment,
   retained profit, gas, and net. Partial or incoherent inclusion is an
   explicit incident, not a guessed win.

### Why a losing payload should cost nothing

`AquaExecutor` measures retained profit and reverts with
`Unprofitable(realised, required)` below `minProfit`. A correctly simulated
atomic private bundle that reverts should be dropped without gas. This is not
a guarantee against relay defects, raw-mode inclusion, or a CoW win that
reverts on chain (that last case is a **negative protocol reward**). Raw
mode and solver submissions therefore carry extra caps. See
[`docs/RISK.md`](docs/RISK.md).

---

## The contract

`contracts/src/AquaExecutor.sol` — one generic executor for every atomic
strategy. Strategies are encoded off-chain as an ordered `Call[]`, so a
strategy change never needs a redeploy.

CoW Protocol settlements go through CoW’s own settlement contract. The
executor is for sidecar liquidations, UniswapX inventory legs, flash-loan
arb, and any interaction Aqua itself funds.

Guards: `minProfit`, `blockDeadline`, `maxBaseFee`, `bribeBps`, searcher
allowlist, transient-storage reentrancy and callback protection. Full
surface in [`docs/CONTRACTS.md`](docs/CONTRACTS.md).

---

## The bot

Thin on purpose. JSON-RPC, RLP, and EIP-1559 signing are small auditable
modules rather than a provider stack, because the exact bytes we sign matter.

```
bot/crates/
  engine-core/     types, config, rpc, risk, inventory, store, qualification
  dex-graph/       AMM edges, cycle search, pool discovery
  sim/             anvil fork + revert decode
  settlement/      AquaExecutor calldata
  optimizer/       naive baseline + surplus maximizer   ← the company
  mouth-cow/       CoW solver HTTP
  mouth-uniswapx/  Dutch fills
  mouth-7683/      ERC-7683 / Across (stub until phase 3)
  sidecar-liq/     Morpho, Aave, oracle backrun
  sidecar-arb/     atomic graph arb (dormant until a feed exists)
  submit/          cow | uniswapx | bundle | raw
  node/            the binary that ties the loops together
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/ENGINE.md`](docs/ENGINE.md).

---

## The console

`frontend/` — detailed enough to operate from, simple enough to hand to a
non-author. Spec in [`docs/FRONTEND.md`](docs/FRONTEND.md).

The browser only talks to same-origin Next routes. Bot URLs and auth tokens
stay server-side.

---

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/SETUP.md`](docs/SETUP.md) | Toolchains, `.env`, `make doctor` |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Wiring, layout, how a chain is added |
| [`docs/ENGINE.md`](docs/ENGINE.md) | Loops, types, funnel |
| [`docs/OPTIMIZER.md`](docs/OPTIMIZER.md) | Surplus maximizer, naive baseline, math contract |
| [`docs/MOUTHS.md`](docs/MOUTHS.md) | CoW, UniswapX, ERC-7683 |
| [`docs/SIDECAR.md`](docs/SIDECAR.md) | Liquidations and oracle-update backruns |
| [`docs/STRATEGIES.md`](docs/STRATEGIES.md) | Every opportunity row: now, next, later, watch |
| [`docs/DEX.md`](docs/DEX.md) | Graph, edges, adding an AMM |
| [`docs/CONTRACTS.md`](docs/CONTRACTS.md) | `AquaExecutor` |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Console IA, every panel |
| [`docs/RISK.md`](docs/RISK.md) | Fail-closed broadcast, guards, known limits |
| [`docs/QUALIFICATION.md`](docs/QUALIFICATION.md) | Per-row `PASS` / `FAIL` / `INSUFFICIENT SAMPLE` |
| [`docs/CONFIG.md`](docs/CONFIG.md) | Annotated environment |
| [`docs/CHAINS.md`](docs/CHAINS.md) | Ethereum, Base, BNB, Arbitrum, how to add one |
| [`docs/ADDING.md`](docs/ADDING.md) | Add a mouth, a strategy, an AMM, a chain |
| [`docs/BUILD_NOW.md`](docs/BUILD_NOW.md) | What is buildable on day one |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phases 0–5, kill gates |
| [`docs/FUTURE.md`](docs/FUTURE.md) | Landscape-aware future scope |
| [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md) | What is shifting and what that implies |
| [`docs/SIM_TO_LIVE.md`](docs/SIM_TO_LIVE.md) | Arming order |
| [`docs/PATH_TO_LIVE.md`](docs/PATH_TO_LIVE.md) | In-the-room runbook |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | systemd, Docker, metrics, alerts |
| [`docs/TESTING.md`](docs/TESTING.md) | Unit, fork, tape tests |
| [`docs/MAINTAINING.md`](docs/MAINTAINING.md) | Mindset, change patterns, footguns |
| [`docs/DAY0_RUNBOOK.md`](docs/DAY0_RUNBOOK.md) | First production host |

---

## Status

This repository is the **specification and operating system** for a greenfield
build. Implementation follows [`docs/ROADMAP.md`](docs/ROADMAP.md) and
[`docs/BUILD_NOW.md`](docs/BUILD_NOW.md).

Until code exists, treat every live default as off. When code exists, keep
those defaults off until an operator arms them.

Current intended live candidates (once built and qualified):

- Mouth A: CoW batch solver (first production chain: BNB)
- Sidecar: Morpho Blue liquidations, Aave V3 liquidations
- Sidecar: oracle-update backruns on L1, once a bundle path is wired

Explicitly later: UniswapX, ERC-7683, Base Flashblocks arb, additional AMMs,
additional lending protocols, additional chains.

Explicitly out of scope: public-mempool sandwiching, JIT-as-a-product,
buy-and-hold new-token sniping. See [`docs/STRATEGIES.md`](docs/STRATEGIES.md)
and [`docs/LANDSCAPE.md`](docs/LANDSCAPE.md).

---

Aqua extracts value only from (1) surplus users opted into via intent auctions
and (2) liquidation bonuses that keep lending solvent. That is a product
decision, not a missing feature.
