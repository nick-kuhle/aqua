import { chainOf } from "./chains.ts";

export const WEI = 10n ** 18n;
export const GWEI = 10n ** 9n;

export function parseWei(raw: string): bigint | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

export function formatWei(wei: bigint): string {
  return wei.toString();
}

export function formatEth(wei: bigint, digits = 4): string {
  const neg = wei < 0n;
  const abs = neg ? -wei : wei;
  const whole = abs / WEI;
  const frac = abs % WEI;
  const fracStr = frac.toString().padStart(18, "0").slice(0, digits);
  return `${neg ? "−" : ""}${whole.toString()}.${fracStr}`;
}

export function formatEthUnit(wei: bigint, native = "ETH", digits = 4): string {
  return `${formatEth(wei, digits)} ${native}`;
}

export function weiFromEthString(eth: string): bigint | null {
  const t = eth.trim();
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
  const [w, f = ""] = t.split(".");
  const frac = (f + "000000000000000000").slice(0, 18);
  return BigInt(w) * WEI + BigInt(frac);
}

export function formatGwei(wei: bigint, digits = 2): string {
  const g = Number(wei) / 1e9;
  return `${g.toFixed(digits)} gwei`;
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function formatAge(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}

export function shortHash(hash: string, size = 4): string {
  if (hash.length < 12) return hash;
  return `${hash.slice(0, 2 + size)}…${hash.slice(-size)}`;
}

export function explorerTx(chainId: number, hash: string): string {
  return `${chainOf(chainId).explorer}/tx/${hash}`;
}

export function explorerAddress(chainId: number, addr: string): string {
  return `${chainOf(chainId).explorer}/address/${addr}`;
}

export function ratioLabel(v1: bigint, naive: bigint): number {
  if (naive === 0n) return v1 === 0n ? 1 : 0;
  return Number((v1 * 1000n) / naive) / 1000;
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexFromRng(rng: () => number, bytes = 32): string {
  let out = "0x";
  for (let i = 0; i < bytes; i++) {
    out += Math.floor(rng() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

export function addressFromRng(rng: () => number): string {
  return hexFromRng(rng, 20);
}
