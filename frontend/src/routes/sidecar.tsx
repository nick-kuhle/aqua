import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader, Panel, Stat } from "@/components/aqua/widgets";
import { chainOf } from "@/lib/aqua/chains";
import { formatCompact, formatEth } from "@/lib/aqua/format";
import { useCell } from "@/lib/aqua/store";
import type { SidecarPanel } from "@/lib/aqua/types";

export const Route = createFileRoute("/sidecar")({ component: SidecarPage });

function SidecarPage() {
  const cell = useCell();
  if (!cell) return null;
  const chain = chainOf(cell.chainId);

  return (
    <div>
      <PageHeader
        title="Sidecar"
        lead="Morpho, Aave and oracle are separate nonce-lane subpanels. Simulated vs finalized P/L never blend. TOKEN_VALUATION is off — uncertified profit tokens net zero."
      />
      <LiqPanel
        title="Morpho Blue"
        panel={cell.morpho}
        native={chain.native}
        extra={`Watch cap ${cell.morpho.watchCap}. Full close, repay-by-shares.`}
      />
      <LiqPanel
        title="Aave V3"
        panel={cell.aave}
        native={chain.native}
        extra="Largest debt paired with largest collateral. liquidationCall on underlying, not aToken. Aave v4 is a separate capability row — not this panel."
      />
      <Panel title="Oracle backrun" className="mt-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Leads" value={formatCompact(cell.oracle.watchlist)} />
          <Stat label="Near-miss" value={formatCompact(cell.oracle.nearMiss)} />
          <Stat
            label="Last selector"
            value={cell.oracle.lastSelector ?? "—"}
          />
          <Stat label="Sim P/L" value={`${formatEth(cell.oracle.simWei)} ${chain.native}`} />
        </div>
        <div className="mt-4">
          <Empty>{cell.oracle.emptyWhy}</Empty>
        </div>
      </Panel>
    </div>
  );
}

function LiqPanel({
  title,
  panel,
  native,
  extra,
}: {
  title: string;
  panel: SidecarPanel;
  native: string;
  extra: string;
}) {
  return (
    <Panel title={title} className="mt-4">
      <p className="mb-3 text-xs text-subtle">{extra}</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Watchlist"
          value={`${formatCompact(panel.watchlist)} / ${panel.watchCap}`}
        />
        <Stat label="Near-miss" value={formatCompact(panel.nearMiss)} />
        <Stat label="Simulated P/L" value={`${formatEth(panel.simWei)} ${native}`} />
        <Stat label="Finalized P/L" value={`${formatEth(panel.finalWei)} ${native}`} hint="always zero until live" />
        <Stat label="Valuation misses" value={formatCompact(panel.valuationMisses)} hint="uncertified profit token" />
      </div>
      {panel.watchlist === 0 || panel.simWei === 0n ? (
        <div className="mt-4">
          <Empty>{panel.emptyWhy}</Empty>
        </div>
      ) : null}
    </Panel>
  );
}
