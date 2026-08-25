# Path to live

**Status: normative target specification — no implementation exists as of 24 August 2026.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

One-page in-the-room runbook. Per chain, per lane. Print it.

Companion: [`SIM_TO_LIVE.md`](SIM_TO_LIVE.md) (order), 
[`DAY0_RUNBOOK.md`](DAY0_RUNBOOK.md) (host), console Go-live wizard
([`FRONTEND.md`](FRONTEND.md)).

---

## Before the room

- [ ] Tag built from CI green (`aqua x.y.z`)
- [ ] This tag is what will soak — not `main`
- [ ] Doctor green on the host
- [ ] SQLite backed up
- [ ] Keys in the host secret store, not chat
- [ ] Console on the right chain pill
- [ ] Second person in the room (pause is a person, not a hope)

## Burst (smoke)

- [ ] Lane identified: Mouth A (BNB) **or** sidecar (ETH). Not both
      in the same burst until each has survived once.
- [ ] `LIVE_SMOKE_MAX` ≤ 5 written
- [ ] Raw wei cap written if raw
- [ ] Arm, send, watch receipts
- [ ] Each smoke: record hash, sim net, realised net, incident or ok
- [ ] Any incident: stop. Clock will restart after a fix anyway.

## Soak

- [ ] Smoke remaining 0 or you chose to skip smoke
- [ ] Arm for real
- [ ] 168 h continuous
- [ ] No binary change, no executor redeploy, no sqlite wipe
- [ ] Daily: funnel, qualification, alerts, equity **finalized** vs sim
- [ ] Gap in heads or a crash: clock restarts. Write the time down.

## Pass

- [ ] `GET /api/qualification` `PASS` for that row
- [ ] Written note: window, sample counts, incidents (none is a
      sentence, not a blank)

## Stop

Pause via console. If kill switch: only `POST /api/risk/reset` after a
written cause. Restarting systemd is not a re-arm.
