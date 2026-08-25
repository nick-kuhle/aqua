# `bot/` — planned Rust workspace

> **Not implemented.** This directory contains no Cargo workspace or Rust
> source at commit `6c64e12`. The layout below is a target design only.

The future engine is a **Rust application**. It will use the **Alloy Rust
libraries** for every EVM-facing concern, following
[`docs/ALLOY.md`](../docs/ALLOY.md). Alloy is a dependency inside the Rust
engine—not a second language or service. The optimizer must remain deterministic
and provider-, signer-, transport-, wall-clock-, and secret-free.

```text
crates/
  engine-core/      types, config, Alloy boundary, risk, inventory, store, qualification
  dex-graph/        pure V2/V3 snapshot edges and cycle search
  sim/              pinned Anvil fork execution
  settlement/       typed AquaExecutor calldata
  optimizer/        pure baseline and surplus/fill optimization
  mouth-cow/        CoW adapter
  mouth-uniswapx/   chain-specific UniswapX adapter
  mouth-7683/       protocol-specific cross-chain adapters, later
  sidecar-liq/      Morpho/Aave candidate builders
  sidecar-arb/      research-only atomic graph candidates
  submit/           transport-specific submission/reconciliation
  node/             composition root and chain-cell binary
```

The intended dependency graph is in [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md),
scaling/leadership rules in [`docs/SCALE.md`](../docs/SCALE.md), and the first
build cut in [`docs/BUILD_NOW.md`](../docs/BUILD_NOW.md).