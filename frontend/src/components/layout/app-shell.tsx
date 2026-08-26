import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, ShieldOff, Wallet } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { AquaMark } from "@/components/brand/aqua-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV } from "@/components/layout/nav";
import { CHAINS } from "@/lib/aqua/chains";
import { ARMING_GATES } from "@/lib/aqua/risk";
import { useAquaStore, useCell } from "@/lib/aqua/store";
import { formatAge, shortHash } from "@/lib/aqua/format";
import {
  connectWallet,
  EXECUTION_SIGNING_DISABLED,
  listWallets,
  startWalletDiscovery,
  subscribeWallets,
  type WalletInfo,
} from "@/lib/aqua/wallet";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const hydrate = useAquaStore((s) => s.hydrate);
  const tick = useAquaStore((s) => s.tick);
  const theme = useAquaStore((s) => s.theme);
  const setChain = useAquaStore((s) => s.setChain);
  const cell = useCell();

  useEffect(() => {
    hydrate();
    const id = window.setInterval(() => tick(), 900);
    return () => window.clearInterval(id);
  }, [hydrate, tick]);

  useEffect(() => {
    const stop = startWalletDiscovery();
    return stop;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
        return;
      }
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < CHAINS.length) setChain(CHAINS[idx].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setChain]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-dvh overflow-x-hidden bg-bg text-fg">
        <DemoBanner />
        <Header />
        <MismatchBanner />
        <KillBar />
        <div className="mx-auto flex max-w-[1440px] gap-0 lg:gap-6">
          <DesktopNav />
          <div className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-2 lg:py-6">
            <MobileNav />
            {cell ? children : <ShellSkeleton />}
          </div>
        </div>
        <Toaster
          theme={theme === "light" ? "light" : "dark"}
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-surface)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-border)",
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}

function DemoBanner() {
  return (
    <div
      role="status"
      className="bg-warn px-3 py-2 text-center text-xs font-medium tracking-wide text-accent-fg uppercase sm:text-[13px]"
    >
      Demo data — in-process shadow cell. No RPC, no signer, no broadcast.
    </div>
  );
}

function Header() {
  const chainId = useAquaStore((s) => s.chainId);
  const setChain = useAquaStore((s) => s.setChain);
  const cell = useCell();
  const unresolved = cell?.alerts.filter((a) => !a.resolved).length ?? 1;
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [armOpen, setArmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const walletAddress = useAquaStore((s) => s.walletAddress);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1440px] px-3 py-2 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-10 shrink-0 items-center justify-center rounded-sm text-fg lg:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <Link to="/" className="flex min-w-0 items-center gap-2 text-fg">
            <AquaMark className="size-8 shrink-0 text-accent" />
            <span className="text-sm font-medium tracking-tight">Aqua</span>
            <span className="hidden text-[11px] text-subtle sm:inline">v1.0</span>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setArmOpen(true)}
                  className="h-10 rounded-full bg-raised px-3 text-[11px] font-medium tracking-wide text-muted uppercase"
                >
                  <span className="sm:hidden">Sim</span>
                  <span className="hidden sm:inline">Simulation only</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Click to inspect the nine arming gates. Live POST returns 409.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="quiet"
                  size="icon"
                  className="relative size-10"
                  onClick={() => setAlertsOpen(true)}
                  aria-label={`Alerts, ${unresolved} unresolved`}
                >
                  <Bell className="size-4" />
                  {unresolved > 0 ? (
                    <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent" />
                  ) : null}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Alerts</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setWalletOpen(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-raised px-3 text-[11px] text-muted"
                >
                  <Wallet className="size-3.5" />
                  <span className="hidden md:inline">
                    {walletAddress ? shortHash(walletAddress, 4) : "No wallet"}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {EXECUTION_SIGNING_DISABLED} Keys 1–4 switch chains.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div
          className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-raised p-0.5"
          role="group"
          aria-label="Chain. Keys 1 to 4 also switch."
        >
          {CHAINS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setChain(c.id)}
              className={cn(
                "h-9 min-w-0 rounded-full px-1 text-xs font-medium",
                chainId === c.id ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
              )}
            >
              {c.short}
            </button>
          ))}
        </div>
      </div>
      <ArmingDialog open={armOpen} onOpenChange={setArmOpen} />
      <AlertsSheet open={alertsOpen} onOpenChange={setAlertsOpen} />
      <WalletDialog open={walletOpen} onOpenChange={setWalletOpen} />
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="bg-bg">
          <SheetTitle>Aqua</SheetTitle>
          <nav className="mt-4 flex flex-col gap-1 px-3 pb-8">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="rounded-md px-3 py-3 text-sm text-fg hover:bg-raised"
              >
                {item.label}
                <span className="mt-0.5 block text-xs text-subtle">{item.hint}</span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}

function KillBar() {
  const cell = useCell();
  const resetKill = useAquaStore((s) => s.resetKill);
  const tripKill = useAquaStore((s) => s.tripKill);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!cell?.killTripped) {
    return (
      <div className="mx-auto flex max-w-[1440px] items-center justify-end px-3 py-1 sm:px-5">
        <button
          type="button"
          onClick={tripKill}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-[11px] text-subtle hover:text-danger"
        >
          <ShieldOff className="size-3.5" />
          Trip kill
        </button>
      </div>
    );
  }

  return (
    <div className="bg-danger px-3 py-3 text-danger-fg">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 text-sm">
          <div className="font-medium">Kill switch tripped</div>
          <div className="text-xs opacity-90">{cell.killReason}</div>
        </div>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(resetKill(typed));
            setTyped("");
          }}
        >
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type RESET"
            className="h-10 w-36 bg-bg/20 text-fg"
            aria-label="Type RESET to re-arm"
          />
          <Button type="submit" variant="outline" className="border-fg/30 bg-bg/10">
            Reset
          </Button>
          {err ? <span className="text-xs">{err}</span> : null}
        </form>
      </div>
    </div>
  );
}

function DesktopNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      aria-label="Primary"
      className="sticky top-24 hidden h-[calc(100dvh-6rem)] w-52 shrink-0 overflow-y-auto py-6 pl-5 lg:block"
    >
      <ul className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col rounded-md px-3 py-2",
                  active ? "bg-raised text-fg" : "text-muted hover:bg-raised/60 hover:text-fg",
                )}
              >
                <span className="text-sm">{item.label}</span>
                <span className="text-[11px] text-subtle">{item.hint}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav aria-label="Sections" className="mb-4 overflow-x-auto lg:hidden">
      <ul className="flex w-max gap-1 pb-2">
        {NAV.map((item) => {
          const active = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "inline-flex h-10 items-center rounded-full px-3 text-xs font-medium",
                  active ? "bg-accent text-accent-fg" : "bg-raised text-muted",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function ArmingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const requestLive = useAquaStore((s) => s.requestLive);
  const armingError = useAquaStore((s) => s.armingError);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Arming is ugly on purpose</DialogTitle>
        <DialogDescription>
          Live mode is not a pretty toggle. A value-bearing payload must not reach a solver driver,
          reactor, relay, builder, sequencer, or raw RPC until all nine gates are true.
        </DialogDescription>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-fg">
          {ARMING_GATES.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ol>
        <Button
          variant="danger"
          className="mt-5 w-full"
          onClick={() => requestLive()}
        >
          Request live
        </Button>
        {armingError ? (
          <pre className="mt-3 overflow-x-auto rounded-md bg-raised p-3 text-xs text-danger whitespace-pre-wrap">
            {armingError}
          </pre>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AlertsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const cell = useCell();
  const alerts = cell?.alerts ?? [];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Alerts</SheetTitle>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted">No alerts.</p>
          ) : (
            <ul className="space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-md bg-raised p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{a.title}</span>
                    <Badge tone={a.severity === "danger" ? "danger" : a.severity === "warn" ? "warn" : "muted"}>
                      {a.resolved ? "resolved" : a.severity}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{a.body}</p>
                  <p className="mt-1 text-[11px] text-subtle">{formatAge((cell?.now ?? a.t) - a.t)} ago</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MismatchBanner() {
  const chainId = useAquaStore((s) => s.chainId);
  const walletChainId = useAquaStore((s) => s.walletChainId);
  const address = useAquaStore((s) => s.walletAddress);
  if (!address || walletChainId == null || walletChainId === chainId) return null;
  return (
    <div className="border-b border-border bg-warn/15 px-3 py-2 text-center text-xs text-warn">
      Wallet chain {walletChainId} ≠ console chain {chainId}. Independent on purpose — this is not
      a silent switch.
    </div>
  );
}

function WalletDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [found, setFound] = useState<WalletInfo[]>([]);
  const setWallet = useAquaStore((s) => s.setWallet);
  const wallet = useAquaStore((s) => s.wallet);
  const address = useAquaStore((s) => s.walletAddress);
  const walletChainId = useAquaStore((s) => s.walletChainId);
  const walletError = useAquaStore((s) => s.walletError);
  const chainId = useAquaStore((s) => s.chainId);

  useEffect(() => {
    if (!open) return;
    setFound(listWallets());
    return subscribeWallets(() => setFound(listWallets()));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Wallet</DialogTitle>
        <DialogDescription>{EXECUTION_SIGNING_DISABLED}</DialogDescription>
        {address ? (
          <div className="mt-4 rounded-md bg-raised p-3 text-sm">
            <div className="font-medium">{wallet?.name ?? "Connected"}</div>
            <p className="mt-1 font-mono text-xs text-muted">{address}</p>
            <p className="mt-1 text-xs text-subtle">
              Wallet chain {walletChainId ?? "—"} · console {chainId}
            </p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() =>
                setWallet({ wallet: null, address: null, walletChainId: null, error: null })
              }
            >
              Disconnect
            </Button>
          </div>
        ) : found.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            EIP-6963 found nothing. Injected discovery is idle — expected in this shadow host.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {found.map((w) => (
              <li key={w.uuid}>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={async () => {
                    const session = await connectWallet(w.uuid);
                    setWallet(session);
                  }}
                >
                  {w.name}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {walletError ? <p className="mt-3 text-xs text-danger">{walletError}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Booting shadow cell…</p>
      <div className="h-8 w-40 rounded-md bg-raised" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-lg bg-surface" />
        <div className="h-24 rounded-lg bg-surface" />
        <div className="h-24 rounded-lg bg-surface" />
      </div>
      <div className="h-64 rounded-lg bg-surface" />
    </div>
  );
}
