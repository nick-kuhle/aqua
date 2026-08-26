import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader, Panel, Stat, copyText } from "@/components/aqua/widgets";
import { formatEth, ratioLabel } from "@/lib/aqua/format";
import { useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/optimizer")({ component: OptimizerPage });

function OptimizerPage() {
  const cell = useCell();
  if (!cell) return null;
  const opt = cell.optimizer;
  const data = opt.days.map((d) => {
    const ratio = ratioLabel(d.surplusV1Wei, d.surplusNaiveWei);
    return { day: d.day.slice(5), ratio, below: ratio < 1 };
  });
  const tapeWarn = opt.tapeAgeDays > 32;

  return (
    <div>
      <PageHeader
        title="Optimizer"
        lead="The optimizer is the company. A change that loses to naive on the frozen tape does not merge. This page is useless if it shows a single blended alpha number."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat
          label="Tape age"
          value={`${opt.tapeAgeDays.toFixed(1)}d`}
          hint={tapeWarn ? "older than 32 days — freeze a new tape" : "frozen 7-day CoW dump"}
        />
        <Stat label="Budget" value={`${opt.budgetMs}ms`} hint="OPT_BUDGET_MS" />
        <Stat
          label="Budget used"
          value={`${((cell.health.simP95Ms / opt.budgetMs) * 100).toFixed(1)}%`}
          hint={`sim p95 ${cell.health.simP95Ms}ms / ${opt.budgetMs}ms`}
        />
        <Stat label="Fill rate" value={`${(opt.fillRate * 100).toFixed(1)}%`} />
        <Stat label="Pairwise share" value={`${(opt.pairwiseShare * 100).toFixed(0)}%`} />
        <Stat label="Ring / spill" value={`${(opt.ringShare * 100).toFixed(0)}% / ${(opt.spillShare * 100).toFixed(0)}%`} />
      </div>

      <Panel title="surplus_v1 / surplus_naive per day" className="mt-4">
        <p className="mb-3 text-xs text-muted">
          Days below 1.0 are red. CI uses the same fixture. v1 matching + 3-rings + AMM spill must
          beat naive on every day, not on average.
        </p>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                opacity={0.4}
                width={40}
                domain={[0.9, "auto"]}
              />
              <RTooltip
                contentStyle={{
                  background: "var(--color-raised)",
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="ratio" name="v1 / naive" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell
                    key={d.day}
                    fill={d.below ? "var(--color-danger)" : "var(--color-accent)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-[11px] tracking-wide text-muted uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Day</th>
                <th className="py-2 pr-3 font-medium">Naive surplus</th>
                <th className="py-2 pr-3 font-medium">v1 surplus</th>
                <th className="py-2 pr-3 font-medium">Ratio</th>
                <th className="py-2 font-medium">Auctions</th>
              </tr>
            </thead>
            <tbody>
              {opt.days.map((d) => {
                const r = ratioLabel(d.surplusV1Wei, d.surplusNaiveWei);
                return (
                  <tr key={d.day} className="border-t border-border">
                    <td className="py-2 pr-3">{d.day}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums">{formatEth(d.surplusNaiveWei)}</td>
                    <td className="py-2 pr-3 font-mono tabular-nums">{formatEth(d.surplusV1Wei)}</td>
                    <td className={`py-2 pr-3 font-mono tabular-nums ${r < 1 ? "text-danger" : "text-pass"}`}>
                      {r.toFixed(3)}
                    </td>
                    <td className="py-2 font-mono tabular-nums">{d.auctions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            if (opt.lastFailedAuctionId) {
              void copyText(opt.lastFailedAuctionId, "Auction id copied");
            } else {
              void copyText("none", "No failed auction — copied “none”");
            }
          }}
        >
          Copy last failed auction id
        </Button>
        <p className="mt-2 text-xs text-subtle">
          {opt.lastFailedAuctionId
            ? `Last id below naive (if any): ${opt.lastFailedAuctionId}`
            : "No tape day lost to naive."}
        </p>
      </Panel>
    </div>
  );
}
