import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty, PageHeader, Panel, Stat } from "@/components/aqua/widgets";
import { chainOf } from "@/lib/aqua/chains";
import { formatAge, formatCompact, formatEth, shortHash } from "@/lib/aqua/format";
import { useAquaStore, useCell } from "@/lib/aqua/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Overview });

function Overview() {
  const cell = useCell();
  const showSim = useAquaStore((s) => s.equityShowSim);
  const showFinal = useAquaStore((s) => s.equityShowFinal);
  const setEquitySeries = useAquaStore((s) => s.setEquitySeries);
  if (!cell) return null;
  const chain = chainOf(cell.chainId);
  const data = cell.equity.map((p) => {
    const d = new Date(p.t);
    const t = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
    return { t, sim: p.simEth, finalized: p.finalizedEth };
  });

  return (
    <div>
      <PageHeader
        title="Overview"
        lead={`Is this cell alive? ${chain.name} · ${chain.v1Job}. Simulated P/L and finalized P/L never share an unmarked line.`}
        aside={
          <div className="flex rounded-full bg-raised p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setEquitySeries(!showSim, showFinal)}
              className={cn(
                "h-10 rounded-full px-3",
                showSim ? "bg-accent text-accent-fg" : "text-muted",
              )}
            >
              Simulated
            </button>
            <button
              type="button"
              onClick={() => setEquitySeries(showSim, !showFinal)}
              className={cn(
                "h-10 rounded-full px-3",
                showFinal ? "bg-accent text-accent-fg" : "text-muted",
              )}
            >
              Finalized
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SurfaceTile
          name="Mouth A"
          sub="CoW · shadow"
          net={formatEth(cell.surfaces.mouthA.netSimWei)}
          count={cell.surfaces.mouthA.fillOrWin}
          age={cell.surfaces.mouthA.lastEventAgeMs}
          native={chain.native}
        />
        <SurfaceTile
          name="Mouth B"
          sub="UniswapX · crate stub"
          net="—"
          count={0}
          age={0}
          native={chain.native}
          empty
        />
        <SurfaceTile
          name="Sidecar"
          sub="Morpho / Aave / oracle"
          net={formatEth(cell.surfaces.sidecar.netSimWei)}
          count={cell.surfaces.sidecar.fillOrWin}
          age={cell.surfaces.sidecar.lastEventAgeMs}
          native={chain.native}
        />
      </div>

      <Panel title="Equity · simulated vs finalized" className="mt-4">
        <p className="mb-3 text-xs text-subtle">
          Cumulative simulated P/L on generated shadow fills. Finalized series stays at zero — this
          process has never submitted a payload.
        </p>
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.4} width={48} />
              <RTooltip
                contentStyle={{
                  background: "var(--color-raised)",
                  border: "1px solid var(--color-border)",
                  fontSize: 12,
                }}
              />
              {showSim ? (
                <Area
                  type="monotone"
                  dataKey="sim"
                  name="simulated"
                  stroke="var(--color-accent)"
                  fill="var(--color-accent)"
                  fillOpacity={0.12}
                  strokeWidth={1.6}
                  isAnimationActive={false}
                />
              ) : null}
              {showFinal ? (
                <Area
                  type="monotone"
                  dataKey="finalized"
                  name="finalized"
                  stroke="var(--color-muted)"
                  fill="transparent"
                  strokeDasharray="4 4"
                  strokeWidth={1.4}
                  isAnimationActive={false}
                />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Head" value={formatCompact(cell.health.headNumber)} hint={shortHash(cell.health.headHash)} />
        <Stat label="Head lag" value={`${cell.health.headLagMs}ms`} hint="pinned, never latest" />
        <Stat label="Sim p95" value={`${cell.health.simP95Ms}ms`} hint="in-process shadow" />
        <Stat label="Queue drops" value={cell.health.queueDrops} />
        <Stat label="RPC errors" value={cell.health.rpcErrors} hint="no provider constructed" />
      </div>

      <Panel title="Last 20 feed events" className="mt-4" action={<Link to="/tape" className="text-xs text-accent">Full tape</Link>}>
        <ul className="divide-y divide-border">
          {cell.tape.slice(0, 20).map((ev) => (
            <li key={ev.id} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="min-w-0">
                <span className="text-[11px] tracking-wide text-subtle uppercase">{ev.kind}</span>
                <span className="ml-2 text-sm text-fg">{ev.title}</span>
                <p className="truncate text-xs text-muted">{ev.detail}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-subtle tabular-nums">
                {formatAge(cell.now - ev.t)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Journal">
          {cell.journal.length === 0 ? (
            <Empty>No journal entries yet.</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {cell.journal.slice(0, 8).map((j) => (
                <li key={j.id} className="py-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[11px] tracking-wide text-subtle uppercase">{j.kind}</span>
                    <span className="font-mono text-[11px] text-subtle tabular-nums">
                      {formatAge(cell.now - j.t)}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{j.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Doctor">
          <ul className="space-y-2">
            {cell.doctor.map((d) => (
              <li key={d.name} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm">{d.name}</div>
                  <p className="text-xs text-muted">{d.detail}</p>
                </div>
                <span className={`shrink-0 text-[11px] font-medium ${d.ok ? "text-pass" : "text-warn"}`}>
                  {d.ok ? "OK" : "BLOCKED"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function SurfaceTile({
  name,
  sub,
  net,
  count,
  age,
  native,
  empty,
}: {
  name: string;
  sub: string;
  net: string;
  count: number;
  age: number;
  native: string;
  empty?: boolean;
}) {
  return (
    <section className="rounded-lg bg-surface p-4 shadow-[var(--shadow-border)]">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{name}</h2>
        <span className="text-[11px] text-subtle uppercase">Demo</span>
      </div>
      <p className="text-xs text-muted">{sub}</p>
      {empty ? (
        <div className="mt-3">
          <Empty>Crate stub. Do not show fake fills.</Empty>
        </div>
      ) : (
        <>
          <p className="mt-3 font-mono text-2xl tabular-nums tracking-tight">
            {net} <span className="text-sm text-muted">{native}</span>
          </p>
          <p className="mt-1 text-xs text-subtle">
            {count} shadow fills · last {formatAge(age)}
          </p>
        </>
      )}
    </section>
  );
}
