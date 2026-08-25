# Setup

**Status: normative target specification — no implementation exists as of 24 August 2026.**

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

At commit `ed66d03` this repository is a specification: the workspace,
contracts, console, CI and Make targets described below do not yet exist.
Commands in this page are the target developer workflow, not commands that can
succeed today. Read [`CURRENT_STATE_2026.md`](CURRENT_STATE_2026.md) before
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

## Doctor

```bash
make doctor
# or: cargo run --bin aqua -- doctor
```

Probes HTTP, WS, chain id match, optional CoW shadow ping, anvil spawn,
artifact hash. Prints `✗` on kill switch, missing token when bind is
public, and forbidden legacy env names.

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
