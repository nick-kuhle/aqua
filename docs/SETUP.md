# Setup

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

## Toolchains

| Tool | Version | Install |
| --- | --- | --- |
| Rust | 1.90+ (see `bot/rust-toolchain.toml`) | rustup |
| Foundry | latest stable (`forge`, `cast`, `anvil`) | `curl -L https://foundry.paradigm.xyz \| bash` then `foundryup` |
| Node.js | 22+ | whatever pins 22 |
| Make | any | |

Optional: `solc` via the contracts `package.json` for `compile-check.js`
without Foundry.

## Implementation status

A small Rust workspace now exists and its non-networked foundation has passed
Rust 1.90 fmt, clippy, and unit tests. Contracts, console, CI,
provider/signing/simulation/transport paths and most operational Make targets
do not yet exist. Commands in this page remain target workflow unless
[`FOUNDATION.md`](FOUNDATION.md) lists them as implemented. Read it before
onboarding or provisioning secrets.

New Rust EVM code uses Alloy; see [`ALLOY.md`](ALLOY.md).

## Repo

```
git clone --recurse-submodules <url> && cd aqua
make setup
```

`make setup` pulls submodules (`forge-std`), `npm ci` in `frontend/` and
`contracts/` if needed, and copies `.env.example` → `.env` if missing.

## Environment

See [`CONFIG.md`](CONFIG.md). Minimum to boot in simulation:

```text
CHAIN_ID=1
ETH_HTTP_URL=...          # archive
ETH_WS_URL=...
```

BNB CoW process:

```text
CHAIN_ID=56
BNB_HTTP_URL=...
BNB_WS_URL=...
```

Never commit `.env`. Never put private keys in git. Example files contain
names and comments only.

## Current foundation commands

With the pinned Rust toolchain installed, the only currently implemented
commands are deliberately non-networked:

```bash
make test             # cargo test --workspace in bot/
make fmt              # cargo fmt --check in bot/
make doctor           # parse fail-closed config only; no RPC, signing, or send
```

`aqua doctor` currently validates required/fail-closed configuration names and
reports that chain checks are not implemented. It does **not** probe HTTP/WS,
spawn Anvil, inspect artifacts, contact CoW, sign, or broadcast. The prior
developer workflow below is target-only.

## Run

```bash
make bot-run          # engine + API (loopback)
make front-dev        # console
```

Two processes. The console proxies the bot. Bind and auth: [`RISK.md`](RISK.md).

## Tests

```bash
make test             # cargo test --all && forge test
make tape             # optimizer vs naive
```

CI has no live RPC. Do not add tests that need one.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Funnel all zeros | Empty pool cache; wrong chain profile; mouth not constructed |
| Liq always 0 net | `TOKEN_VALUATION=false` |
| Doctor `✗ env names` | `MIN_NET_PROFIT_ETH` or other forbidden aliases |
| 409 on live mode | Boot flags off |
| CoW no auctions | Autopilot URL not pointed at this solver; not in shadow |
| Anvil spawn fail | `anvil` not on PATH; too many reforks |
