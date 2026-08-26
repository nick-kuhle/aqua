import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, VerdictChip } from "@/components/aqua/widgets";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STRATEGIES, STRATEGY_LABEL } from "@/lib/aqua/types";
import { useAquaStore, useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/qualification")({ component: QualificationPage });

function QualificationPage() {
  const cell = useCell();
  const setSoakHours = useAquaStore((s) => s.setSoakHours);
  if (!cell) return null;

  return (
    <div>
      <PageHeader
        title="Qualification"
        lead="A row may be a live candidate and still forbidden to send. Evidence is about this binary. INSUFFICIENT SAMPLE is the honest v1 state — not a green wait."
      />

      <Panel>
        <Label htmlFor="soak">Soak window (hours)</Label>
        <Input
          id="soak"
          type="number"
          min={1}
          max={8760}
          className="mt-1.5 max-w-[12rem]"
          value={cell.soakHours}
          onChange={(e) => setSoakHours(Number(e.target.value))}
        />
        <p className="mt-1 text-xs text-subtle">
          Changes the window; does not invent evidence. Default 168. LIVE_SMOKE_MAX remaining: 0.
          Smoke does not grant PASS. Shadow-only rows cannot smoke.
        </p>
      </Panel>

      <div className="mt-4 space-y-3 lg:hidden">
        {STRATEGIES.map((row) => {
          const q = cell.qualification[row];
          return (
            <Panel key={row} title={STRATEGY_LABEL[row]}>
              <div className="mb-2">
                <VerdictChip verdict={q.verdict} />
              </div>
              <p className="text-xs text-muted">{q.reason}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-[11px] text-muted uppercase">Samples</dt>
                  <dd className="font-mono tabular-nums">{q.samples}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted uppercase">Continuity</dt>
                  <dd className="font-mono tabular-nums">{q.continuityHours.toFixed(1)}h</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted uppercase">Smoke left</dt>
                  <dd className="font-mono tabular-nums">{q.smokeRemaining}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted uppercase">Backend</dt>
                  <dd className="text-xs">{q.backend}</dd>
                </div>
              </dl>
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-4 hidden overflow-hidden p-0 sm:p-0 lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-medium">Row</th>
                <th className="px-3 py-3 font-medium">Verdict</th>
                <th className="px-3 py-3 font-medium">Samples</th>
                <th className="px-3 py-3 font-medium">Continuity</th>
                <th className="px-3 py-3 font-medium">Window</th>
                <th className="px-3 py-3 font-medium">Smoke</th>
                <th className="px-3 py-3 font-medium">Last break</th>
                <th className="px-3 py-3 font-medium">Backend</th>
              </tr>
            </thead>
            <tbody>
              {STRATEGIES.map((row) => {
                const q = cell.qualification[row];
                return (
                  <tr key={row} className="border-b border-border last:border-0 align-top">
                    <td className="px-4 py-3">
                      <div>{STRATEGY_LABEL[row]}</div>
                      <p className="mt-1 max-w-sm text-xs text-muted">{q.reason}</p>
                      {!q.liveCandidate ? (
                        <p className="mt-1 text-xs text-subtle">
                          This is not a soak. This row cannot pass.
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <VerdictChip verdict={q.verdict} />
                    </td>
                    <td className="px-3 py-3 font-mono tabular-nums">{q.samples}</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{q.continuityHours.toFixed(1)}h</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{q.windowHours}h</td>
                    <td className="px-3 py-3 font-mono tabular-nums">{q.smokeRemaining}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">
                      {q.lastBreak ? q.lastBreak.replace("T", " ").slice(0, 19) : "—"}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted">{q.backend}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
