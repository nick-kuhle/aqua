# Deployment

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

Production is systemd or Docker Compose. One instance per chain.
Metrics and alerts are part of the binary, not a sidecar process
(Prometheus scrape is fine).

---

## Layout

```
/etc/aqua/ethereum.env
/etc/aqua/bnb.env
/etc/aqua/base.env
/var/lib/aqua/ethereum.sqlite
/var/lib/aqua/bnb.sqlite
...
```

Units: `aqua@ethereum`, `aqua@bnb`, `aqua@base`. Template in
`deploy/systemd/aqua@.service`.

Console: one Next deploy. `CHAINS` points at each API. Auth token per
bot if APIs are not loopback. Prefer a reverse proxy on localhost.

---

## Docker

`deploy/docker-compose.yml`: one service per chain, bind mounts for
sqlite and env. Engine user is non-root. No secrets in the image.
`anvil` must be in the engine image PATH.

---

## API security

`API_BIND` loopback by default. Non-loopback requires `API_AUTH_TOKEN`
in **simulation too**. Mutating routes: `/api/mode`, `/api/risk`,
`/api/risk/reset`, qualification window.

---

## Metrics

`GET /api/metrics` Prometheus.

Minimum series: funnel counters, sim latency histograms, shed counts,
persistence drops, head lag, kill switch (0/1), smoke remaining, CoW
deadline misses, on-chain revert-wins.

---

## Alerts

Rule engine in-process. Fire/resolve lifecycle. Webhook optional.

Default rules (knobs in env):

- kill switch tripped
- head stall
- RPC errors
- conversion collapse (submittable → 0 with candidates > 0, sustained)
- reorg
- CoW win reverted
- Mouth B negative markout burst
- sqlite write failures on safety tables (not on dropped observability)

---

## Backups

SQLite is qualification, nonces, kill switch, smoke. Timer in
`deploy/systemd`. Never delete the file to “unstick” nonce recovery.

---

## Doctor on the host

`aqua doctor` in the unit’s `ExecStartPre` is allowed if it cannot hang
the timeout. Prefer a separate oneshot.

---

## Multi-chain ports

| Chain | API (example) | CoW solve |
| --- | --- | --- |
| ETH | 127.0.0.1:8080 | 127.0.0.1:8081 |
| BNB | 127.0.0.1:8180 | 127.0.0.1:8181 |
| Base | 127.0.0.1:8280 | 127.0.0.1:8281 |

Document the actual binds in the host runbook, not in git with secrets.
