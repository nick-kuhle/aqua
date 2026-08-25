# `contracts/` — planned Foundry project

> **Not implemented.** This directory contains no Foundry configuration,
> Solidity source, tests, artifacts, deployment script, or ABI at commit
> `6c64e12`. The statements below are a contract specification, not deployed
> functionality.

The intended atomic-path contract is `AquaExecutor.sol`. CoW and UniswapX
settlement/reactor contracts remain external protocol integrations; Aqua should
not wrap them unless it is explicitly funding an atomic leg and the route has a
reviewed registry entry.

The target Foundry configuration is Solidity 0.8.26, Cancun, and
`bytecode_hash = "none"`. A future `compile-check` should produce deterministic
ABI/runtime artifacts consumed by typed Alloy bindings, and CI should reject
unexpected runtime drift.

See [`docs/CONTRACTS.md`](../docs/CONTRACTS.md),
[`docs/PROTOCOL_REGISTRY.md`](../docs/PROTOCOL_REGISTRY.md), and
[`docs/TESTING.md`](../docs/TESTING.md).