# Adding things

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The compiler should nag you. If you can add a row without touching the
funnel, you did it wrong.

---

## Add a mouth

Before code: write a route/protocol risk memo and create the reviewed registry
entry required by [`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md). A generic
wire-format claim (for example “ERC-7683”) is not an integration.

1. Crate `mouth-<name>/`. Depends on `engine-core` + `optimizer`. Does
   not depend on other mouths or `sidecar-liq`.
2. `MouthId` variant. Codec: foreign schema ↔ `Solution`.
3. `EngineEvent` variant if ingest is push.
4. Boot toggle. Off = not constructed.
5. Plan a transport adapter in `submit/`; no `cow_driver` mode exists yet.
6. Qualification backend or a new population. Do not reuse another
   mouth’s evidence.
7. Funnel counters, console scoreboard, empty-state copy.
8. Config keys in [`CONFIG.md`](CONFIG.md) and `.env.example`.
9. Tests: decode a fixture, encode a `Solution`, reject a stale
   deadline.

If the mouth needs inventory, it gets a halt and a cap that the sidecar
cannot trip.

---

## Add a sidecar strategy

1. `Strategy` variant. Update `all()`, `as_str()`, `live_candidate()`,
   `shadow_only_reason()`.
2. Toggle on `StrategyToggles`. Off = not constructed.
3. `pub mod` + `StrategyImpl`.
4. Construct in `engine` only if the **profile** has the protocol.
5. Funnel. Console empty-state. Qualification row.
6. Happy-path unit test + one reject path.
7. If it runs on every pending tx: profile it. Pending is the hot path.

Do not add a strategy that needs `f64` AMM math on the settlement path.

---

## Add an AMM

Not a strategy. An `Edge` in `dex-graph`.

1. Verify factory/router/pool against official sources **and** live
   getters. Fee location especially.
2. Integer quote parity tests vs on-chain at boundary sizes.
3. Calldata builder into `Call[]`.
4. Flag default **off**. Flip after soak, not in the same PR as the math.
5. Do not mark it V2-compatible unless it is.

---

## Add a chain

[`CHAINS.md`](CHAINS.md). Survive a week of simulation before the next
one.

---

## Add a console panel

1. Data from an existing API or a new engine route. No direct RPC from
   the browser except via `/api/eth` reads.
2. Chain-keyed. Demo-safe.
3. Empty state with a sentence.
4. Explorer links chain-aware.

---

## Add an env var

Wei or bps in the name. Document in [`CONFIG.md`](CONFIG.md). If it can
be mistaken for a human unit (`_ETH`, `_GWEI`), either don’t, or refuse
boot when the human name is set.
