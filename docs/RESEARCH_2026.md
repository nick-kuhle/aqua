# Aqua research brief — Web3, intents, solver markets, and liquidation engines

**Research cut:** 25 August 2026 (America/Los_Angeles). **Purpose:** decision
input for Aqua, not investment advice. External facts are volatile; verify
addresses, APIs, incentives, and legal obligations immediately before use.

## Executive conclusion

Aqua should not try to be a generic MEV bot. The investable wedge is a
**risk-bounded, multi-venue execution engine** with two independent products:

1. **User-opted intent solving:** compete on user surplus or fill quality where
   the protocol defines the auction and the user has signed constraints.
2. **Liquidation execution:** monitor solvency, price collateral conservatively,
   and compete only where the complete transaction is profitable after gas,
   financing, slippage, builder payment, and failure risk.

The durable moat is not a router. It is replayable state, fast and correct
simulation, route-specific inventory, execution reliability, protocol
qualification, and realized markout data. Keep the two businesses separate in
risk, keys, nonces, accounting, and qualification.

## 1. Market model

### Intents are outcome constraints, not transactions

An intent says what must be true (assets, minimum output, recipient, deadline,
fee and privacy constraints); the solver chooses how. This moves path finding,
liquidity sourcing, gas sponsorship, and some MEV competition into an auction.
It improves UX and can reduce public-mempool exposure, but it does **not** make
execution trustless by itself: the user still depends on settlement contracts,
solver capital, relayers, bridges, or attestors.

Relevant production patterns:

| Pattern | Example | Strength | Aqua implication |
| --- | --- | --- | --- |
| Batch auction / matching | CoW Protocol | Netting, coincidence of wants, surplus competition | Build a deterministic solver and fairness checks; optimize reliability before latency |
| Dutch / exclusive auction | UniswapX | Simple filler market and route flexibility | Model time, inventory, adverse selection, and chain-specific auction rules |
| Resolver / RFQ | 1inch Fusion | Gasless execution and private liquidity | Treat resolver eligibility and order API as external capability data |
| Cross-chain filler | Across, deBridge DLN, ERC-7683 ecosystems | Solver fronts destination liquidity | Price bridge/finality/refund/credit risk; ERC-7683 is an interface, not a bridge |
| Intent-native coordination | Anoma-style architecture | Counterparty discovery as a base primitive | Research only; do not make Aqua depend on a new L1 |

Primary references: [CoW solver concepts](https://docs.cow.fi/cow-protocol/concepts/introduction/solvers),
[UniswapX auction types](https://docs.uniswap.org/contracts/uniswapx/auctiontypes),
[ERC-7683](https://eips.ethereum.org/EIPS/eip-7683), and [Across's intent
overview](https://across.to/blog/what-are-crypto-intents).

### Modern MEV competition

Competition is increasingly private, specialized, and builder/sequencer-aware.
A private transaction is not a guarantee of inclusion, atomicity, or no cost.
Flashbots Auction uses sealed bids and private bundles; MEV-Share lets users
and apps choose what transaction information to share and how bids are split.
These are different products and must be different transport implementations.

On L2s, centralized sequencers and chain-specific preconfirmation/express-lane
systems change the ordering game. A Base preconfirmed state stream, an
Arbitrum express-lane auction, and an Ethereum builder bundle are not equivalent
inputs. Aqua must store source, state identifier, target block, cancellation
semantics, privacy policy, and inclusion evidence for every submission.

References: [Flashbots Auction](https://docs.flashbots.net/flashbots-auction/overview),
[MEV-Share](https://docs.flashbots.net/flashbots-mev-share/introduction), and
[Flashbots builder fundamentals](https://docs.flashbots.net/flashbots-mev-boost/block-builders).

## 2. Liquidation-engine model

A production liquidation engine is a pipeline, not a bot loop:

```text
state/log ingest → candidate index → solvency calculation → conservative valuation
→ route/financing search → exact fork simulation → auction/transport policy
→ fenced submission → receipt/finality/reorg reconciliation → realized P/L
```

The key distinctions are:

- **Trigger:** Aave account health factor, Morpho market LTV/LLTV, Compound
  absorbability, Maker auction state, or a protocol-specific oracle update.
- **Reward:** liquidation bonus/incentive, seized collateral discount, protocol
  fee, and sometimes OEV paid to the protocol or auction winner.
- **Capital:** own inventory, flash liquidity, or solver credit. Flash liquidity
  removes principal but never removes gas, callback, slippage, or revert risk.
- **Valuation:** collateral is not cash. Use executable routes, depth limits,
  conservative haircuts, and token-behavior policy—not a display oracle.
- **Competition:** first eligible fill, same-block oracle backrun, private
  auction, or protocol-native OEV mechanism. The strategy must name which.

Aave V3 generally uses account-wide health factor and reserve-level close-factor
rules; Morpho Blue uses isolated market parameters and LLTV, with market-specific
share math. Never share an adapter, formula, or close-factor assumption between
them. Read the deployed ABI and protocol docs at the pinned state.

References: [Aave V3 Pool](https://aave.com/docs/aave-v3/smart-contracts/pool),
[Morpho liquidation bots](https://docs.morpho.org/developers/ecosystem/liquidation-bots/),
and [Morpho Blue](https://docs.morpho.org/).

### OEV is a design choice

Oracle-triggered liquidations can create value when a price update changes
solvency. The value may be captured by searchers, builders, validators, or an
explicit oracle/auction mechanism. Oval and newer oracle-integrated designs
show a protocol can auction or redirect part of this value, but this adds
oracle, auction, and integration dependencies. Aqua should initially:

- observe and measure OEV;
- simulate victim-update plus liquidation atomically;
- use only a transport whose ordering and refund semantics are proven; and
- never assume that an oracle transaction is visible, cancellable, or privately
  orderable on a sequencer chain.

Reference: [UMA/Oval overview](https://medium.com/uma-project/defi-liquidations-are-broken-oval-is-the-solution-ddefb95067f8).

## 3. 25 August 2026 risk lessons

A reported Morpho PT-reUSD incident on 25 August 2026 attributed roughly
$36.4m of liquidations to a short-horizon TWAP and thin PT/YT liquidity. Treat
this as a timely risk signal pending primary post-mortem confirmation, not as a
stable protocol fact. The engineering lesson is independent of the headline:
short TWAPs, yield-token inverse pricing, high leverage, and concentrated
liquidity can turn a modest manipulation into a large liquidation cascade.

A separate March 2026 Aave CAPO configuration incident reportedly caused tens
of millions of dollars of wstETH liquidations without protocol bad debt. Again,
regardless of final figures, configuration and snapshot/timestamp consistency
must be tested like code. A correct oracle algorithm with an incorrect parameter
is still an unsafe liquidation input.

Required controls: multi-source or bounded prices where feasible, stale/deviation
checks, circuit breakers, per-market caps, oracle/config snapshot consistency,
shadow detection, independent-provider comparison, and compensation/incident
records for incorrect liquidations.

## 4. Recommended Aqua positioning and economics

### Initial wedge

- One EVM chain cell at a time; Ethereum L1 is the best first liquidation test
  because ordering and bundle semantics are observable, while one low-complexity
  L2 may be the best first intent test if the counterparty supports it.
- CoW shadow solving is the first intent experiment because it has a defined
  fairness/auction objective and does not require Aqua to own a market-making
  book.
- Morpho and Aave are simulation-only sidecars until code-hash registry,
  valuation, exact fork traces, and transport qualification exist.
- UniswapX and cross-chain fills come later because they require inventory,
  adverse-selection measurement, and route-specific credit/finality controls.

### Unit economics that must be recorded

For every candidate, persist:

```text
gross user/protocol surplus or liquidation incentive
− AMM price impact and fees
− gas and priority fee
− builder/sequencer payment
− flash-loan fee and financing cost
− expected revert / inclusion / reorg loss
− inventory opportunity cost and adverse markout
− protocol/solver fees
= conservative expected net profit
```

Do not use token reward schedules, estimated oracle prices, or simulated balance
deltas as realized P/L. Report expected, submitted, included, finalized, and
reconciled values separately.

## 5. Architecture decisions this research supports

1. Keep `optimizer` pure and deterministic; providers, clocks, keys, and
   transports live outside it.
2. Make `Mouth`, `Strategy`, `ChainProfile`, `Transport`, and `RiskRow` closed
   capability enums until their tests and registry evidence exist.
3. Give every candidate a state hash, registry digest, payload hash, artifact
   hash, signer/lane, deadline, and idempotency key.
4. Add a `valuation_confidence`/haircut and an `oracle_provenance` record; a
   number without provenance cannot clear a live gate.
5. Make transport selection a policy decision, not a `bundle: true` boolean.
6. Measure solver quality by user surplus, fill/settlement success, and realized
   markout—not quote count or nominal wins.
7. Prefer market isolation and hard caps over a global risk budget for liquidation
   lanes; one bad oracle must not pause or contaminate every product.

## 6. Research backlog

- Obtain current written CoW onboarding, driver, bond, chain, and reward terms.
- Verify ERC-7683 settlement and filler implementations route by route.
- Build a primary-source matrix for Chainlink OEV, RedStone Atom, Oval, and
  builder/relay capabilities; do not infer support from marketing pages.
- Add PT/YT, rebasing, fee-on-transfer, ERC-777, and oracle-decimal fixtures.
- Measure 30 days of candidate, win, inclusion, finality, and markout data before
  changing haircuts or opening a new lane.

This document is reviewed monthly and after every protocol or transport change.
