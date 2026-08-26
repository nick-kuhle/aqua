import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Empty, PageHeader, Panel } from "@/components/aqua/widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { chainOf } from "@/lib/aqua/chains";
import { rowPolicy } from "@/lib/aqua/eligibility";
import { formatEth, formatGwei, formatWei } from "@/lib/aqua/format";
import { RISK_COPY } from "@/lib/aqua/risk";
import { useAquaStore, useCell } from "@/lib/aqua/store";
import { STRATEGIES, STRATEGY_LABEL, type StrategyId } from "@/lib/aqua/types";

export const Route = createFileRoute("/risk")({ component: RiskPage });

function RiskPage() {
  const cell = useCell();
  const patchRisk = useAquaStore((s) => s.patchRisk);
  const toggleStrategy = useAquaStore((s) => s.toggleStrategy);
  const [err, setErr] = useState<string | null>(null);
  if (!cell) return null;
  const env = cell.envelope;
  const chain = chainOf(cell.chainId);

  function apply(partial: Parameters<typeof patchRisk>[0]) {
    setErr(patchRisk(partial));
  }

  return (
    <div>
      <PageHeader
        title="Risk"
        lead="Runtime controls may narrow the boot envelope, never widen it. Names are wei- or bps-denominated. Forbidden human units refuse boot."
      />

      {err ? (
        <div className="mb-4 rounded-md bg-danger/15 px-3 py-2 text-sm text-danger">400 — {err}</div>
      ) : null}

      <Panel title="Envelope">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WeiField
            label="MIN_NET_PROFIT_WEI"
            wei={env.minNetProfitWei}
            native={chain.native}
            onCommit={(v) => apply({ minNetProfitWei: v })}
          />
          <WeiField
            label="MAX_POSITION_WEI"
            wei={env.maxPositionWei}
            native={chain.native}
            onCommit={(v) => apply({ maxPositionWei: v })}
          />
          <WeiField
            label="MAX_BASE_FEE_WEI"
            wei={env.maxBaseFeeWei}
            native="gwei"
            preview={formatGwei(env.maxBaseFeeWei)}
            onCommit={(v) => apply({ maxBaseFeeWei: v })}
          />
          <WeiField
            label="MAX_DRAWDOWN_WEI"
            wei={env.maxDrawdownWei}
            native={chain.native}
            hint="0 = off"
            onCommit={(v) => apply({ maxDrawdownWei: v })}
          />
        </div>

        <div className="mt-5">
          <Label>MAX_INFLIGHT · {env.maxInflight}</Label>
          <Slider
            className="mt-3"
            min={1}
            max={32}
            step={1}
            value={[env.maxInflight]}
            onValueChange={([v]) => apply({ maxInflight: v })}
          />
          <p className="mt-2 text-xs text-subtle">
            Runtime may only narrow the boot cap of 32. One in-flight slot per exact payload.
          </p>
        </div>

        <div className="mt-5">
          <Label>BRIBE_BPS · {env.bribeBps}</Label>
          <Slider
            className="mt-3"
            min={0}
            max={10000}
            step={50}
            value={[env.bribeBps]}
            onValueChange={([v]) => apply({ bribeBps: v })}
          />
          {chain.id === 1 && env.bribeBps < 5000 ? (
            <p className="mt-2 text-xs text-warn">
              Below 5000 on L1. Do not drop without understanding inclusion. CoW ignores bribe.
            </p>
          ) : (
            <p className="mt-2 text-xs text-subtle">
              Default 9000 on ETH bundles, 0 on sequencer / CoW. Share of realised profit to coinbase.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={env.tokenValuation}
              onCheckedChange={(on) => apply({ tokenValuation: on })}
            />
            TOKEN_VALUATION
          </label>
          <p className="text-xs text-subtle">
            Opt-in native pricing of token profit. Off: liquidations net zero.
          </p>
        </div>
        {env.tokenValuation ? (
          <div className="mt-5">
            <Label>VALUATION_HAIRCUT_BPS · {env.valuationHaircutBps}</Label>
            <Slider
              className="mt-3"
              min={0}
              max={5000}
              step={25}
              value={[env.valuationHaircutBps]}
              onValueChange={([v]) => apply({ valuationHaircutBps: v })}
            />
            <p className="mt-2 text-xs text-subtle">
              Applied to certified token profit before MIN_NET_PROFIT_WEI.
            </p>
          </div>
        ) : null}
      </Panel>

      <Panel title="Strategy rows (runtime can only turn off)" className="mt-4">
        <ul className="divide-y divide-border">
          {STRATEGIES.map((row) => (
            <StrategyToggle
              key={row}
              row={row}
              on={cell.enabled[row]}
              chainId={cell.chainId}
              onToggle={(v) => setErr(toggleStrategy(row, v))}
            />
          ))}
        </ul>
      </Panel>

      <Panel title="Boot defaults (demoted)" className="mt-4">
        <pre className="overflow-x-auto rounded-md bg-raised p-3 text-xs text-muted">
{`CHAIN_ID=${cell.chainId}
LIVE_EXECUTION=false
BROADCAST_ENABLED=false
MIN_NET_PROFIT_WEI=${env.minNetProfitWei.toString()}
MAX_POSITION_WEI=${env.maxPositionWei.toString()}
# Forbidden: MIN_NET_PROFIT_ETH MAX_BASE_FEE_GWEI MAX_DRAWDOWN_ETH BUILDER_SHARE_BPS`}
        </pre>
      </Panel>

      <Panel title="Kill reset" className="mt-4">
        <p className="text-sm text-muted">
          Typed confirm lives in the header when the switch is tripped. Restarting the process is
          not a re-arm.
        </p>
        <Empty>
          First rejection reasons the kernel persists: {Object.keys(RISK_COPY).join(", ")}.
        </Empty>
      </Panel>
    </div>
  );
}

function WeiField({
  label,
  wei,
  native,
  preview,
  hint,
  onCommit,
}: {
  label: string;
  wei: bigint;
  native: string;
  preview?: string;
  hint?: string;
  onCommit: (v: bigint) => void;
}) {
  const [raw, setRaw] = useState(formatWei(wei));
  useEffect(() => {
    setRaw(formatWei(wei));
  }, [wei]);
  return (
    <div>
      <Label htmlFor={label}>{label}</Label>
      <Input
        id={label}
        className="mt-1.5 font-mono"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          if (!/^\d+$/.test(raw.trim())) return;
          onCommit(BigInt(raw.trim()));
        }}
      />
      <p className="mt-1 text-xs text-subtle">
        {preview ?? `${formatEth(wei)} ${native}`} {hint ? `· ${hint}` : ""}
      </p>
    </div>
  );
}

function StrategyToggle({
  row,
  on,
  chainId,
  onToggle,
}: {
  row: StrategyId;
  on: boolean;
  chainId: number;
  onToggle: (v: boolean) => void;
}) {
  const p = rowPolicy(row, chainOf(chainId));
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm text-fg">{STRATEGY_LABEL[row]}</div>
        <p className="max-w-xl text-xs text-muted">{p.reason}</p>
      </div>
      <Switch checked={on} disabled={!p.constructed && !on} onCheckedChange={onToggle} />
    </li>
  );
}
