# Console

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The planned frontend is the operator’s instrument: one screen per question,
obvious arming polarity, no blended APY, and demo data that cannot be mistaken
for live.

Target stack: Next.js, same-origin proxies, injected wallet only for contract
admin (allowlist, sweep, deploy). The planned execution leader signs; the
browser must not.

---

## Principles

1. **Chain is always visible.** A green pill in the header. With `CHAINS`
   set, it is a switcher; the whole panel tree re-keys. An unreachable
   bot demos **that chain only**.
2. **Demo is loud.** Generated data behind a **DEMO DATA** banner, not a
   quiet grey label.
3. **Arming is ugly on purpose.** Live mode is not a pretty toggle that
   looks on. It is a confirmation that restates the nine gates.
4. **Rows don’t blend.** Mouth A, Mouth B, Morpho, Aave, oracle, arb
   each have a funnel. No “total APY.”
5. **Empty states teach.** Every zero funnel has a “why no candidates”
   copy, including the row that is shadow-only.
6. **Mobile works.** 390px: no horizontal overflow, tap targets, chain
   pill remains. Detail tables collapse, they do not clip.
7. **Read-only by default.** Writes (`mode`, `risk`, `reset`, allowlist)
   require auth. The UI shows 401 as “token missing,” not a white page.

---

## Information architecture

```
Header     chain pill · mode badge · kill-switch · wallet · alerts bell
Nav        Overview · Mouths · Sidecar · Optimizer · Funnel · Risk
           Qualification · Tape · Contracts · Go-live · Settings
```

Jump-nav + collapsible sections. An operator at 2 a.m. should find
“is it sending” in one glance (header badge) and “why not” in two
clicks (qualification + funnel).

---

## Header

| Element | Behaviour |
| --- | --- |
| Chain pill | Ethereum / Base / BNB / Arbitrum. Colour-coded. Switcher if `CHAINS` set |
| Mode badge | `SIMULATION ONLY` (default) or `LIVE` (armed). Click opens mode panel. Unarmed live POST → 409 with the arming list |
| Kill switch | Quiet when clear. Full-width danger when tripped. Reset is a typed confirm (`RESET`) plus auth |
| Wallet | EIP-6963 discovery, eager reconnect, switch-to-bot-chain CTA. Wallet chain and console chain are independent; mismatch is an amber banner, not a silent switch |
| Alerts | Unresolved count. Drawer: kill, endpoint stall, conversion collapse, reorg, CoW revert-win, Mouth B markout |

---

## Overview

The “is Aqua alive” page.

- Equity curve: cumulative **simulated** P/L and, once live, a second
  series for **finalized** P/L. Toggle series. Never mix them in one
  unmarked line.
- Per-surface tiles: Mouth A, Mouth B, Sidecar — net, fill/win count,
  last event age.
- Health: head lag, sim p95, queue drops, replay drops, RPC errors.
- Last 20 feed events (compact). Full tape is its own nav item.

If the bot is down: demo curve + banner. Tiles say DEMO.

---

## Mouths

### CoW scoreboard

- Auctions seen / solutions accepted / wins / on-chain reverts
- `surplus vs naive` (sparkline, tape + live)
- Weekly COW (manual input or pasted Dune — v1 may be operator-entered;
  do not scrape a dashboard as a source of truth)
- Deadline misses
- Fairness rejects
- Driver: `DAO pool` | `self` — informational
- Chain of this mouth (selected rollout chain; show verified onboarding environment)

Empty: “No auctions. Is Mouth A constructed? Is the solver URL in the
autopilot? Shadow vs staging vs prod?”

### UniswapX scoreboard (hidden until crate live)

- Orders seen / eligible / filled / skipped (`edge < MIN_FILL_BPS`)
- Inventory by token
- Markout distribution
- Halt button (own lane)

### 7683

Placeholder panel with “crate stub” copy until implemented. Do not show
fake fills.

---

## Sidecar

- Morpho / Aave / oracle as **separate** subpanels
- Watchlist sizes vs caps
- Near-miss lead count
- Last oracle selector seen
- Simulated vs finalized P/L
- Valuation misses (uncertified profit token)

Empty copy examples:

- Morpho: “Zero candidates. Cap too low? Market whitelist excluding
  the loan token? `TOKEN_VALUATION` off (liq will net zero)?”
- Oracle: “No `transmit` in the feed. RPC without pending? Sequencer
  chain (observational only)?”

---

## Optimizer

Math’s daily page.

- `surplus_v1 / surplus_naive` on the frozen tape, per day (bar chart).
  Days below 1.0 are red. CI uses the same fixture.
- Fill rate, ring share vs pairwise vs spill
- Budget utilisation (`OPT_BUDGET_MS`)
- Tape age warning if older than 32 days
- Button: “copy last failed auction id” for debugging

This page is useless if it shows a single blended “alpha” number.

---

## Funnel

One row per strategy/mouth. Columns:

`invocationsWithOutput | empty | candidatesEmitted | gatedByRisk |
sim ok | sim revert | submittable | submitted | onchain revert`

Toggle live / replay. Labelled so they cannot be mixed.

Tooltips: units. A single call can emit many candidates; do not imply
`candidates / invocationsWithOutput` is a win rate.

---

## Risk

Every control in [`RISK.md`](RISK.md) that is runtime-safe.

- Wei inputs with ETH preview beside them
- `bribeBps` slider + warning below 5000 on L1
- Strategy toggles: off is off; on can only turn off a boot-on row
- `.env` snippet is **boot defaults**, demoted visually
- Kill reset: typed confirm
- Mouth B inventory cap, if present

Rejected patches show the 400 reason in-panel. All-or-nothing.

---

## Qualification

Table: row, verdict chip (`PASS` green, `FAIL` red, `INSUFFICIENT`
amber, `INELIGIBLE` grey with reason), sample counts, window, last
break.

Soak hours: authenticated input 1–8760. Helper text: “changes the
window; does not invent evidence.”

Smoke slots remaining, per lane.

---

## Tape (live feed)

Filter chips: auction, order, head, pending, opp, sim, submit, alert,
mouth notify.

Block-explorer links on every hash and address (chain-aware).

Search by hash / tag / solver auction id.

Pause. Do not let a 200 Hz flashblocks stream lock the tab — cap
rendered events, the engine already bounds the channel.

---

## Contracts

Read `owner`, `searchers`, native/WETH balance through `/api/eth`.

Writes with connected wallet: `setSearcher`, `sweep`, deploy script
hooks.

Deploy does not change mode. Copy: “Deployment is not arming.”

Separate cards: AquaExecutor, (optional) CoW settlement (read-only
link), UniswapX reactor (read-only).

---

## Go-live

A wizard that **cannot skip gates**. Path A in
[`PATH_TO_LIVE.md`](PATH_TO_LIVE.md).

Cards, in order, blocked until the previous is true:

1. Wallet on the **console’s** chain
2. Key separation: intent signer ≠ sidecar signer ≠ owner
3. Deploy / paste executor, verify bytecode hash against artifacts
4. Allowlist searcher
5. Fund gas (and WETH only if a row needs it)
6. `doctor` from the API
7. Qualification panel snapshot
8. Independent switches: Mouth A live | Sidecar live  
   (Mouth B is a later card)

Each switch restates: boot flags, smoke remaining, verdict. No single
“go live everything” button.

Soak threshold is operator-selectable and does not mint a `PASS`.

---

## Settings

- Which bot URLs the Next server uses (`CHAINS`)
- Explorer bases
- Demo force-on (dev)
- Theme: light/dark, not a third “matrix” palette

---

## Visual system

Calm, dense, operational. Not a consumer marketing page.

- One family, tabular figures (the P/L is the UI)
- Danger is reserved for kill / live / reset — not for every warning
- Chain colours consistent across header, tiles, explorer chips
- No decoration that looks like a status (grey dots that aren’t health)

Motion: numbers tick; the equity line eases. No confetti on a win.

---

## Accessibility and empty

Every badge has text, not colour-only. Funnel zeros have sentences.
Keyboard: nav, chain switch, filters.

---

## What the console will not do

- Sign solver or sidecar payloads
- Show a sandwich panel
- Pretend UniswapX is live while the crate is a stub
- Aggregate mouths into one ROI
- Talk to the bot from the browser
