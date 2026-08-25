# `frontend/` — planned operator console

> **Not implemented.** This directory contains no Next.js application, API
> proxy, demo dataset, UI, authentication, or browser-facing route at commit
> `6c64e12`.

The target console is an operator surface, not an execution client: it will use
same-origin server routes, never expose bot credentials or execution keys to
the browser, clearly label generated/demo data, and keep mouths/lanes separate
rather than showing a blended APY. Its complete target specification is
[`docs/FRONTEND.md`](../docs/FRONTEND.md).