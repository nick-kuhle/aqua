import { create } from "zustand";
import { chainOf } from "./chains.ts";
import {
  armingRejectedBody,
  bootstrapCell,
  resetKill,
  stepCell,
  tripKill,
  type ChainCell,
} from "./engine.ts";
import { mulberry32 } from "./format.ts";
import type { RiskEnvelope, StrategyId } from "./types.ts";
import type { WalletInfo } from "./wallet.ts";

type Theme = "dark" | "light";

interface Prefs {
  chainId: number;
  theme: Theme;
  demoForced: boolean;
  funnelSource: "live" | "replay";
  equityShowSim: boolean;
  equityShowFinal: boolean;
  botUrls: Record<number, string>;
}

interface AquaState extends Prefs {
  hydrated: boolean;
  prefsLoaded: boolean;
  rev: number;
  cells: Record<number, ChainCell>;
  armingError: string | null;
  wallet: WalletInfo | null;
  walletAddress: string | null;
  walletChainId: number | null;
  walletError: string | null;
  hydrate: () => void;
  tick: () => void;
  setChain: (id: number) => void;
  setTheme: (theme: Theme) => void;
  setFunnelSource: (s: "live" | "replay") => void;
  setEquitySeries: (sim: boolean, final: boolean) => void;
  setSoakHours: (hours: number) => void;
  patchRisk: (patch: Partial<RiskEnvelope>) => string | null;
  toggleStrategy: (row: StrategyId, on: boolean) => string | null;
  requestLive: () => string;
  tripKill: () => void;
  resetKill: (typed: string) => string | null;
  setBotUrl: (chainId: number, url: string) => void;
  setCowWeekly: (value: string) => void;
  setWallet: (session: {
    wallet: WalletInfo | null;
    address: string | null;
    walletChainId: number | null;
    error: string | null;
  }) => void;
}

const DEFAULT_PREFS: Prefs = {
  chainId: 1,
  theme: "dark",
  demoForced: true,
  funnelSource: "live",
  equityShowSim: true,
  equityShowFinal: false,
  botUrls: { 1: "", 56: "", 8453: "", 42161: "" },
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem("aqua:prefs");
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(s: Prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    "aqua:prefs",
    JSON.stringify({
      chainId: s.chainId,
      theme: s.theme,
      demoForced: true,
      funnelSource: s.funnelSource,
      equityShowSim: s.equityShowSim,
      equityShowFinal: s.equityShowFinal,
      botUrls: s.botUrls,
    }),
  );
}

const BOOT_NOW = Date.UTC(2026, 7, 25, 17, 0, 0);

export const useAquaStore = create<AquaState>((set, get) => ({
  ...DEFAULT_PREFS,
  hydrated: true,
  prefsLoaded: false,
  rev: 0,
  cells: { 1: bootstrapCell(1, BOOT_NOW) },
  armingError: null,
  wallet: null,
  walletAddress: null,
  walletChainId: null,
  walletError: null,

  hydrate: () => {
    if (get().prefsLoaded) return;
    const prefs = loadPrefs();
    const cells = { ...get().cells };
    if (!cells[prefs.chainId]) {
      cells[prefs.chainId] = bootstrapCell(prefs.chainId, BOOT_NOW);
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", prefs.theme === "light");
    }
    set({ ...prefs, cells, demoForced: true, prefsLoaded: true, rev: get().rev + 1 });
  },

  tick: () => {
    const { chainId, cells, hydrated, rev } = get();
    if (!hydrated) return;
    const cell = cells[chainId];
    if (!cell) return;
    cell.now += 900;
    stepCell(cell, mulberry32((cell.tick + 1) * 7919 + chainId));
    set({ cells: { ...cells, [chainId]: cell }, rev: rev + 1 });
  },

  setChain: (id) => {
    const s = get();
    const cells = { ...s.cells };
    if (!cells[id]) cells[id] = bootstrapCell(id, BOOT_NOW);
    savePrefs({ ...s, chainId: id });
    set({ chainId: id, cells, armingError: null, rev: s.rev + 1 });
  },

  setTheme: (theme) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", theme === "light");
    }
    const s = get();
    savePrefs({ ...s, theme });
    set({ theme });
  },

  setFunnelSource: (funnelSource) => {
    const s = get();
    savePrefs({ ...s, funnelSource });
    set({ funnelSource });
  },

  setEquitySeries: (equityShowSim, equityShowFinal) => {
    const s = get();
    savePrefs({ ...s, equityShowSim, equityShowFinal });
    set({ equityShowSim, equityShowFinal });
  },

  setSoakHours: (hours) => {
    const h = Math.min(8760, Math.max(1, Math.round(hours)));
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return;
    cell.soakHours = h;
    set({ cells: { ...cells }, rev: get().rev + 1 });
  },

  patchRisk: (patch) => {
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return "cell missing";
    const next = { ...cell.envelope, ...patch };
    if (next.minNetProfitWei < 0n) return "minNetProfitWei cannot be negative";
    if (next.maxInflight > 32) return "runtime can only narrow MAX_INFLIGHT";
    if (next.maxInflight < 1) return "maxInflight must be ≥ 1";
    if (next.bribeBps < 0 || next.bribeBps > 10_000) return "bribeBps must be 0–10000";
    if (next.valuationHaircutBps < 0 || next.valuationHaircutBps > 10_000) {
      return "haircut bps out of range";
    }
    if (chainOf(chainId).sequencerOnly && next.bribeBps !== 0) {
      return "bribeBps must be 0 on sequencer chains";
    }
    cell.envelope = next;
    set({ cells: { ...cells }, rev: get().rev + 1 });
    return null;
  },

  toggleStrategy: (row, on) => {
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return "cell missing";
    if (on && !cell.enabled[row]) {
      return "runtime can only turn off a boot-on row; it cannot enable a boot-off row";
    }
    cell.enabled[row] = on;
    set({ cells: { ...cells }, rev: get().rev + 1 });
    return null;
  },

  requestLive: () => {
    const body = armingRejectedBody();
    set({ armingError: body });
    return body;
  },

  tripKill: () => {
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return;
    tripKill(cell, cell.now, "Operator trip from console. No payload was in flight.");
    set({ cells: { ...cells }, rev: get().rev + 1 });
  },

  resetKill: (typed) => {
    if (typed !== "RESET") return "Type RESET to confirm.";
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return "cell missing";
    resetKill(cell, cell.now);
    set({ cells: { ...cells }, rev: get().rev + 1 });
    return null;
  },

  setBotUrl: (chainId, url) => {
    const s = get();
    const botUrls = { ...s.botUrls, [chainId]: url };
    savePrefs({ ...s, botUrls });
    set({ botUrls });
  },

  setCowWeekly: (value) => {
    const { chainId, cells } = get();
    const cell = cells[chainId];
    if (!cell) return;
    cell.cowWeekly = value;
    set({ cells: { ...cells }, rev: get().rev + 1 });
  },

  setWallet: (session) => {
    set({
      wallet: session.wallet,
      walletAddress: session.address,
      walletChainId: session.walletChainId,
      walletError: session.error,
    });
  },
}));

export function useCell(): ChainCell | null {
  const hydrated = useAquaStore((s) => s.hydrated);
  const chainId = useAquaStore((s) => s.chainId);
  const rev = useAquaStore((s) => s.rev);
  const cell = useAquaStore((s) => s.cells[chainId] ?? null);
  void rev;
  if (!hydrated) return null;
  return cell;
}
