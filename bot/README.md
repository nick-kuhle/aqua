# bot/

Thin Rust engine. Workspace layout is in `docs/ARCHITECTURE.md`.

```
crates/
  engine-core/      types, config, rpc, risk, inventory, store, qualification
  dex-graph/        Edge, V2/V3 caches, cycle search
  sim/              anvil fork
  settlement/       AquaExecutor calldata
  optimizer/        no RPC — the company
  mouth-cow/
  mouth-uniswapx/
  mouth-7683/       stub until phase 3
  sidecar-liq/
  sidecar-arb/
  submit/
  node/             bin aqua
```

Crate graph: `optimizer` does not depend on `rpc`. Mouths do not depend
on each other. Sidecar does not import Mouth A.

Start here: `docs/BUILD_NOW.md`, `docs/ENGINE.md`, `docs/OPTIMIZER.md`.
