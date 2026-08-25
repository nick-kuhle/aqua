# replay/

Frozen fixtures. No live RPC in CI.

```
cow-batches/     redacted CoW instance.json tapes — optimizer vs naive
liq-windows/     oracle + health-factor fixtures
```

`make tape` is blocking when `optimizer/` changes. Refresh monthly.
See `docs/OPTIMIZER.md` and `docs/TESTING.md`.
