# Risk and safety

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

Moving a simulating process to live is
[`SIM_TO_LIVE.md`](SIM_TO_LIVE.md): secure the API first, tighten these
knobs second, arm last.

---

## Why broadcasting is fail-closed

No single switch sends a payload. All of these must pass:

1. Live (not replay) lane.
2. Engineering live-candidate row.
3. Risk, drawdown, gas, exact-account inventory.
4. Boot arming: `LIVE_EXECUTION=true` **and** `I_UNDERSTAND_LIVE_RISK=yes`.
5. Independent `BROADCAST_ENABLED=true`.
6. Authenticated runtime mode is live.
7. That row’s qualification is `PASS`, **or** a remaining `LIVE_SMOKE_MAX`
   slot is consumed (default 0, hard cap 5, durable, never promotes a
   shadow-only row).
8. No unresolved startup nonce-recovery block.
9. Exact reserved-nonce fork sim succeeds.

Defaults disable arming and broadcast. CoW driver keys, when using the
DAO pool, are not in this process at all.

Mouth A and the sidecar have **independent** copies of 4–7.

---

## Execution controls

| Layer | Where | Cadence |
| --- | --- | --- |
| Broadcast capability | `BROADCAST_ENABLED` | restart |
| Boot arming | `LIVE_EXECUTION` + literal `I_UNDERSTAND_LIVE_RISK=yes` | restart |
| Live smoke | `LIVE_SMOKE_MAX` (0 off, cap 5); raw also needs `LIVE_SMOKE_MAX_GAS_COST_WEI` | restart; remaining slots in SQLite |
| Runtime mode | `POST /api/mode` | immediate, can only narrow |
| Qualification | canonical evidence | continuous |
| Risk / strategy narrowing | `POST /api/risk` | immediate |

An unarmed process cannot be switched live (`409`). An armed process may
be paused immediately. None of these bypasses another.

Per-chain by construction. Arming Base cannot affect BNB.

---

## Off-chain parameters

Names are wei- or bps-denominated. `MIN_NET_PROFIT_ETH`,
`MAX_BASE_FEE_GWEI`, `MAX_DRAWDOWN_ETH` are **not** read. If any is set,
boot refuses. That is fail-closed against a checklist whose values would
otherwise silently no-op.

| Variable | Default | Meaning |
| --- | --- | --- |
| `MIN_NET_PROFIT_WEI` | `1` | Record anything that is not a loss (measure first) |
| `MAX_POSITION_WEI` | `100 ETH` | Notional cap |
| `MAX_BASE_FEE_WEI` | `500 gwei` | Refuse gas spikes |
| `BRIBE_BPS` | `9000` on ETH bundles; `0` on sequencer / CoW | Builder share of gross |
| `MAX_GAS_PER_BUNDLE` | `3,000,000` | |
| `MAX_DRAWDOWN_WEI` | `0` (off) | Simulated loss that trips the kill switch |
| `MAX_INFLIGHT_PER_STRATEGY` | `32` | |
| `TOKEN_VALUATION` | `false` | Opt-in native pricing of token profit |
| `VALUATION_HAIRCUT_BPS` | `200` | |
| `MIN_FILL_BPS` | Mouth B only | Filler edge floor |

Tighten once there is data:

1. Raise `MIN_NET_PROFIT_WEI` above the noise floor.
2. Lower `MAX_POSITION_WEI` where predicted vs realised error grows.
3. Turn on `MAX_DRAWDOWN_WEI`.
4. On L1 bundles, `BRIBE_BPS` is the parameter with the most money in it.
   Do not drop below 5000 without understanding inclusion. CoW ignores it.

---

## CoW-specific risk

- A reverted **win** is a negative reward. Treat as an incident, same
  class as partial inclusion.
- Fairness violations are slashable for bonded solvers. v1 encodes
  protocol filters as hard constraints.
- DAO-pool driver: Aqua does not hold the submission key. Compromise of
  this host should not move CoW funds. Still protect the optimizer
  endpoint; garbage solutions waste auctions.
- Consistency metric (bid quality × success) punishes spraying.

---

## UniswapX-specific risk

- Worst case is inventory, not a revert. Mouth B has its own cap and
  halt. It is the only lane that can lose money on a transaction that
  succeeded as designed.
- `MIN_FILL_BPS` and inventory gate are boot ceilings. Runtime narrows.

---

## Registry, state and signer boundary

A live candidate requires an unexpired, pinned protocol/asset/oracle registry
entry whose code hash, proxy implementation and critical config match at the
pinned state block. Critical reads (chain/head hash, executor code, nonce and
post-trade facts) use independent providers where practical; disagreement is a
lane halt. All EVM encoding, signing and receipt decoding uses Alloy according
to [`ALLOY.md`](ALLOY.md). Worker processes have no production signing key;
only the fenced execution leader may reserve a nonce, sign and submit. See
[`PROTOCOL_REGISTRY.md`](PROTOCOL_REGISTRY.md) and [`SCALE.md`](SCALE.md).

## Raw mode

No relay revert protection. Unqualified smoke needs attempt count **and**
wei cap. Decode the type-2 payload; reserve `gasLimit × maxFeePerGas`.
Malformed or exhausted cap → refuse.

Cancellation: percentage-bump both EIP-1559 caps, cover current base
fee, fail closed above `RAW_CANCEL_MAX_FEE_WEI`.

---

## Known limitations

- Sizing assumes our payload is the whole block. Competitors exist.
  Realised ≤ simulated.
- Oracle backrun needs raw bytes of the update tx to bundle it.
- MEV-Share hints are usually redacted.
- Valuation is a quote, not a fill.
- Inclusion probability, if shown, is a ranking (bribe vs realised
  builder payment), not a forecast.
- Re-orgs are marked, not replayed. Discarded-range sims drop from P/L.
- Only the fork backend values non-native profit.

---

## Runtime risk surface

`POST /api/risk` applies to the next candidate. All-or-nothing patches.
`bribeBps ≤ 10000`. Gas cap in `[21000, 16777216]` (EIP-7825).

Boot-only on purpose:

| Boundary | Why |
| --- | --- |
| Strategy / mouth enablement only narrows | Off at boot means never constructed (zero RPC). “Enabling” at runtime would no-op, so the API refuses with restart instructions |
| Live arming | Two keys, once at boot |
| Endpoints, chain, sim | Restart |

Kill switch is durable. `systemctl restart` cannot silently re-arm.
`POST /api/risk/reset` (authenticated) is the only re-arm.

---

## Product risk (not a parameter)

Aqua does not sandwich users. That is not a toggle. See
[`STRATEGIES.md`](STRATEGIES.md).
