# Contracts

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

The planned atomic path has one Aqua-owned contract: `AquaExecutor`. No contract exists yet.

CoW settlements use CoW’s settlement contract. UniswapX fills use the
reactor. Aqua does not wrap those in the executor unless Aqua itself is
funding a leg.

There is no sniper vault and no retail fee wrapper in this repository.

---

## AquaExecutor

Generic atomic MEV / solver-leg execution.

Design goals:

1. **Retained-profit guard.** Settling entry points measure `profitToken`
   (address(0) = native), pay any builder share, revert
   `Unprofitable(realised, required)` below `minProfit`.
2. **Generic.** Strategies are off-chain `Call[]`. No strategy-specific
   Solidity. No redeploy when a row changes.
3. **Cheap.** Tight calldata, EIP-1153 transient guards, no SafeERC20
   bloat.
4. **Safe by default.** Only allowlisted searchers; `sweep` is owner-only.

### Types

```solidity
struct Call {
    address target;
    uint256 value;
    bytes data;
}

struct Guard {
    address profitToken;
    uint256 minProfit;
    uint16  bribeBps;       // of realised profit, to block.coinbase
    uint64  blockDeadline;  // 0 = none
    uint256 maxBaseFee;     // 0 = none
    uint8   phase;          // 0 single, 1 open, 2 close
}
```

`phase` makes two-transaction strategies economically atomic at the
contract boundary. Phase 1 persists the pre-strategy balance under
`tag`. Phase 2 settles against it, same block. A closing leg cannot call
returned principal “profit.” Owner can clear only an **expired**
baseline (partial-inclusion recovery).

### Entry points

| Function | Role |
| --- | --- |
| `execute(tag, calls, guard)` | Atomic batch, profit required |
| `flashExecute(tag, tokens, amounts, calls, guard)` | Same, funded by Balancer V2 (zero fee) |
| `quote(calls, profitToken)` | `eth_call` only; reverts if `msg.sender` is real |
| `quoteFrom(...)` | Searcher-gated dry run |
| `uniswapV3MintCallback` + `armV3Callback` | Present for completeness; JIT is not a live row. Callback still armed via transient storage for one pool, one call, if a future row needs it |

### Guards

| Guard | Effect |
| --- | --- |
| `minProfit` | revert unless realised delta clears it |
| `blockDeadline` | revert if the tx slips a block |
| `maxBaseFee` | revert if base fee spiked since sizing |
| `bribeBps` | share of **realised profit** to coinbase; a losing batch pays 0 |
| searcher allowlist | only approved addresses |
| transient slots | reentrancy, flash callback, V3 callback |

Builder bribe is a share of profit, not a fixed gas tip. Wrong polarity
for CoW (CoW has no coinbase bribe). Sidecar L1 bundles use it.
`BRIBE_BPS` default on Ethereum sidecar is conservative versus inclusion
competition; on sequencer chains `BRIBE_BPS=0`.

### Immutables

`BALANCER_VAULT`, `WETH` — constructor. Per-chain deploy.

### Bytecode discipline

`compile-check.js` disables solc’s IPFS metadata hash so runtime
bytecode is deterministic across checkouts (absolute paths must not
appear). CI fails if committed artifacts drift.

Do not change runtime bytecode because a sidecar row landed. If it
moves, someone meant to, and the qualification clock on that deployment
restarts.

### Tests (minimum)

Profit invariant, every guard, flash-loan arb round trip, two-leg
baseline (phase 1/2 does not count returned principal as profit),
access control, inner revert bubbling (`CallFailed` with index),
`quote` rejects real senders, flash callback rejects unarmed.

Fuzz: bribe cannot consume principal; non-WETH max balance cannot
overflow bribe math.

---

## Deploy

Foundry script, chainid-switched WETH and vault. Owner = deployer.
Searcher allowlist empty until the operator’s searcher address is set
from the console or a follow-up tx.

Deployment does **not** arm execution. See [`SIM_TO_LIVE.md`](SIM_TO_LIVE.md).

---

## What we will not add

- Strategy-specific functions (`sandwich`, `liquidateAave`, …).
- Upgradeability. Immutable executor; new code is a new deploy and a new
  allowlist.
- A vault that can lose the entire deposit by design.
- A 1% fee router for retail swaps. Different product.
