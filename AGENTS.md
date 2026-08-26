# Aqua — project instructions

Simulation-first intent solver and liquidation engine. Thin bot, detailed
console, fail-closed live path.

## Doctrine

- Measurement instrument that is allowed to trade. Few surviving
  candidates is the steady state.
- Simulation is the arbiter. Pinned `state_block`. Never `latest`.
- Mouths are codecs over `Solution`. Sidecar is a separate nonce lane.
- Optimizer is the company. A change that loses to `naive` on the frozen
  tape does not merge — and "loses" now includes lower fairness survival
  or lower settlement success, not just lower surplus.
- There is no generic `send`. `Transport` is a closed enum; each variant
  carries its own atomicity, privacy, refund and auction-payment semantics.
- `revm` screens, Anvil decides. Never the reverse, never only one.
- Protocol major version is part of row identity: Aave v3 ≠ v4,
  Morpho Blue ≠ Morpho V2.
- On SVR-covered feeds the OEV is auctioned, not raced. `svr_coverage:
  unknown` disables the row.
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
| Morpho / Aave v3+v4 / oracle | `docs/SIDECAR.md` |
| Bundles, refunds, OEV auctions | `docs/TRANSPORT.md` |
| 2026 market facts + sources | `docs/RESEARCH_2026.md` |
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
