# August 2026 product and documentation audit

**Audit date:** 24 August 2026  
**Repository reviewed:** `nick-kuhle/aqua`, commit `ed66d03`  
**Verdict (updated 24 August 2026):** strong safety-oriented product
specification with a deliberately tiny, non-networked Rust foundation; **not
yet a software product**. The repository now has a Cargo workspace, typed
primitive/risk/config code and a config-only CLI, but still has no Solidity,
Foundry project, Next.js app, deployment manifests, fixtures, CI, provider,
signer, simulator, protocol adapter, database, transport, or executable live
path. Rust 1.90, Cargo 1.90, and Foundry 1.7.1 are installed and the current
Rust foundation fmt/clippy/unit-test suite passes.
[`FOUNDATION.md`](FOUNDATION.md) is the authoritative implementation ledger.
All other claims remain target architecture unless that ledger says otherwise.

This document is the source of truth for the gap between the aspirational
architecture and what can safely be represented to an operator, contributor,
partner, or prospective CoW onboarding contact.

## What remains strategically sound

- **Intent solving first:** CoW's fair combinatorial batch auction and solver
  competition are a real, user-opted order-flow surface.[^cow] The architecture
  correctly keeps auction surplus separate from proprietary trading P/L.
- **Liquidations are useful but adversarial:** Morpho Blue and Aave V3 permit
  third-party liquidations when their respective solvency conditions are
  breached.[^morpho][^aave] The project correctly makes exact fork execution,
  valuation and post-finality reconciliation gates.
- **No sandwich, sniper, or JIT revenue row:** retain this product boundary.
  It is a defensible risk, ethics and differentiation choice.
- **One process / chain / lane:** preserve isolation of nonce state,
  qualification evidence, keys, capital limits, kill state and storage.
- **Fail-closed as a product requirement:** retain boot-only arming, durable
  nonce recovery, exact payload simulation, qualified lanes and a console that
  makes inactivity legible.

[^cow]: CoW solver and auction documentation:
    <https://docs.cow.fi/cow-protocol/concepts/introduction/solvers> and
    <https://docs.cow.fi/cow-protocol/tutorials/solvers/onboard>.
[^morpho]: Morpho's maintained and community liquidation-bot index:
    <https://docs.morpho.org/developers/ecosystem/liquidation-bots/>.
[^aave]: Aave V3 pool `liquidationCall` and account-data documentation:
    <https://aave.com/docs/aave-v3/smart-contracts/pool>.

## Material corrections to the current plan

### 1. Replace bespoke EVM plumbing with Alloy

The README says JSON-RPC, RLP and EIP-1559 signing should be small custom
auditable modules. That is the wrong audit boundary in 2026. Custom encoding,
signing, RPC and reorg handling increase the highest-consequence defect
surface. Alloy is the supported Rust EVM ecosystem direction; `ethers-rs` is
deprecated.[^alloy] Implement typed bindings, providers, signers and envelopes
with Alloy, then audit Aqua's strategy, state-pinning, nonce and submission
logic. [`ALLOY.md`](ALLOY.md) is now normative.

[^alloy]: <https://docs.rs/alloy-core/latest/alloy_core/>.

### 2. Do not promise a BNB-first production launch

CoW documentation currently says DAO bonding-pool solvers start on Arbitrum
before moving to other L2s; it does **not** support a hard-coded “BNB first”
product promise.[^cow] Treat chain, shadow/staging access, bonding, KYC,
reward accounting and driver ownership as operator-verified external
prerequisites. Replace hard dates, reward values, service-fee statements and
“next Tuesday” launch assertions with an onboarding evidence checklist.

### 3. Model UniswapX per chain, not as one Dutch-order codec

Current UniswapX documentation describes different auction mechanics:
Ethereum uses RFQ then exclusive Dutch fallback, Arbitrum uses direct Dutch
auctions, and Base/Unichain use priority-gas auctions.[^uniswapx] An adapter
must carry the chain-specific auction semantics, order API/webhook quality,
Permit2/replay rules, fill callback, fee policy, inventory and markout. It
cannot safely be a generic `score_fill(order, t)` implementation alone.

[^uniswapx]: <https://docs.uniswap.org/contracts/uniswapx/auctiontypes> and
    <https://docs.uniswap.org/contracts/uniswapx/fillers/filleroverview>.

### 4. Treat ERC-7683 as a wire format, not a strategy or settlement guarantee

ERC-7683 standardizes cross-chain order/settler interfaces but does not
standardize liquidity, price discovery, finality, proof verification,
reimbursement timing, bridge trust, refunds or inventory financing.[^erc7683]
Aqua should only add a protocol-specific adapter after a route-specific risk
memo identifies the origin/destination contracts, fill/reimbursement states,
finality clocks, replay domains, bridge/attestor assumptions and worst-case
capital at risk. Do not call an ERC-7683 crate “Across” by default.

[^erc7683]: EIP-7683: <https://eips.ethereum.org/EIPS/eip-7683>.

### 5. Bundle transport is a multi-venue policy, not `SubmissionMode::Bundle`

Ethereum searcher delivery needs a transport abstraction that records relay /
builder endpoints, authentication, target-block range, cancellation/replacement
semantics, simulation response, privacy policy and inclusion/rejection reason.
MEV-Share is backrun-only and uses `mev_sendBundle` composition/privacy rules;
it is not interchangeable with a private raw transaction or a generic bundle
relay.[^mevshare] Oracle backrunning must remain disabled until exact transport
semantics are integration-tested end-to-end.

[^mevshare]: <https://docs.flashbots.net/flashbots-mev-share/introduction> and
    <https://docs.flashbots.net/flashbots-mev-share/searchers/understanding-bundles>.

### 6. Treat every named protocol deployment and chain capability as volatile data

The docs contain unverified addresses/assumptions and imply uniform support.
Implement a versioned, code-hash-attested registry with source URL, verified
block, proxy implementation, chain deployment, ABI version, capability and
sunset/revalidation date. A missing or changed entry disables that adapter.
Never put deployment addresses directly in prose as authority.

### 7. Narrow v0 relentlessly

The only credible initial deliverable is:

1. read-only Alloy chain client + block/hash pinning;
2. deterministic V2 quote fixtures and a pure naive route baseline;
3. `AquaExecutor` with Foundry unit/fuzz/invariant tests;
4. Anvil exact-payload simulator;
5. SQLite safety journal (nonce reservation, payload bytes, state identity,
   transition audit); and
6. a **shadow-only** CoW adapter after current onboarding is confirmed.

Morpho/Aave live liquidation, oracle backrun, CoW staging, UniswapX inventory
and cross-chain filling are not phase-0 features. A simulation-only adapter
still needs real ABI fixtures and differential tests before it may be shown as
implemented.

## Required engineering gates before any value-bearing transaction

| Gate | Evidence that must exist |
| --- | --- |
| Supply-chain | pinned Rust/Foundry/Node toolchains; lockfiles; dependency/license scan; CI provenance. |
| Protocol registry | address + code hash + ABI + verified block + source URL; proxy upgrade detection. |
| Exact execution | signed bytes simulated at a pinned block and target state; all calls and callback paths covered. |
| Independent validation | second RPC / trace or fork backend for critical state and post-trade facts; disagreement halts. |
| Key isolation | distinct signer identities and OS/service permissions; no key in env dump, crash report, UI or DB. |
| Transport | endpoint-specific auth, simulation, cancellation and inclusion reconciliation tests. |
| Economic safety | token allowlist, decimal checks, route liquidity bounds, gas/bribe caps, inventory/drawdown caps, adversarial markout. |
| Operations | durable state backup/restore drill, reorg drill, RPC/WS failure drill, kill-switch test and alert routing. |
| Qualification | immutable build/artifact/config identity; per-chain/per-row/per-transport evidence, not a time-only seven-day counter. |
| External onboarding | current written confirmation of CoW environment, driver, bond/KYC, chain and reward terms. |

## Documentation changes made in this working tree

- Added [`ALLOY.md`](ALLOY.md): normative Alloy boundary and implementation
  rules.
- Added this audit: explicit repository status, current market corrections and
  product gates.
- Updated architecture/build/setup/roadmap/testing/index documents to point to
  Alloy and to remove the false implication that custom EVM plumbing is the
  desired implementation.

## Suggested next repository milestones

1. Approve this audit and choose a maintainer responsible for the protocol
   registry and release attestations.
2. Create the real Cargo workspace, Foundry project, lockfiles and CI; do not
   merge empty directory scaffolds as “implementation.”
3. Implement and test the shadow-only vertical slice above.
4. Obtain current CoW onboarding terms in writing; select the supported
   shadow environment from that evidence, not from this document.
5. Produce a signed threat model and a route-by-route risk memo before any
   live lane is added.

No PAT is needed to make the attached documentation changes. A PAT with
repository **contents: write** (or a maintainer-created branch/PR) is needed
only to publish them upstream. Do not grant administration, workflow,
organization, package, delete-repository, or broad classic `repo` privileges.
