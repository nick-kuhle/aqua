# Chains

**Status: normative target specification — no implementation exists as of 24 August 2026.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

One process per chain. One env file, port, database, systemd instance
(`aqua@bnb`, `aqua@ethereum`, `aqua@base`). Qualification clocks never
couple.

---

## Built-in profiles

| `CHAIN_ID` | Name | sequencer_only | v1 job |
| --- | --- | --- | --- |
| 1 | Ethereum | no | Sidecar; CoW later |
| 56 | BNB | no (public mempool exists; CoW may be considered) | Candidate only; verify current CoW terms |
| 8453 | Base | yes | CoW after BNB; Flashblocks later |
| 42161 | Arbitrum | yes | CoW after Base; Timeboost later |

Any other id: empty profile. Fill `*_ADDRESS` env vars. Boot warns on
every missing capability the enabled strategies wanted.

---

## What varies

| Layer | Mechanism |
| --- | --- |
| Addresses | `ChainAddresses` + env overrides |
| Strategy construction | Absent protocol → skip + warn |
| Discovery | Factories from the profile |
| Submission | `bundle` / `raw` / `cow_driver` |
| Qualification backend | `relay` / `sequencer` / `solver-auction` |
| Delivered blocks | Relay data API vs chain heads vs Flashblocks |
| Refork cadence | 12 s ETH vs 2 s Base — `REFORK_EVERY_BLOCKS` |
| Bribe | 0 on sequencer and CoW; bundle-only on ETH sidecar |

---

## Adding a chain

1. Add a reviewed, code-hash-attested registry manifest per
   [`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md), then add `ChainAddresses`
   as a derived convenience profile or document a full env overlay.
2. Verify every address against official docs **and** a live getter
   (factory `allPairsLength`, vault `WETH`, Morpho `idToMarketParams` on
   a known id).
3. `.env.example.<name>`
4. Console `CHAINS` entry, explorer base, native symbol.
5. If sequencer: default front-run rows off; `SubmissionMode::Raw`;
   `BRIBE_BPS=0`.
6. Simulate a week before the next chain. Roadmap order is BNB → ETH →
   Base → Arb on purpose.

Do not copy Ethereum Aave into a Base env. That is how you simulate
garbage and call it a funnel.

---

## Base specifics (phase 4)

- No public mempool. Sandwich-shaped rows are not constructed.
- Flashblocks: `TxSource::Flashblock` with `state_id`. Submit **only**
  the searcher transaction. Never strip a victim off an `Opportunity` to
  make raw mode accept it.
- One V2 venue is not a graph. Need V3 + Aerodrome (or two real venues)
  before pending arb emits.
- Lending exists; register after Ethereum sidecar evidence.
- Qualification: independent state compare, disjoint from outcome
  matches.

---

## BNB specifics (phase 3)

- Do not assume a DAO-pool chain ordering. Confirm the current CoW shadow,
  staging, driver, bond/KYC and supported-chain terms in writing before this
  profile is made a rollout candidate.
- DEX set is not Ethereum’s. Profile factories/routers from current
  canonical deployments; re-verify at implement time (they move).
- Encrypted-mempool work on BNB is a landscape item. Mouth A does not
  need the public mempool. Sidecar on BNB is not v1.
