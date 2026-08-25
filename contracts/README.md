# contracts/

Foundry. One contract on the atomic path: `AquaExecutor.sol`.

CoW and UniswapX use their own settlement/reactor. Do not wrap them
unless Aqua is funding a leg.

`foundry.toml`: solc 0.8.26, Cancun, `bytecode_hash = "none"`.
`script/compile-check.js` emits deterministic ABI + runtime hex the bot
embeds. CI fails on drift.

See `docs/CONTRACTS.md`.
