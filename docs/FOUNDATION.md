# Implemented foundation ledger

**Status: implementation ledger — 25 August 2026.** This is the only document
that makes a positive implementation claim. All other documents remain target
specifications unless an item is listed here with a path and verification.

## Foundation 0: safety kernel

| Component | Path | Implemented scope | Explicitly not implemented |
| --- | --- | --- | --- |
| Rust workspace | `bot/Cargo.toml` | Workspace, Rust 1.90 toolchain pin, package metadata | CI, lockfile, release pipeline |
| EVM dependency baseline | workspace dependencies | `alloy-primitives` for canonical EVM types in pure domain code | providers, transports, ABI bindings, signers, transaction submission |
| Core types | `bot/crates/engine-core/src/types.rs` | candidate, lane, block/hash and state identity types | persistence, nonce allocator, event ingestion |
| Boot config | `bot/crates/engine-core/src/config.rs` | injected-map parser; forbidden unit aliases; simulation default; live acknowledgement/broadcast/registry gates | dotenv loading, registry signature validation, RPC checks, secrets integration |
| Risk kernel | `bot/crates/engine-core/src/risk.rs` | deterministic ordered risk gate with unit tests | price/valuation, inventory, drawdown, qualification store, execution |
| Transport identity | `bot/crates/engine-core/src/transport.rs` | closed `Transport` enum with per-variant atomicity/privacy/refund/payment semantics; boot-time `TransportPolicy` with bid caps, drop permission and endpoint bounds; `RefundLedger` separating expected/observed/reconciled | **any** network code, endpoint client, auth, signing, submission, or reconciliation implementation |
| Capability identity | `bot/crates/engine-core/src/capability.rs` | version-specific `Capability` enum (Aave v3 ≠ v4, Morpho Blue ≠ V2); `SvrCoverage` tri-state defaulting to `Unknown`; `permitted_oracle_row` fail-closed resolver | registry loading, signature/attestation checks, addresses, ABIs, code-hash reads |
| CLI | `bot/crates/node/src/main.rs` | `aqua doctor` parses config only and explicitly performs no network/signing | API, scheduler, database, Anvil, chain access, transport, live execution |

## Safety status

- **No EVM provider is constructed.**
- **No RPC/WS request is made.**
- **No signer, private-key parser, execution key, or transaction encoder exists.**
- **No contract, frontend, deployment artifact, protocol adapter, simulator,
  database, replay fixture, qualification evidence, or live path exists.**
- `LIVE_EXECUTION=true` is accepted only as a config-validation state; it does
  not and cannot broadcast because no executor/transport exists.
- The `transport` and `capability` modules are **pure decision types**. They
  describe what a transport or capability *means* and refuse unsafe
  combinations. They contain no endpoint, no client, no address and no ABI, and
  cannot cause a network request. Naming a transport is not having one.

## Foundation 1: 2026 market-correction types (25 August 2026)

Added so that three corrections in [`RESEARCH_2026.md`](RESEARCH_2026.md) are
enforced by the compiler before any adapter exists:

- A generic `send(..., bundle: bool)` is unrepresentable: `Transport` is a
  closed enum and every call site must match exhaustively.
- Refunds cannot be booked as revenue: only `RefundLedger::realized_wei()`
  (reconciled, finalized) is exposed as realized value.
- An Aave v3 registry entry cannot satisfy an Aave v4 requirement, and
  `SvrCoverage::Unknown` — the default — rejects every oracle-triggered row.

## Verified foundation checks

On 25 August 2026, this repository was verified with Rust `1.90.0`, Cargo
`1.90.0`, and Foundry `1.7.1` (`forge`, `cast`, and `anvil`). The following
checks passed:

```bash
cd bot
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked    # 30 unit tests passed
cargo run -p aqua -- --help
```

Repository-level gates, runnable without a network:

```bash
./scripts/check-secrets.sh         # committed env/key/credential scan
python3 scripts/check_docs.py      # links, status banners, retired names
```

`forge --version` and `anvil --version` also passed. Foundry is installed, but
there is not yet a Foundry project under `contracts/`; that is the next build
item. A failing compile/test is a blocker. Do not use this foundation to claim
an operational bot.

Note: on 25 August 2026 `cargo fmt --check` was **failing** on the previously
committed tree. It was reformatted in the same change that introduced CI, so
that the first CI run is meaningful rather than red on arrival.

## Next approved increment

Implement **read-only, non-signing** Alloy provider construction and block/hash
pinning behind a trait, with deterministic mock tests. It must not add private
key parsing, `sendTransaction`, raw submission, a protocol adapter, or an API.
See [`BUILD_NOW.md`](BUILD_NOW.md) and [`ALLOY.md`](ALLOY.md).
