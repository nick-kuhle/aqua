# Future scope

**Status: normative target specification — no implementation exists as of 24 August 2026.**

Things Aqua is shaped to absorb without a rewrite, and things it will
refuse. This is not a promise to build them. Each item needs a memo and
a tape (or a TVL print) before a crate.

---

## Mouths

| Item | Shape already in the code | Gate |
| --- | --- | --- |
| UniswapX | `mouth-uniswapx`, `Order`, `Objective::Filler` | Mouth A staging + tape > naive |
| ERC-7683 / Across | `mouth-7683`, `Intent7683` | Inventory exists; exotic route book |
| 1inch Fusion | new mouth crate | UniswapX markout green; resolver access |
| CoW non-EVM destination | Mouth A codec extension | EVM CoW `PASS` |
| Additional 7683 layers | same codec if they mean it | Volume on a route we inventory |

---

## Sidecar

| Item | Shape | Gate |
| --- | --- | --- |
| Compound V3 | `Strategy::LiquidationCompound` | Morpho/Aave `PASS` |
| Maker | `Strategy::LiquidationMaker` | same |
| Base / Arb lending | address profile | Ethereum sidecar evidence |
| Spark / fork Aaves | profile | TVL memo |
| Partial Morpho liqs | size to pool depth | after full-close is live |
| More oracle families | detector table | when they hit the mempool we see |

---

## Graph

| Item | Shape | Gate |
| --- | --- | --- |
| Aerodrome volatile / stable | `Edge` + flags | Base Flashblocks path, fork parity |
| Curve, Balancer swaps | `Edge` | tape lift vs naive+v1 |
| Uni V4 allowlisted hooks | `Edge` + hook allowlist | hook we can simulate |
| Inventory as virtual edge | `InventoryEdge` | Mouth B book |

---

## Chains

Order: BNB (CoW) → Ethereum (sidecar) → Base → Arbitrum → env-driven
others.

| Chain | What is different |
| --- | --- |
| Polygon, Avalanche, Linea, … | CoW already rewards there; profile + gas |
| Timeboost (Arbitrum) | new submitter, auction for express lane |
| Solana | **not this engine** |

Adding a chain: [`CHAINS.md`](CHAINS.md). Survive a week of simulation
before starting the next.

---

## Console

- Multi-tag compare (this soak vs last)
- Operator-entered weekly COW vs protocol Dune (manual is v1)
- Mouth B inventory UI
- Mobile go-live wizard (already specified to work at 390px)

Not: a consumer trading terminal, charts as a product, social.

---

## Research that is not a row

- LVR-recapture hooks as an LP product (needs TVL we don’t have)
- Solver-level coincidence across CoW and UniswapX in one batch
  (type-possible, legally/protocol-different)
- Cross-domain reorg games (1–2 σ events; do not build the engine
  around them)

---

## Hard no

- Public-mempool sandwich live row
- JIT as revenue
- Directional sniper
- Mixing Mouth A nonce with sidecar
- Qualification evidence reuse across populations
- A flag that turns Aqua into a general-purpose “MEV marketplace”

When in doubt, add a **watch** line to [`STRATEGIES.md`](STRATEGIES.md)
and a date to [`LANDSCAPE.md`](LANDSCAPE.md), not a crate.
