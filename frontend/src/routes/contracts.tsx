import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader, Panel, Stat } from "@/components/aqua/widgets";
import { Button } from "@/components/ui/button";
import { chainOf } from "@/lib/aqua/chains";
import { useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/contracts")({ component: ContractsPage });

function ContractsPage() {
  const cell = useCell();
  if (!cell) return null;
  const chain = chainOf(cell.chainId);

  return (
    <div>
      <PageHeader
        title="Contracts"
        lead="The browser never holds execution keys. Deployment is not arming. AquaExecutor is the only Aqua-owned contract; CoW settlement and UniswapX reactors stay foreign."
      />

      <Panel title="AquaExecutor">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Owner" value="—" hint="not deployed" />
          <Stat label="Searchers" value="0" hint="allowlist empty" />
          <Stat label={`Native (${chain.native})`} value="—" />
          <Stat label="WETH" value="—" />
        </div>
        <div className="mt-4">
          <Empty>
            No Foundry artifact, no runtime bytecode hash, no allowlist. Generic Call[] executor
            with retained-profit guard is specified — it is not on {chain.name}.
          </Empty>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" disabled>
            setSearcher
          </Button>
          <Button variant="outline" disabled>
            sweep
          </Button>
          <Button variant="outline" disabled>
            Deploy
          </Button>
        </div>
        <p className="mt-3 text-xs text-subtle">Deployment is not arming.</p>
      </Panel>

      <Panel title="CoW settlement" className="mt-4">
        <Empty>
          Read-only link, after a code-hash-attested registry entry exists. This console will not
          invent an address from prose.
        </Empty>
      </Panel>

      <Panel title="UniswapX reactor" className="mt-4">
        <Empty>Read-only. Crate stub — no reactor address is authoritative here.</Empty>
      </Panel>
    </div>
  );
}
