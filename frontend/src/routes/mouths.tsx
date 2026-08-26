import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader, Panel, Sparkline, Stat } from "@/components/aqua/widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chainOf } from "@/lib/aqua/chains";
import { formatCompact, ratioLabel } from "@/lib/aqua/format";
import { useAquaStore, useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/mouths")({ component: MouthsPage });

function MouthsPage() {
  const cell = useCell();
  const setCowWeekly = useAquaStore((s) => s.setCowWeekly);
  const toggleStrategy = useAquaStore((s) => s.toggleStrategy);
  if (!cell) return null;
  const chain = chainOf(cell.chainId);
  const cow = cell.cow;
  const spark = cell.optimizer.days.map((d) => ratioLabel(d.surplusV1Wei, d.surplusNaiveWei));

  return (
    <div>
      <PageHeader
        title="Mouths"
        lead="Mouths are codecs over Solution. Rows do not blend. No total APY."
        aside={
          <Button
            variant="outline"
            onClick={() => toggleStrategy("cow_batch", false)}
            disabled={!cell.enabled.cow_batch}
          >
            Halt Mouth A
          </Button>
        }
      />

      <Panel title="CoW scoreboard">
        <p className="mb-4 text-xs text-muted">
          Driver: {cell.cowDriver} · chain {chain.name} · onboarding environment unverified.{" "}
          {chain.cowShadowReason}
        </p>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-subtle">v1 / naive on the frozen tape (not a payout)</p>
          <Sparkline values={spark} />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Auctions seen" value={formatCompact(cow.auctionsSeen)} />
          <Stat label="Solutions accepted" value={formatCompact(cow.solutionsAccepted)} hint="shadow" />
          <Stat label="Wins (on-chain)" value={0} hint="never submitted" />
          <Stat label="Shadow wins" value={formatCompact(cow.shadowWins)} hint="would-have, not a payout" />
          <Stat label="On-chain reverts" value={0} />
          <Stat label="Deadline misses" value={formatCompact(cow.deadlineMissed)} />
          <Stat label="Fairness rejects" value={formatCompact(cow.fairnessRejected)} />
          <Stat label="Gated by risk" value={formatCompact(cow.gatedByRisk)} />
        </div>
        {cow.auctionsSeen === 0 ? (
          <div className="mt-4">
            <Empty>
              No auctions. Is Mouth A constructed? Is the solver URL in the autopilot? Shadow vs
              staging vs prod?
            </Empty>
          </div>
        ) : null}
        <div className="mt-5 max-w-sm">
          <Label htmlFor="cow-weekly">Weekly COW</Label>
          <Input
            id="cow-weekly"
            className="mt-1.5"
            value={cell.cowWeekly}
            onChange={(e) => setCowWeekly(e.target.value)}
          />
          <p className="mt-1 text-xs text-subtle">
            Manual input or pasted Dune. Do not scrape a dashboard as a source of truth.
          </p>
        </div>
      </Panel>

      <Panel title="UniswapX scoreboard" className="mt-4">
        <Empty>
          Hidden crate. UniswapX is not a generic Dutch-order adapter — Ethereum RFQ then exclusive
          Dutch, Arbitrum direct Dutch, Base/Unichain priority-gas. Inventory, markout, Permit2 and
          MIN_FILL_BPS are required before this panel may show fills.
        </Empty>
      </Panel>

      <Panel title="ERC-7683" className="mt-4">
        <Empty>
          Crate stub. ERC-7683 standardizes a wire format, not liquidity, finality, proof
          verification or inventory financing. Do not show fake fills. Do not call this Across.
        </Empty>
      </Panel>
    </div>
  );
}
