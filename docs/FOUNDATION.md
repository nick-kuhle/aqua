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
| CLI | `bot/crates/node/src/main.rs` | `aqua doctor` parses config only and explicitly performs no network/signing | API, scheduler, database, Anvil, chain access, transport, live execution |

## Safety status

- **No EVM provider is constructed.**
- **No RPC/WS request is made.**
- **No signer, private-key parser, execution key, or transaction encoder exists.**
- **No contract, frontend, deployment artifact, protocol adapter, simulator,
  database, replay fixture, qualification evidence, or live path exists.**
- `LIVE_EXECUTION=true` is accepted only as a config-validation state; it does
  not and cannot broadcast because no executor/transport exists.

## Verified foundation checks

On 25 August 2026, this repository was verified with Rust `1.90.0`, Cargo
`1.90.0`, and Foundry `1.7.1` (`forge`, `cast`, and `anvil`). The following
checks passed:

```bash
cd bot
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace             # 7 unit tests passed
cargo run -p aqua -- --help
```

`forge --version` and `anvil --version` also passed. Foundry is installed, but
there is not yet a Foundry project under `contracts/`; that is the next build
item. A failing compile/test is a blocker. Do not use this foundation to claim
an operational bot.

## Next approved increment

Implement **read-only, non-signing** Alloy provider construction and block/hash
pinning behind a trait, with deterministic mock tests. It must not add private
key parsing, `sendTransaction`, raw submission, a protocol adapter, or an API.
See [`BUILD_NOW.md`](BUILD_NOW.md) and [`ALLOY.md`](ALLOY.md).
