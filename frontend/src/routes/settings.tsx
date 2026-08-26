import { createFileRoute } from "@tanstack/react-router";
import { Empty, PageHeader, Panel, Stat, downloadJson } from "@/components/aqua/widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CHAINS } from "@/lib/aqua/chains";
import { useAquaStore, useCell } from "@/lib/aqua/store";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const cell = useCell();
  const theme = useAquaStore((s) => s.theme);
  const setTheme = useAquaStore((s) => s.setTheme);
  const botUrls = useAquaStore((s) => s.botUrls);
  const setBotUrl = useAquaStore((s) => s.setBotUrl);
  const demoForced = useAquaStore((s) => s.demoForced);
  if (!cell) return null;

  return (
    <div>
      <PageHeader
        title="Settings"
        lead="The browser never talks to the bot. Same-origin server routes only — here, the cell is in-process. Theme is light/dark, not a third palette."
      />

      <Panel title="Theme">
        <div className="flex items-center gap-3">
          <Switch
            checked={theme === "light"}
            onCheckedChange={(on) => setTheme(on ? "light" : "dark")}
            aria-label="Light theme"
          />
          <span className="text-sm">{theme === "light" ? "Light" : "Dark"}</span>
        </div>
      </Panel>

      <Panel title="Demo" className="mt-4">
        <div className="flex items-center gap-3">
          <Switch checked={demoForced} disabled />
          <span className="text-sm">Demo force-on</span>
        </div>
        <p className="mt-2 text-xs text-subtle">
          Forced while no bot URL is reachable. Generated data stays behind the DEMO DATA banner.
        </p>
      </Panel>

      <Panel title="Bot URLs (CHAINS)" className="mt-4">
        <p className="mb-3 text-xs text-muted">
          Empty URLs keep this console on the in-process shadow cell. The browser still never sees
          execution keys.
        </p>
        <ul className="space-y-3">
          {CHAINS.map((c) => (
            <li key={c.id}>
              <Label htmlFor={`url-${c.id}`}>
                {c.name} · {c.id}
              </Label>
              <Input
                id={`url-${c.id}`}
                className="mt-1.5"
                placeholder="http://127.0.0.1 — unused in v1.0 shadow"
                value={botUrls[c.id] ?? ""}
                onChange={(e) => setBotUrl(c.id, e.target.value)}
              />
              <p className="mt-1 text-xs text-subtle">Explorer {c.explorer}</p>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="doctor" className="mt-4">
        <ul className="divide-y divide-border">
          {cell.doctor.map((d) => (
            <li key={d.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:justify-between">
              <div>
                <div className="text-sm">{d.name}</div>
                <p className="text-xs text-muted">{d.detail}</p>
              </div>
              <span className={`text-xs font-medium ${d.ok ? "text-pass" : "text-warn"}`}>
                {d.ok ? "OK" : "NOT IMPLEMENTED"}
              </span>
            </li>
          ))}
        </ul>
        <Empty>
          No network request and no signing was performed. A failing check is a blocker for live —
          not for this shadow console.
        </Empty>
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Cell" value={String(cell.chainId)} />
        <Stat label="Mode" value="simulation" />
      </div>

      <Panel title="Export" className="mt-4">
        <p className="mb-3 text-xs text-muted">
          Snapshot of this shadow cell for an operator notebook. Bigints serialize as decimal strings.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            downloadJson(`aqua-cell-${cell.chainId}.json`, {
              chainId: cell.chainId,
              mode: cell.mode,
              envelope: cell.envelope,
              funnelLive: cell.funnelLive,
              qualification: cell.qualification,
              optimizer: cell.optimizer,
              journal: cell.journal,
              doctor: cell.doctor,
              tape: cell.tape.slice(0, 80),
            })
          }
        >
          Download cell snapshot
        </Button>
      </Panel>
    </div>
  );
}
