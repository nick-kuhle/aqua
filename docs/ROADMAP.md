# Roadmap

Development finishes before a soak begins. They are different jobs.

| | Owner | Question | Exit |
| --- | --- | --- | --- |
| **Build** | engineering + math | Is it correct, complete, production-grade? | CI green; no stub on the live path; operator controls exist; docs current |
| **Soak** | operators | Does this binary make money on this chain, safely? | `GET /api/qualification` `PASS` per row from ≥7 days of continuous evidence |

A soak that finds a code defect is a build escape. Soak stops, fix
ships through CI, clock restarts. Evidence is only meaningful about the
build that produced it.

---

## Phase 0 — strip-shaped greenfield (days 1–10)

- [ ] Repo skeleton as in `ARCHITECTURE.md`
- [ ] `AquaExecutor` + tests + deterministic artifacts
- [ ] engine-core: types, config, rpc, risk, store, qualification
- [ ] anvil sim, pinned block
- [ ] dex-graph: V2 + V3 caches, `Edge`, cycle search
- [ ] `optimizer::naive` + one-day CoW dump
- [ ] `Solution` / `Auction` / `Opportunity` frozen 30 days
- [ ] Console shell: header, demo, chain pill, overview, funnel empty
- [ ] `make doctor`
- [ ] Company + CoW KYC pack started

Kill: bytecode drift job, `naive` exists, types frozen.

---

## Phase 1 — optimizer vs naive (days 10–35)

- [ ] 7-day frozen CoW tape
- [ ] v1 matching + 3-rings + AMM spill
- [ ] **Beat naive every day of the tape**
- [ ] Fork-sim solutions; tape revert sample < 5%
- [ ] Mouth A HTTP, shadow
- [ ] Sidecar Morpho + Aave compile, sim-only, valuation behind flag
- [ ] Optimizer page in the console

**Kill gate:** surplus ≤ naive on the tape → do not add mouths. Fix the
objective.

---

## Phase 2 — shadow CoW + sim liquidations (days 35–60)

- [ ] Shadow wins > 0, revert < 2%
- [ ] Staging + DAO-pool driver
- [ ] Morpho `sim success` > 0 with `TOKEN_VALUATION`
- [ ] Oracle detector observational
- [ ] Qualification rows live (`INSUFFICIENT SAMPLE`)
- [ ] Alerts + `/api/metrics`

---

## Phase 3 — first dollars (days 60–90)

- [ ] CoW production **BNB**
- [ ] First Tuesday COW ≥ 0 (zero is a data point; negative is an incident)
- [ ] Ethereum Morpho `LIVE_SMOKE_MAX` ≤ 5, then soak
- [ ] Oracle-backrun live-candidate **only if** L1 bundle path is real
- [ ] Day-90 memo ([`BUILD_NOW.md`](BUILD_NOW.md) capital table, this file’s gates)

| Day-90 reading | Action |
| --- | --- |
| Tape ≤ naive | Stop |
| Shadow wins = 0 after 3 weeks | Stop or hire |
| BNB payout > 0, revert < 2% | Unlock Base/Arb CoW |
| Morpho sim prints, smoke survived | Unlock 7-day soak |
| Both dead | Kill. Do not “pivot” to sniping |

---

## Phase 4 — second mouth + Base (days 90–150)

Only if Phase 3 has a payout **or** sidecar nets > gas.

- [ ] CoW on Base and Arbitrum
- [ ] UniswapX, one chain, stables+WETH, `MIN_FILL_BPS`
- [ ] Register Aave/Morpho on Base
- [ ] Flashblocks ingest with `state_id`; searcher-tx-only backrun
- [ ] Aerodrome volatile edges behind a flag
- [ ] ERC-7683 stub → real adapter if inventory exists

---

## Phase 5 — later (month 6+)

- Curve / Balancer swap edges if the tape says so
- Compound, Maker sidecar
- Ethereum CoW mainnet (after L2 score)
- Self-bond graduation
- 1inch Fusion if UniswapX markout is green
- Uni V4 allowlisted hooks
- Cross-chain CoW
- **Not:** Solana in this engine, sandwiches, JIT-as-product, sniper

---

## Out of this repo

Consumer Hyperliquid frontends, retail swap fee routers, market-making
books as a product. Those are other companies that might *buy* Aqua’s
filler. They do not live here.

---

## Versioning

Tagged releases only soak. `aqua 0.1.0` is Phase 0 CI green.
Qualification evidence names the tag. A `main` soak is a mistake.
