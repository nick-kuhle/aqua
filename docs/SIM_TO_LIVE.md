# Simulation to live

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

Order is the safety. Skip a step and the rest are theater.

Applies **per chain, per lane** (Mouth A vs sidecar). Arming CoW on BNB
does not arm Morpho on Ethereum.

---

## 1. Secure the API

If `API_BIND` is not loopback, set `API_AUTH_TOKEN` and verify mutating
routes 401 without it. Do this in simulation. A public unauthenticated
`POST /api/mode` is a live switch with extra steps.

## 2. Tighten risk

Liberal defaults are for measurement. Before arming:

- Raise `MIN_NET_PROFIT_WEI` above noise.
- Set `MAX_DRAWDOWN_WEI`.
- Sidecar: `TOKEN_VALUATION=true` with a haircut you believe.
- Mouth B (later): `MIN_FILL_BPS` and inventory cap.
- L1 bundles: understand `BRIBE_BPS` before touching it.

Persist via `.env` (boot) and confirm the runtime panel matches.

## 3. Keys and contracts

- Sidecar searcher ≠ intent searcher ≠ owner ≠ relay reputation.
- Derived addresses match env.
- Executor deployed; bytecode hash matches artifacts; searcher
  allowlisted; gas funded. Deployment is not arming.
- CoW DAO-pool: this process may hold **no** CoW submission key.

## 4. Doctor

`aqua doctor` green on the host: chain id, RPC, WS, artifacts, anvil,
mouth bind, sqlite writable.

## 5. Qualification

Window ≥ 168 h unless you have a written reason. Verdict must be able
to become `PASS`. Shadow-only rows cannot smoke or pass.

## 6. Smoke (optional, cap 5)

`LIVE_SMOKE_MAX` plus, if raw, `LIVE_SMOKE_MAX_GAS_COST_WEI`. Durable.
Does not grant `PASS`.

## 7. Arm

Restart with `LIVE_EXECUTION=true`, `I_UNDERSTAND_LIVE_RISK=yes`,
`BROADCAST_ENABLED=true` for **that** process.

Runtime `POST /api/mode` can only narrow. Pause is immediate.

## 8. Watch

First hours: revert-wins, partial inclusion, drawdown, head lag. Trip
is a stop, not a tweet.

## 9. Rollback

`POST /api/mode` to simulation. If that’s not enough: stop the unit.
SQLite stays; you need it for nonce recovery. Do not delete it.

---

Env upgrades: add signer, broadcast, qualification, finality, API
security names **deliberately**. Missing names + `LIVE_EXECUTION=true`
is a start error.
