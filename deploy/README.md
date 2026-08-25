# `deploy/` — planned operations assets

> **Not implemented.** This directory has no systemd unit, Docker Compose
> manifest, backup timer, secrets integration, or deployment automation at
> commit `6c64e12`.

The intended model is one independently operated chain cell per instance, with
separate registry, safety store, signer lanes, risk state, qualification, RPC
pool, backup/restore drill, and on-call route. Do not infer that a host is
ready merely because this directory exists.

See [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md),
[`docs/DAY0_RUNBOOK.md`](../docs/DAY0_RUNBOOK.md), and
[`docs/SCALE.md`](../docs/SCALE.md).