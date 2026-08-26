import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader, Panel } from "@/components/aqua/widgets";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { rowPolicy } from "@/lib/aqua/eligibility";
import { chainOf } from "@/lib/aqua/chains";
import { STRATEGIES, STRATEGY_LABEL, type FunnelCounters, type StrategyId } from "@/lib/aqua/types";
import { useAquaStore, useCell } from "@/lib/aqua/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/funnel")({ component: FunnelPage });

const COLS: { key: keyof FunnelCounters; label: string; tip: string }[] = [
  { key: "invocationsWithOutput", label: "with output", tip: "Calls that produced ≥ 1 candidate. Not a win rate." },
  { key: "invocationsEmpty", label: "empty", tip: "Calls that produced none." },
  { key: "candidatesEmitted", label: "candidates", tip: "A single call can emit many candidates." },
  { key: "gatedByRisk", label: "gated", tip: "Rejected by the ordered risk gate." },
  { key: "simulationsSucceeded", label: "sim ok", tip: "Shadow sim of exact payload succeeded." },
  { key: "simulationsReverted", label: "sim revert", tip: "Shadow sim reverted." },
  { key: "submittable", label: "submittable", tip: "Survived sim + risk. Still not a send." },
  { key: "submitted", label: "submitted", tip: "Payloads that left the host. Always 0 here." },
  { key: "revertedOnchain", label: "onchain revert", tip: "Incidents. A reverted win is negative reward." },
];

function FunnelPage() {
  const cell = useCell();
  const source = useAquaStore((s) => s.funnelSource);
  const setSource = useAquaStore((s) => s.setFunnelSource);
  if (!cell) return null;
  const chain = chainOf(cell.chainId);
  const table = source === "live" ? cell.funnelLive : cell.funnelReplay;

  return (
    <div>
      <PageHeader
        title="Funnel"
        lead="Two units. Never divide candidates by invocations and call it a win rate. Live and replay populations do not mix."
        aside={
          <div className="flex rounded-full bg-raised p-0.5">
            {(["live", "replay"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSource(s)}
                className={cn(
                  "h-10 rounded-full px-3 text-xs font-medium",
                  source === s ? "bg-accent text-accent-fg" : "text-muted",
                )}
              >
                {s === "live" ? "Live" : "Replay"}
              </button>
            ))}
          </div>
        }
      />

      {source === "replay" ? (
        <p className="mb-3 text-xs text-muted">
          Replay is the frozen 7-day CoW optimizer tape. Other rows have no mined replay. Live and
          replay populations do not mix.
        </p>
      ) : null}

      <div className="mt-4 space-y-3 lg:hidden">
        {STRATEGIES.map((row) => (
          <FunnelCard
            key={row}
            row={row}
            counts={table[row]}
            chainId={chain.id}
            replay={source === "replay"}
          />
        ))}
      </div>

      <Panel className="mt-4 hidden overflow-hidden p-0 sm:p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">Row</th>
                {COLS.map((c) => (
                  <th key={c.key} className="px-3 py-3 font-medium">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help border-b border-dotted border-subtle">
                        {c.label}
                      </TooltipTrigger>
                      <TooltipContent>{c.tip}</TooltipContent>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((row) => (
                <FunnelRow
                  key={row}
                  row={row}
                  counts={table[row]}
                  chainId={chain.id}
                  replay={source === "replay"}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function FunnelRow({
  row,
  counts,
  chainId,
  replay,
}: {
  row: StrategyId;
  counts: FunnelCounters;
  chainId: number;
  replay: boolean;
}) {
  const policy = rowPolicy(row, chainOf(chainId));
  const allZero = COLS.every((c) => counts[c.key] === 0);
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3">
        <div className="text-fg">{STRATEGY_LABEL[row]}</div>
        <div className="text-[11px] text-subtle">
          {policy.constructed ? (policy.shadowOnly ? "shadow" : "constructed") : "not constructed"}
        </div>
        {allZero ? (
          <p className="mt-1 max-w-xs text-xs text-muted">{whyEmpty(row, policy.reason, replay)}</p>
        ) : null}
      </td>
      {COLS.map((c) => (
        <td key={c.key} className="px-3 py-3 font-mono tabular-nums text-fg">
          {counts[c.key]}
        </td>
      ))}
    </tr>
  );
}

function FunnelCard({
  row,
  counts,
  chainId,
  replay,
}: {
  row: StrategyId;
  counts: FunnelCounters;
  chainId: number;
  replay: boolean;
}) {
  const policy = rowPolicy(row, chainOf(chainId));
  const allZero = COLS.every((c) => counts[c.key] === 0);
  return (
    <Panel title={STRATEGY_LABEL[row]}>
      <p className="mb-3 text-[11px] text-subtle">
        {policy.constructed ? (policy.shadowOnly ? "shadow" : "constructed") : "not constructed"}
      </p>
      {allZero ? (
        <Empty>{whyEmpty(row, policy.reason, replay)}</Empty>
      ) : (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {COLS.map((c) => (
            <div key={c.key}>
              <dt className="text-[11px] tracking-wide text-muted uppercase">{c.label}</dt>
              <dd className="font-mono tabular-nums">{counts[c.key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

function whyEmpty(row: StrategyId, reason: string, replay: boolean): string {
  if (replay && row !== "cow_batch") {
    return "Replay population is the frozen 7-day CoW tape. This row has no mined replay.";
  }
  if (row === "uniswapx_fill") return "Crate stub — not PENDING soak.";
  if (row === "erc7683_fill") return "Crate stub — wire format only.";
  if (row === "cow_batch") return "No auctions. Is Mouth A constructed? Shadow vs staging vs prod?";
  return reason;
}
