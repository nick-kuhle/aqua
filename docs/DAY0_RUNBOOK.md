# Day-0 runbook

**Status: normative target specification — no implementation exists as of 24 August 2026.**

First production host. Assume CI is green and a tag exists.

---

## Host

- Linux, `aqua` user, no extra services on the box if you can help it
- `anvil`, `aqua` binary, env files, sqlite dir
- NTP sane (CoW deadlines and block times)
- Disk for sqlite + WAL
- Outbound: RPC, CoW (if Mouth A), relays (if L1 sidecar)
- Inbound: none except your proxy to loopback APIs

## Install

1. Install Foundry anvil + the tagged `aqua` binary (or image).
2. Env files in `/etc/aqua/` mode 0600.
3. Empty sqlite dir, ownership `aqua`.
4. systemd units `aqua@bnb` and/or `aqua@ethereum`. Enable, do not start
   live-armed.
5. Console with `CHAINS` pointing at loopback.

## First start (simulation)

```text
systemctl start aqua@bnb     # or ethereum
journalctl -u aqua@bnb -f
curl -s localhost:8180/api/status
aqua doctor
```

Expect: heads, (BNB) solver bind, empty funnel or naive solutions, no
submits.

## Confirm isolation

Start a second chain only after the first is boring. Different sqlite,
different ports, different keys. Arming one unit must not log in the
other.

## Backup

Enable `aqua-db-backup@.timer` before any soak. Test a restore on a
scratch file.

## Then

[`PATH_TO_LIVE.md`](PATH_TO_LIVE.md) in a room with two people.

If anything in doctor is `✗`, you are not on day 0, you are still in
setup.
