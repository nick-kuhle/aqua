# `replay/` — planned deterministic fixtures

> **Not implemented.** There are no committed CoW auction tapes, liquidation
> windows, or replay runner at commit `6c64e12`.

The intended future layout is:

```text
cow-batches/     redacted, versioned CoW auction fixtures for baseline comparison
liq-windows/     oracle/health-factor/reorg fixtures for candidate replay
```

Fixtures must be sanitized, provenance-tagged, pinned to state identity, and
usable without live RPC in CI. `make tape` does not exist yet; it will become a
blocking check for optimizer changes only after the workspace and fixtures are
implemented. See [`docs/OPTIMIZER.md`](../docs/OPTIMIZER.md) and
[`docs/TESTING.md`](../docs/TESTING.md).