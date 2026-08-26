import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageHeader, Panel, downloadJson } from "@/components/aqua/widgets";
import { Input } from "@/components/ui/input";
import { explorerTx, formatAge, shortHash } from "@/lib/aqua/format";
import { useCell } from "@/lib/aqua/store";
import type { TapeEvent, TapeKind } from "@/lib/aqua/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tape")({ component: TapePage });

const KINDS: TapeKind[] = [
  "auction",
  "order",
  "head",
  "pending",
  "opp",
  "sim",
  "submit",
  "alert",
  "mouth",
  "risk",
  "journal",
];

function TapePage() {
  const cell = useCell();
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState<TapeEvent[] | null>(null);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<TapeKind[]>([]);
  if (!cell) return null;
  const source = held ?? cell.tape;
  const events = source.filter((ev) => {
    if (filters.length && !filters.includes(ev.kind)) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      ev.title.toLowerCase().includes(s) ||
      ev.detail.toLowerCase().includes(s) ||
      (ev.hash ?? "").toLowerCase().includes(s) ||
      (ev.tag ?? "").toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <PageHeader
        title="Tape"
        lead="Rendered events are capped. The engine already bounds the channel. Pause does not pause the cell."
        aside={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadJson(`aqua-tape-${cell.chainId}.json`, {
                  chainId: cell.chainId,
                  exportedAt: cell.now,
                  events: source,
                })
              }
              className="h-10 rounded-full bg-raised px-4 text-sm"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => {
                if (paused) {
                  setHeld(null);
                  setPaused(false);
                } else {
                  setHeld(cell.tape.slice());
                  setPaused(true);
                }
              }}
              className="h-10 rounded-full bg-raised px-4 text-sm"
            >
              {paused ? "Resume" : "Pause"}
            </button>
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {KINDS.map((k) => {
          const on = filters.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilters((f) => (on ? f.filter((x) => x !== k) : [...f, k]))}
              className={cn(
                "h-10 rounded-full px-3 text-xs",
                on ? "bg-accent text-accent-fg" : "bg-raised text-muted",
              )}
            >
              {k}
            </button>
          );
        })}
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search hash / tag / auction id"
        className="mb-4 max-w-md"
      />

      <Panel className="p-0 sm:p-0">
        {events.length === 0 ? (
          <div className="p-4">
            <Empty>No events match. The cell is still ticking behind pause/filter.</Empty>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.slice(0, 120).map((ev) => (
              <li key={ev.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[11px] tracking-wide text-subtle uppercase">{ev.kind}</span>
                  <span className="text-sm text-fg">{ev.title}</span>
                  <span className="ml-auto font-mono text-[11px] text-subtle tabular-nums">
                    {formatAge(cell.now - ev.t)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{ev.detail}</p>
                {ev.hash ? (
                  <a
                    className="mt-1 inline-block font-mono text-[11px] text-accent"
                    href={explorerTx(ev.chainId, ev.hash)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {shortHash(ev.hash, 6)}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
