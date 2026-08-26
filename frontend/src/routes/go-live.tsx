import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/aqua/widgets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { chainOf } from "@/lib/aqua/chains";
import { useAquaStore, useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/go-live")({ component: GoLivePage });

const STEPS = [
  {
    title: "Wallet on the console’s chain",
    body: "No injected wallet. EIP-6963 discovery found nothing. Wallet chain and console chain stay independent.",
  },
  {
    title: "Key separation",
    body: "Intent signer ≠ sidecar signer ≠ owner. This process has no private-key parser. Cannot verify separation of keys that do not exist.",
  },
  {
    title: "Deploy / paste executor",
    body: "Verify bytecode hash against artifacts. No artifact is in this cell. Deployment is not arming.",
  },
  {
    title: "Allowlist searcher",
    body: "Blocked until the executor exists. Owner-only setSearcher from a connected wallet.",
  },
  {
    title: "Fund gas",
    body: "And WETH only if a row needs it. Mouth A via DAO-pool driver holds no keys here. Sidecar needs flash liquidity, not inventory.",
  },
  {
    title: "doctor",
    body: "Config parses. Provider, Anvil, registry and CoW onboarding checks fail closed — as they should.",
  },
  {
    title: "Qualification snapshot",
    body: "Every row is INSUFFICIENT SAMPLE or INELIGIBLE. Changing the soak window does not mint a PASS.",
  },
  {
    title: "Independent lane switches",
    body: "Mouth A live | Sidecar live. Mouth B is a later card. No single “go live everything” button.",
  },
];

function GoLivePage() {
  const cell = useCell();
  const requestLive = useAquaStore((s) => s.requestLive);
  const armingError = useAquaStore((s) => s.armingError);
  const walletAddress = useAquaStore((s) => s.walletAddress);
  const walletChainId = useAquaStore((s) => s.walletChainId);
  if (!cell) return null;
  const chain = chainOf(cell.chainId);
  const steps = STEPS.map((s, i) => {
    if (i !== 0) return s;
    if (!walletAddress) {
      return {
        ...s,
        body: "EIP-6963 found nothing, or nothing connected. Wallet chain and console chain stay independent. This host does not sign.",
      };
    }
    const mismatch =
      walletChainId != null && walletChainId !== cell.chainId
        ? ` Wallet ${walletChainId} ≠ console ${cell.chainId} (amber, not a silent switch).`
        : ` Wallet on ${walletChainId ?? "unknown"}.`;
    return {
      ...s,
      body: `Connected ${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}.${mismatch} Still not arming — identity is not an execution key.`,
    };
  });

  return (
    <div>
      <PageHeader
        title="Go-live"
        lead={`Path A, per chain, per lane. Print it. A wizard that cannot skip gates. Current cell: ${chain.name}.`}
      />

      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] tracking-wide text-subtle uppercase">
                    Gate {i + 1} / {STEPS.length}
                  </div>
                  <h2 className="text-sm font-medium">{s.title}</h2>
                  <p className="mt-1 max-w-2xl text-sm text-muted">{s.body}</p>
                </div>
                <Badge tone="muted">blocked</Badge>
              </div>
              {i === 5 ? (
                <ul className="mt-4 divide-y divide-border">
                  {cell.doctor.map((d) => (
                    <li key={d.name} className="flex items-start justify-between gap-3 py-2">
                      <div>
                        <div className="text-sm">{d.name}</div>
                        <p className="text-xs text-muted">{d.detail}</p>
                      </div>
                      <Badge tone={d.ok ? "pass" : "warn"}>{d.ok ? "ok" : "blocked"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
              {i === STEPS.length - 1 ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" disabled>
                    Arm Mouth A
                  </Button>
                  <Button variant="outline" disabled>
                    Arm sidecar
                  </Button>
                  <Button variant="danger" onClick={() => requestLive()}>
                    Force live request
                  </Button>
                </div>
              ) : null}
            </Panel>
          </li>
        ))}
      </ol>

      {armingError ? (
        <pre className="mt-4 overflow-x-auto rounded-md bg-raised p-3 text-xs text-danger whitespace-pre-wrap">
          {armingError}
        </pre>
      ) : null}

      <p className="mt-4 text-xs text-subtle">
        Soak threshold is operator-selectable on Qualification and does not mint a PASS. Second
        person in the room is the pause, not a hope.
      </p>
    </div>
  );
}
