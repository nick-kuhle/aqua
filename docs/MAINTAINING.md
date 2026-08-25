# Maintaining Aqua

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

How the codebase thinks. Permanent. Roadmap phases get deleted when they
ship; anything that turned out to be a durable rule is folded here
first.

If you only read three sections: **Mindset**, **Change patterns**,
**Footguns**.

---

## 1. Mindset

> **Aqua is a measurement instrument that is allowed to trade.**

The gates are conservative. Few surviving candidates is the steady
state. “All zeros” is almost never “lower `MIN_NET_PROFIT_WEI`.” It is
“the mouth isn’t constructed, the graph is empty, valuation is off, or
the RPC can’t do the read we need.”

Corollaries:

- Don’t loosen gates to chase opportunities.
- Don’t bypass qualification.
- Don’t add UniswapX because CoW shadow is silent. Silence is the
  optimizer.
- The optimizer is the company. Settlement is a commodity.

---

## 2. Reading order

[`ARCHITECTURE.md`](ARCHITECTURE.md), then `bot/crates/node` module
list. Linear: ingest → (optimizer | sidecar) → risk → sim → store →
API. Two loops, one process.

Things that look like over-engineering and aren’t:

- Separate V2 and V3 caches.
- Separate nonce lanes for intent vs sidecar.
- `if let` ladders instead of `?` in strategy code (early-return per
  candidate, not per tx).
- `sol!` blocks as the ABI. Parameter order is a selector.

Things that look simple and aren’t:

- Integer `amount_out` rounding down.
- Ternary search assuming unimodal profit.
- CoW fairness as a hard constraint.

---

## 3. Change patterns

See [`ADDING.md`](ADDING.md). Extra notes:

**Risk knobs.** Too loose → `simulationsReverted >> succeeded` → fix
sizing, don’t lower min profit. Too tight → `gatedByRisk` dominates →
raise the specific cap. `BRIBE_BPS` on L1 bundles is inclusion, not
profit cosmetics.

**Tape.** A math change without a tape delta is an incomplete PR.

---

## 4. Testing

Three layers: Rust unit (no network), Foundry (local anvil), **tape**
(optimizer vs naive, blocking).

No live-RPC tests in CI.

When you change AMM math, add a fixture from a known on-chain swap.
When you add a strategy, happy path + reject path + funnel.
When you change funnel units, assert the snapshot.

---

## 5. Footguns

- `f64` on settlement math.
- Ternary over QuoterV2.
- New `sol!` without checking the selector on chain.
- Unbounded `tokio::spawn` on the pending path. Shed, don’t queue.
- `U256` JSON without `.to_string()`.
- Assuming `eth_call` returns a revert reason on a public node. Only
  the fork is structured.
- Reusing `victim_hashes` for Flashblocks or CoW.
- Reusing qualification populations.
- Enabling a boot-off strategy at runtime (it was never constructed).
- Mixing Mouth A and sidecar drawdowns.
- “Temporary” sandwich flag.

---

## 6. Landscape

[`LANDSCAPE.md`](LANDSCAPE.md) is the quarterly. Implications adopted by this specification: intents over mempool, CoW first, Morpho tail,
Flashblocks as state not mempool, no sandwiches.

---

## 7. Priority when lost

1. Read the funnel for a week. Don’t change code.
2. If Mouth A is empty: optimizer tape, then construction, then
   autopilot URL.
3. If sidecar is empty: valuation flag, watchlist caps, profile
   addresses.
4. If both print in sim and die live: qualification, then inclusion
   (bribe / raw gas / CoW revert).
5. New chain last.

---

## 8. Smallness

Keep the bot thin. A hundred-line feature that is twenty lines if you
reuse `Edge` is a failed review. The architecture diagram is a contract
that smallness is a property worth preserving.
