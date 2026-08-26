# Configuration

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 25 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

Everything is environment-driven. This is the annotated list. Defaults
are **liberal for measurement**. Tighten before arming
([`RISK.md`](RISK.md)).

Forbidden names (boot error if present):

| Forbidden name | Reason |
| --- | --- |
| `MIN_NET_PROFIT_ETH` | human unit; use `MIN_NET_PROFIT_WEI` |
| `MAX_BASE_FEE_GWEI` | human unit; use `MAX_BASE_FEE_WEI` |
| `MAX_DRAWDOWN_ETH` | human unit; use `MAX_DRAWDOWN_WEI` |
| `BUILDER_SHARE_BPS` | ambiguous; use `BRIBE_BPS` |
| `SUBMISSION_MODE` | **retired 25 Aug 2026** — a mode string cannot express refund, mutation, cancellation and auction-payment semantics. Use `TRANSPORT_*` keys and see [`TRANSPORT.md`](TRANSPORT.md) |
| `STRATEGY_LIQUIDATION_AAVE` | version-ambiguous; use `STRATEGY_LIQUIDATION_AAVE_V3` / `_V4` |
| `STRATEGY_LIQUIDATION_MORPHO` | version-ambiguous; use `STRATEGY_LIQUIDATION_MORPHO_BLUE` / `_V2` |
| `STRATEGY_ORACLE_BACKRUN` | coverage-ambiguous; use `STRATEGY_ORACLE_BACKRUN_UNCOVERED` / `STRATEGY_OEV_AUCTION_SVR` |

A forbidden name is refused rather than mapped, because a silently migrated
name is exactly how an operator arms a strategy they did not intend.

---

## Chain and RPC

| Key | Default | Notes |
| --- | --- | --- |
| `CHAIN_ID` | `1` | 1 ETH, 56 BNB, 8453 Base, 42161 Arb. Else empty profile + overrides |
| `ETH_HTTP_URL` | required on ETH | Archive. Alias accepted on other chains only as documented fallback |
| `ETH_WS_URL` | | Heads, pending |
| `BNB_HTTP_URL` / `BNB_WS_URL` | | BNB process |
| `BASE_HTTP_URL` / `BASE_WS_URL` | | Base process |
| `ARB_HTTP_URL` / `ARB_WS_URL` | | |
| `FLASHBLOCKS_WS_URL` | unset | Base only, phase 4 |
| `PROTOCOL_REGISTRY_PATH` | required for a live-capable profile | Signed, versioned, code-hash-attested manifest; no live capability without it. See `PROTOCOL_REGISTRY.md` |
| `*_ADDRESS` | derived profile only | Field-by-field development override. It cannot override a live registry attestation. See `ChainAddresses` |

## Mouths

| Key | Default | Notes |
| --- | --- | --- |
| `MOUTH_COW` | `true` | Construct Mouth A |
| `COW_SOLVE_BIND` | `127.0.0.1:8081` | Solver HTTP |
| `MOUTH_UNISWAPX` | `false` | Boot ceiling |
| `MOUTH_7683` | `false` | Protocol-specific adapter only; enabling requires settlement/finality registry and route risk memo |
| `MIN_FILL_BPS` | `5` | Mouth B |
| `OPT_BUDGET_MS` | `800` | CoW solve budget |

## Sidecar

| Key | Default | Notes |
| --- | --- | --- |
| `STRATEGY_LIQUIDATION_MORPHO_BLUE` | `true` | Skipped if profile has no attested Morpho Blue |
| `STRATEGY_LIQUIDATION_MORPHO_V2` | `false` | later; separate protocol and risk memo |
| `STRATEGY_LIQUIDATION_AAVE_V3` | `true` | Close-factor math |
| `STRATEGY_LIQUIDATION_AAVE_V4` | `false` | Target-HF math; enable only with v4 Spoke registry entries and fixtures |
| `STRATEGY_LIQUIDATION_COMPOUND` | `false` | later |
| `STRATEGY_LIQUIDATION_MAKER` | `false` | later |
| `STRATEGY_ORACLE_BACKRUN_UNCOVERED` | `true` | Uncovered feeds only; observational where no bundle market |
| `STRATEGY_OEV_AUCTION_SVR` | `false` | Bid into a protocol-run recapture auction. Requires venue registry entry + written terms |
| `MAX_OEV_BID_BPS` | `0` | Boot ceiling on the fraction of simulated gross incentive offered into an OEV auction. Runtime may only narrow |
| `MAX_ORDERING_BID_BPS` | `0` | Same, for express-lane/priority-ordering auctions |
| `STRATEGY_ATOMIC_ARB` | `true` | sim; live gated |
| `TOKEN_VALUATION` | `false` | Must be true before liq can bid |
| `VALUATION_HAIRCUT_BPS` | `200` | |
| `LIQUIDATION_WATCH_CAP` | | LRU |
| `MORPHO_MARKET_CAP` / `MORPHO_BORROWER_CAP` | | |
| `ORACLE_BACKRUN_MAX_LEADS` | | |

## DEX

| Key | Default | Notes |
| --- | --- | --- |
| `ARB_MAX_CYCLE_LEN` | `3` | ≤ 5 hard cap |
| `ARB_ENUMERATION_BUDGET_MS` | `25` | per-block arb |
| `ARB_MAX_POOLS` | `200` | |
| `DEX_UNIV3_ARB` | `true` | solver wants this on |
| `DEX_AERODROME_VOLATILE` | `false` | |
| `DEX_AERODROME_STABLE` | `false` | |
| `POOL_DISCOVERY_V3` | `true` | |
| `POOL_DISCOVERY_INTERVAL_BLOCKS` | `1` | rewind always refreshes |

## Risk and live

| Key | Default | Notes |
| --- | --- | --- |
| `MIN_NET_PROFIT_WEI` | `1` | |
| `MAX_POSITION_WEI` | `100e18` | |
| `MAX_BASE_FEE_WEI` | `500 gwei` | |
| `BRIBE_BPS` | `9000` ETH bundle; `0` sequencer | |
| `MAX_GAS_PER_BUNDLE` | `3000000` | |
| `MAX_DRAWDOWN_WEI` | `0` off | durable |
| `MAX_INFLIGHT_PER_STRATEGY` | `32` | |
| `LIVE_EXECUTION` | `false` | |
| `I_UNDERSTAND_LIVE_RISK` | unset | must be literal `yes` |
| `BROADCAST_ENABLED` | `false` | |
| `LIVE_SMOKE_MAX` | `0` | cap 5 |
| `LIVE_SMOKE_MAX_GAS_COST_WEI` | `0` | raw |
| `QUALIFICATION_BACKEND` | profile | `relay` \| `sequencer` \| `solver-auction` |
| `QUALIFICATION_WINDOW_HOURS` | `168` | runtime patchable |

## Transport

`SUBMISSION_MODE` is retired. Each transport is enabled independently and
carries its own endpoint, policy and qualification. See
[`TRANSPORT.md`](TRANSPORT.md).

| Key | Default | Notes |
| --- | --- | --- |
| `TRANSPORT_PUBLIC_RAW` | `false` | Never eligible for refunds; last resort only |
| `TRANSPORT_PRIVATE_RAW` | `false` | Endpoint-scoped privacy |
| `TRANSPORT_BUNDLE` | `false` | Ethereum L1 bundle; bundle-scoped atomicity |
| `TRANSPORT_BUNDLE_MERGEABLE` | `false` | Permits builder drop/merge; requires per-hash justification and drop-applied simulations |
| `TRANSPORT_OEV_AUCTION` | `false` | Protocol-run recapture auction venue |
| `TRANSPORT_EXPRESS_LANE` | `false` | Arbitrum Timeboost-style ordering auction |
| `TRANSPORT_SEQUENCER_RAW` | `false` | OP-stack / L2 sequencer |
| `TRANSPORT_ENDPOINTS_MAX` | `1` | Bound on multi-builder fan-out for one candidate |
| `BUNDLE_REFUND_PERCENT` | unset | 1–99 if the endpoint supports refunds; unset means none requested |
| `BUNDLE_REFUND_RECIPIENT` | unset | Must be an attested Aqua-controlled address |
| `BUNDLE_DROPPING_TX_ALLOWED` | `false` | Master switch for `droppingTxHashes`; per-hash justification still required |

Refunds requested are never counted as revenue. See
[`TRANSPORT.md`](TRANSPORT.md) for the expected/observed/reconciled ledger.

## Sim backends

| Key | Default | Notes |
| --- | --- | --- |
| `SIM_SCREEN_BACKEND` | `revm` | Fast in-process screening only. Never authoritative |
| `SIM_AUTHORITY_BACKEND` | `anvil` | Exact signed-payload authority. Cannot be set to `revm` |
| `SIM_DIFFERENTIAL_SAMPLE_BPS` | `10000` | Fraction of candidates re-checked on the authority backend during shadow. Lowering it below 10000 requires written approval |

## Keys (never in git)

| Key | Lane |
| --- | --- |
| `INTENT_SEARCHER_PRIVATE_KEY` | Mouth B self-fill; not used for DAO-pool CoW |
| `SIDECAR_SEARCHER_PRIVATE_KEY` | Liquidations |
| `RELAY_REPUTATION_PRIVATE_KEY` | L1 bundle auth, unfunded |
| `API_AUTH_TOKEN` | required if `API_BIND` not loopback |

Addresses derived from keys are checked at boot. Mismatch is a start
error.

## API and console

| Key | Default |
| --- | --- |
| `API_BIND` | `127.0.0.1:8080` |
| `CHAINS` | unset = single pill | e.g. `ethereum|http://127.0.0.1:8080,base|http://127.0.0.1:8082` |

## Sim

| Key | Default |
| --- | --- |
| `REFORK_EVERY_BLOCKS` | profile (1 on ETH, 6 on Base) |
| `SIM_TIMEOUT_MS` | |
| `TARGET_BLOCK_OFFSET` | `1` |

Example files: `.env.example`, `.env.example.bnb`, `.env.example.base`.
An upgrade of an existing env must add new names deliberately. Missing
required live names while `LIVE_EXECUTION=true` is a start error, not a
silent simulation.
