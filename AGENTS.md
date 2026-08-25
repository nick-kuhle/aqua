# Aqua — project instructions

Simulation-first intent solver and liquidation engine. Thin bot, detailed
console, fail-closed live path.

## Doctrine

- Measurement instrument that is allowed to trade. Few surviving
  candidates is the steady state.
- Simulation is the arbiter. Pinned `state_block`. Never `latest`.
- Mouths are codecs over `Solution`. Sidecar is a separate nonce lane.
- Optimizer is the company. A change that loses to `naive` on the frozen
  tape does not merge.
- One process per chain. Qualification populations do not overlap.
- No public-mempool sandwich row, no JIT-as-revenue, no directional
  sniper, no Solana in this engine.

## Where to look

| Task | Doc |
| --- | --- |
| What to build first | `docs/BUILD_NOW.md` |
| Types and loops | `docs/ENGINE.md` |
| Surplus math | `docs/OPTIMIZER.md` |
| CoW / UniswapX / 7683 | `docs/MOUTHS.md` |
| Morpho / Aave / oracle | `docs/SIDECAR.md` |
| Console | `docs/FRONTEND.md` |
| Arming | `docs/SIM_TO_LIVE.md` |
| PR bar | `docs/CONTRIBUTING.md` |
| Footguns | `docs/MAINTAINING.md` |

## Code rules

- Integer AMM math on the settlement path.
- Funnel counters on every new row.
- Runtime can only narrow boot enablement.
- `AquaExecutor` bytecode moves only in an explicit contract PR.
- Secrets never in git. `API_AUTH_TOKEN` required if bind is not loopback,
  including simulation.
