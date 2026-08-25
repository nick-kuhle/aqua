# Protocol registry and integration lifecycle

**Status: normative target specification — no implementation exists as of 24
August 2026.** A protocol name or contract address in source code is not an
integration. The registry makes each live dependency explicit, attestable and
revocable.

## Registry entry

A signed, versioned machine-readable manifest contains one entry per
`(environment, chain_id, capability, address)`:

```text
chain_id, environment, capability, protocol, address
code_hash, proxy_kind, implementation_address, implementation_code_hash
abi_id, ABI source URL + immutable content digest, verified_block
constructor/immutable expectations, selector/error/event allowlist
asset allowlist + decimals, feature flags, owner/admin/upgrade watcher
source provenance, reviewed_at, revalidate_by, approved_by, status
```

Capabilities are narrow: `aave_v3_pool`, `morpho_blue`, `balancer_flash_loan`,
`uniswap_v3_router`, `cow_settlement`, `uniswapx_reactor`, `oracle_feed`,
`bundle_transport`, etc. One address can expose multiple capabilities only
through separate reviewed entries.

At boot and periodically, the cell reads code, proxy implementation/admin and
critical immutable/config values at a pinned block using independent RPCs. A
mismatch, expired review, unknown proxy pattern, empty code, noncanonical
chain ID or RPC disagreement disables the capability and emits an incident.
There is no “best effort” address fallback.

## Integration lifecycle

1. **Research memo:** official specs/source, economic model, trust/upgrade
   model, callback/reentrancy behavior, chain deployment, state dependencies,
   finality/transport semantics, limits, failure/refund path and legal/terms
   review.
2. **Binding:** ABI from a pinned source digest becomes an Alloy `sol!` binding;
   every write selector, custom error and event has a fixture and selector
   assertion.
3. **Registry:** populate a testnet/shadow entry with source URLs and recorded
   code/implementation hashes; require two reviewers for live candidate entry.
4. **Differential tests:** compare typed calls/quotes with a pinned fork and
   protocol reference behavior at edge sizes/decimals; fuzz malformed return,
   revert and callback paths.
5. **Shadow:** record real ingress and full decision trail without signing or
   sending value.
6. **Limited live:** separate operator approval, tiny caps, transport-specific
   qualification and revert/markout stop rules.
7. **Continuous verification:** code/proxy/config/event watches and a scheduled
   revalidation. Upgrades move the capability back to shadow until reviewed.

## Asset policy

A token is not safe because it is named USDC/WETH in a UI. Every asset in a
live route needs chain-specific address, code hash, decimals, transfer behavior
and approval policy. Default deny: reject fee-on-transfer, rebasing,
blacklistable/pausable, callback-bearing, proxy-upgradeable or nonstandard ERC-20
assets unless a dedicated memo, exact simulations and risk caps approve them.

Approvals are target- and asset-specific. Prefer exact/reset approval patterns
where protocol compatibility permits; never grant a generic router unlimited
spend merely because it is in an address profile. The executor's `Call[]`
allowlist is a capability policy, not an arbitrary-call escape hatch.

## Oracle policy

Oracle observation is a trigger, never a truth source for a profitable
transaction. The final liquidation condition and proceeds are evaluated on the
pinned fork. Registry entries for Chainlink-like feeds include proxy,
aggregator/implementation, decimals, heartbeat/deviation expectations,
answered-round/updated-at validity checks and L2 sequencer-uptime/grace-period
policy where applicable. Chainlink documents separate L2 sequencer uptime feeds
and OCR aggregation; use those protocol semantics rather than assuming a
pending `transmit` selector is universal.[^chainlink]

[^chainlink]: <https://docs.chain.link/data-feeds/l2-sequencer-feeds> and
    <https://docs.chain.link/architecture-overview/architecture-decentralized-model?parent=dataFeeds>.

## Transaction compatibility

The signer/submitter supports only transaction envelope types that are tested
against the target chain and pinned Alloy release. Ethereum's EIP-7702 creates
EOA delegation semantics, so address classification, callback/allowlist logic,
nonce handling and simulation fixtures must not assume `EOA == no code` or
that `tx.origin` patterns are a security boundary.[^7702] Query/validate the
per-chain transaction gas cap rather than carrying an unqualified global
constant; EIP-7825 defines the Ethereum cap as 16,777,216 gas.[^7825]

[^7702]: <https://eips.ethereum.org/EIPS/eip-7702>.
[^7825]: <https://eips.ethereum.org/EIPS/eip-7825>.

## Review and emergency controls

- Registry changes are pull requests with diffable JSON/TOML, source evidence,
  generated binding digest and tests—not runtime form edits.
- Capability enablement is monotonic toward safety: an emergency rule can
  disable immediately; enabling/widening requires restart, review and local
  approval.
- A detected implementation/admin/config upgrade, changed token behavior,
  oracle validity failure or unknown selector pauses only the dependent
  capability first, then escalates according to the lane risk policy.
- Historical entries are retained so every settlement can be decoded against
  the ABI/code identity that existed when Aqua made its decision.
