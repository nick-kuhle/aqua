# Rust and Alloy implementation standard

**Status: mandatory target standard for new Rust EVM code — 25 August 2026.**
A small Rust foundation uses `alloy-primitives` today; its exact scope is
listed in [`FOUNDATION.md`](FOUNDATION.md). This document is the implementation
contract for the future EVM-facing workspace described in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Unambiguous technology decision

Aqua's off-chain execution engine is a **Rust application**. **Alloy is the
Rust Ethereum/EVM library ecosystem used inside that application**—it is not a
replacement programming language, separate bot runtime, or smart-contract
language. Foundry/Solidity is the separate toolchain for Aqua-owned EVM
contracts; Next.js/TypeScript is the separate toolchain for the operator UI.

| Surface | Chosen technology | Why |
| --- | --- | --- |
| Chain cell, optimizer, risk, simulation orchestration, API, storage, transport | Rust | predictable performance, memory/concurrency discipline, static types, deployment as one audited binary |
| EVM types, ABI bindings, providers, transports, signing and transaction envelopes | Alloy for Rust | maintained, typed Rust-native EVM stack; avoids custom encoding/signing/RPC surface |
| AquaExecutor and contract tests/deployment | Solidity + Foundry | native EVM contract implementation, fuzz/invariant testing and fork tooling |
| Operator console | Next.js + TypeScript | browser/server UI boundary; never signs execution payloads |

**Rule for developers:** write engine code in Rust; import Alloy crates only at
EVM boundaries. Do not write an "Alloy service," mix `ethers-rs` into the
workspace, or reimplement the pieces Alloy provides.

Aqua must use Alloy, not handwritten JSON-RPC, RLP, EIP-1559 signing, ABI
encoding, or an `ethers-rs` compatibility layer. `ethers-rs` is deprecated in
favour of Alloy; Alloy provides the typed primitives, providers, transports,
signers, RPC types and `sol!` bindings required here.[^alloy]

[^alloy]: Alloy documentation: <https://alloy.rs/introduction/installation/>;
    alloy-core documents the ethers-rs migration recommendation:
    <https://docs.rs/alloy-core/latest/alloy_core/>.

## Dependency boundary

Use the Alloy meta-crate with an explicit, minimal feature set in crates that
talk to EVM nodes. Pin exact compatible versions in the workspace lockfile;
record every version bump in the release notes and rerun fork/tape tests.

```toml
[workspace.dependencies]
alloy = { version = "1", default-features = false, features = [
  "contract", "provider-http", "provider-ws", "rpc-types",
  "signer-local", "network", "sol-types"
] }

# Only in the simulator crate, never in optimizer:
alloy-node-bindings = "1"
```

The exact major/minor version is deliberately not asserted by this document:
resolve it at implementation time against Rust's MSRV and commit `Cargo.lock`.
Do **not** use a floating git revision in a live trading binary.

| Crate | Alloy allowed? | Rule |
| --- | --- | --- |
| `engine-core` | primitives, RPC traits/types | Owns chain-safe types and provider construction interfaces. |
| `settlement`, `mouth-*`, `sidecar-*`, `submit`, `sim` | yes | Typed ABI calls, transport and signed envelopes live here. |
| `dex-graph` | primitives only | Quotes are pure over a pinned snapshot; no provider. |
| `optimizer` | primitives / `sol-types` only if unavoidable | **No provider, signer, transport, wall clock, or RPC.** |
| `node` | yes | Wires concrete transports, metrics and shutdown. |

## Required patterns

1. **Use `sol!` for every ABI.** Keep source ABI definitions in a small,
   reviewed `bindings` module. Generate calldata with typed calls and decode
   typed errors. A selector assertion and a fork test are required for every
   new write call.
2. **Use `U256`, `I256`, `Address`, `B256`, `Bytes`, and `FixedBytes`** from
   Alloy. No decimal `f64` / `f32` or ad-hoc hexadecimal strings on the
   settlement path. Human-unit parsing belongs at config/UI boundaries only.
3. **Construct providers explicitly** with `ProviderBuilder`; use HTTPS for
   request/response RPC and a separately supervised WS transport for heads or
   orderflow. Set request, connect, and per-operation deadlines. A dead WS
   stream must reconnect with bounded backoff and emit a gap/rewind event.
4. **Use `EthereumWallet` + `PrivateKeySigner` only at the signing edge.**
   Secret material must be zeroized where practical, never formatted in logs,
   and never cross into optimizer, console, persistence, errors, or telemetry.
5. **Use tested typed transaction requests/envelopes.** For the execution
   edge, populate chain ID, nonce, gas limit, fee fields and any envelope-type
   fields explicitly; persist the exact signed bytes and hash before any raw
   submission. Recommended Alloy fillers are useful for read-only/development
   construction, but the live execution path must not let a filler or provider
   mutate fields after pre-send simulation. Enable a new envelope type only
   after its chain-specific tests and registry policy exist.
6. **Pin every read to a block identity.** Store at least block number and
   hash. Reads for a candidate use that block; just before sending, build a
   fresh candidate for the chosen target state. Detect a reorg/hash mismatch
   and discard it rather than silently mixing state.
7. **Quorum critical reads.** For chain ID, head, block hash, executor code
   hash, account nonce and post-trade reconciliation, compare two independent
   RPC providers where practical. Disagreement is a fail-closed incident, not
   a retry against whichever endpoint answers first.

## Provider and signer construction sketch

This is illustrative; implementation must compile against the pinned Alloy
release and must not copy the snippet without tests.

```rust
use alloy::{
    network::EthereumWallet,
    providers::ProviderBuilder,
    signers::local::PrivateKeySigner,
};

let signer: PrivateKeySigner = key.parse()?;
let wallet = EthereumWallet::from(signer);
let provider = ProviderBuilder::new()
    .wallet(wallet)
    .connect_http(rpc_url.parse()?);
```

The provider above is a construction detail, not global state. Pass narrow
traits/interfaces into submitters and use deterministic fixtures in the
optimizer.

## Simulation is not provider estimation

Alloy's `estimate_gas`, `call`, traces and receipt decoding are useful
pre-filters and diagnostics. They are **not** Aqua's profit authority. The
live gate remains an exact signed-payload execution on an Anvil fork pinned to
the candidate's block, plus transport-specific simulation where available.
`eth_estimateGas` must never be allowed to mutate the payload that was
simulated.

## Two-tier simulation: `revm` screens, Anvil decides

Correctness is non-negotiable; simulation *cost* decides how many candidates
can be evaluated per block. Published Rust benchmarks on the same workload
(read 25 August 2026, see [`RESEARCH_2026.md`](RESEARCH_2026.md) §4) put 100
sequential `eth_call`s at ~89 ms against a local node and ~4.4 s against a
third-party provider; Anvil at ~120 ms / ~868 ms; in-process `revm` at ~80 ms /
~1010 ms; and `revm` with a warm state cache plus a purpose-built quoter
contract at ~19 ms / ~405 ms. Re-benchmark on Aqua's own hardware before
quoting any of these numbers.

Aqua therefore defines **one `Simulator` trait with two implementations**:

| Role | Backend | Authority | Used for |
| --- | --- | --- | --- |
| Screen | in-process `revm` | **none** | Ranking, pruning, search-loop inner evaluation |
| Authority | Anvil fork, pinned block | **yes** | The exact signed payload, persisted simulation evidence |

Binding rules:

1. `SIM_AUTHORITY_BACKEND` cannot be set to the screening backend. A config
   that tries fails boot.
2. A candidate may **never** reach a send-capable interface on screening
   evidence alone. What is persisted as simulation evidence, and what the risk
   gate reads via `exact_payload_simulated`, is the authority result.
3. A **differential test is a merge gate**: over the committed fixture corpus,
   the two backends must agree on revert status, gas, and every balance delta.
   Disagreement fails CI.
4. At runtime, disagreement between screen and authority on a live-capable lane
   is an incident (`sim_backend_disagreement`), narrows the lane to simulation,
   and is never resolved by preferring the faster answer.
5. The screening backend must be deterministic and replayable from the same
   pinned state identity. No wall clock, no network inside the search loop.
6. `revm` and Anvil versions are pinned together and bumped together, with the
   differential corpus re-run in the same change. Foundry/Anvil is itself a
   `revm` consumer, so a mismatched pair can silently diverge.

Reth **ExEx** (post-execution hooks with reorg awareness, avoiding polling
entirely) is recorded as the long-term ingest option for a self-hosted node
cell. It is a W10 concern, not v1, and does not change the authority rule.

## ABI inventory and ownership

Before writing a protocol adapter, commit a machine-readable ABI/address
manifest keyed by `chain_id`, deployment address, code hash, block range and
source URL. At minimum it covers AquaExecutor, ERC-20, WETH, Balancer vault,
CoW settlement interfaces, Uniswap routers/reactors, Morpho, Aave pool/data
provider, and every oracle selector watched by the sidecar. Address-only
registries are insufficient: proxy implementation changes and chain aliases
are material risk.

See [`TESTING.md`](TESTING.md) for selector, binding, fork and differential
test requirements, and [`RISK.md`](RISK.md) for the send gate.
