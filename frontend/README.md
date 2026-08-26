# `frontend/` — shadow operator console

**Status: implemented as a generated-data, fail-closed instrument. Not a live
bot. Not the Next.js target in `docs/FRONTEND.md`.**

This is Aqua v1.0's operator surface. It runs an in-process TypeScript shadow
cell: naive + v1 optimizer on a frozen 7-day CoW tape, Morpho/Aave sidecar
accounting, funnel, qualification (INSUFFICIENT SAMPLE / INELIGIBLE), kill
switch, and a go-live wizard that cannot arm.

It does **not**:

- construct an Alloy provider or pin a real block
- parse a private key or call `sendTransaction`
- simulate exact signed bytes on Anvil
- talk to CoW / Morpho / Aave
- mix simulated P/L into a blended APY
- mint qualification PASS from soak-window edits

Wallet discovery is EIP-6963 identity only. `LIVE_EXECUTION` POST is rejected
with 409 and the nine arming gates. UniswapX and ERC-7683 remain crate stubs
with empty scoreboards.

Stack: TanStack Start + Vite + Tailwind. Spec still names Next.js; this slice
is the runnable console, not a stack rewrite of the kernel.

```bash
cd frontend
npm install
npm test
npm run typecheck
npm run dev     # 127.0.0.1:3000
```

Same-origin bot proxy, attested protocol registry, and live data are out of
scope until the Rust cell exists. See `docs/FOUNDATION.md` and
`docs/FRONTEND.md`.
