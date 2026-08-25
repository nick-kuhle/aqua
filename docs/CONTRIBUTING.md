# Contributing

**Status: normative target specification — only the non-networked foundation in [`FOUNDATION.md`](FOUNDATION.md) exists as of 24 August 2026; no protocol or execution path exists.**

**Reading rule:** Except for explicitly dated external-market observations, “is”, “does”, “uses”, and similar present-tense language below specifies required future behavior; it is not evidence that a component exists today.

Read [`MAINTAINING.md`](MAINTAINING.md) first. Then
[`ADDING.md`](ADDING.md). Then the doc for the surface you are touching.

## Rules that will bounce a PR

- Live path stubbed (“TODO: submit”).
- New row without funnel, empty-state copy, and qualification.
- Optimizer change that loses to `naive` on the frozen tape.
- `f64` on settlement quotes.
- Sandwich / JIT-revenue / sniper code.
- Secrets, RPC URLs with keys, treasury addresses.
- Executor bytecode drift without an explicit contract PR.
- Qualification population reuse.
- `victim_hashes` used for CoW or Flashblocks.

## Docs

If you change behaviour, you change the doc in the same PR. Roadmap
checkboxes flip only when CI on `main` is green for that item.

## Voice

Fail-closed, specific, dated when it is landscape. No “simply,” no
“just add a flag.”
