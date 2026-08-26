import type { ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { QualVerdict } from "@/lib/aqua/types";

export function PageHeader({
  title,
  lead,
  aside,
}: {
  title: string;
  lead?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-medium tracking-tight text-fg sm:text-2xl">{title}</h1>
        {lead ? <p className="mt-1 max-w-2xl text-sm text-muted">{lead}</p> : null}
      </div>
      {aside}
    </header>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg bg-surface p-4 shadow-[var(--shadow-border)] sm:p-5",
        className,
      )}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-fg">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-md bg-raised p-3 sm:p-4">
      <div className="text-[11px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 font-mono text-lg tabular-nums text-fg">{value}</div>
      {hint ? <div className="mt-1 text-xs text-subtle">{hint}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-raised px-3 py-3 text-sm text-muted">{children}</p>
  );
}

export function VerdictChip({ verdict }: { verdict: QualVerdict }) {
  const tone =
    verdict === "PASS"
      ? "pass"
      : verdict === "FAIL"
        ? "danger"
        : verdict === "INSUFFICIENT"
          ? "warn"
          : "muted";
  const label =
    verdict === "INSUFFICIENT"
      ? "INSUFFICIENT SAMPLE"
      : verdict;
  return <Badge tone={tone}>{label}</Badge>;
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono tabular-nums", className)}>{children}</span>;
}

export async function copyText(value: string, ok = "Copied"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(ok);
    return true;
  } catch {
    toast.error("Clipboard blocked");
    return false;
  }
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, jsonReplacer, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function jsonReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-7 w-28 text-accent", className)} aria-hidden="true">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.6" points={pts} />
    </svg>
  );
}
