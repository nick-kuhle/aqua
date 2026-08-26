# Qualification

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

A row may be a live candidate and still forbidden to send. Qualification
is the evidence gate. It is per **row per chain per process**.

Verdicts: `PASS` | `FAIL` | `INSUFFICIENT SAMPLE`.

---

## What evidence is

Continuous, canonical, and about **this binary**.

| Population | Used for | Not used for |
| --- | --- | --- |
| Fork sims vs later on-chain outcome | accuracy | “we would have won” stories |
| Mouth notify (CoW accepted / settled / reverted) | Mouth A | sidecar |
| Relay `eth_callBundle` vs fork | L1 bundle rows | sequencer chains |
| Sequencer state compare | victimless L2 arb | cannot double as outcome evidence |
| Own finalized receipts | exact P/L | competitor P/L |

A population cannot satisfy two thresholds. Reusing “actual MEV matches”
as both independent sequencer evidence and corresponding outcome
evidence is forbidden.

---

## Thresholds (defaults)

Operator-selectable soak window: 1–8760 hours via authenticated
`POST /api/qualification` — changes the **window**, never manufactures
evidence, never overrides `live_candidate` or shadow-only.

Default window: **168 hours** of continuous observation.

Accuracy tolerances live in config. Fail closed if fork and reality
diverge past them. `FAIL` stays failed until evidence in the window
clears; it does not silently age out.

`INSUFFICIENT SAMPLE` is the honest v1 state. The console must not style
it like a green wait.

---

## Continuity

A gap in heads, a crash, a binary upgrade, or a revert of the executor
bytecode **restarts the clock**. Qualification is a statement about the
exact build that produced the evidence. If a soak finds a code defect,
the soak stops, the fix ships through CI, the clock restarts from zero.

---

## Smoke

`LIVE_SMOKE_MAX` (0–5) is operator-only, durable, not a back door around
seven days. Each smoke consumes a slot even on failure. Shadow-only rows
cannot smoke.

Raw smoke also requires `LIVE_SMOKE_MAX_GAS_COST_WEI`.

Smoke does not grant `PASS`.

---

## Per-row matrix (v1)

| Row | Backend | Can `PASS` in v1? |
| --- | --- | --- |
| `cow_batch` | solver-auction | yes, after approved-chain continuity |
| `liq_morpho_blue` | fork vs chain | yes |
| `liq_aave_v3` | fork vs chain | yes |
| `liq_aave_v4` | fork vs chain | yes, separately; never inherits v3 evidence |
| `oracle_backrun_uncovered` | fork vs chain, L1 bundle | yes only if bundle path exists and the feed is attested uncovered |
| `oev_auction_svr` | fork vs chain, auction outcome | no in v1; observe-and-measure only |
| `uniswapx_fill` | fill markout | after Mouth B exists |
| `atomic_arb` on Base | sequencer state compare | not until Flashblocks work is real |
| JIT / sandwich / sniper | — | no row |

---

## Console

Qualification is a first-class panel, not a badge. Each row shows:

- verdict
- sample counts by population
- window remaining
- last continuity break
- shadow-only reason, if any
- “this is not a soak, this row cannot pass” when ineligible

W6-style “flip this decoder” cards belong to mouths that have a written
memo template. CoW has none. UniswapX has `MIN_FILL_BPS`, not a decoder
flag.
