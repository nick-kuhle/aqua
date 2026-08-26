/** EIP-6963 discovery. Display and chain-mismatch only — never signs, never sends. */

export interface WalletInfo {
  uuid: string;
  name: string;
  rdns: string;
  icon: string | null;
}

export interface WalletSession {
  wallet: WalletInfo | null;
  address: string | null;
  walletChainId: number | null;
  error: string | null;
}

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

type Detail = {
  info: { uuid: string; name: string; rdns: string; icon?: string };
  provider: Eip1193;
};

const registry = new Map<string, Detail>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function onAnnounce(event: Event) {
  const detail = (event as CustomEvent<Detail>).detail;
  if (!detail?.info?.uuid || !detail.provider) return;
  registry.set(detail.info.uuid, detail);
  emit();
}

export function startWalletDiscovery() {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
}

export function listWallets(): WalletInfo[] {
  return [...registry.values()].map((d) => ({
    uuid: d.info.uuid,
    name: d.info.name,
    rdns: d.info.rdns,
    icon: d.info.icon ?? null,
  }));
}

export function subscribeWallets(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function parseChainId(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = raw.startsWith("0x") ? Number.parseInt(raw, 16) : Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function connectWallet(uuid: string): Promise<WalletSession> {
  const detail = registry.get(uuid);
  if (!detail) {
    return { wallet: null, address: null, walletChainId: null, error: "Provider disappeared." };
  }
  try {
    const accounts = (await detail.provider.request({ method: "eth_requestAccounts" })) as string[];
    const chainRaw = await detail.provider.request({ method: "eth_chainId" });
    const address = accounts?.[0] ?? null;
    return {
      wallet: {
        uuid: detail.info.uuid,
        name: detail.info.name,
        rdns: detail.info.rdns,
        icon: detail.info.icon ?? null,
      },
      address,
      walletChainId: parseChainId(chainRaw),
      error: address ? null : "No account returned.",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet request rejected.";
    return { wallet: null, address: null, walletChainId: null, error: message };
  }
}

export const EXECUTION_SIGNING_DISABLED =
  "This console does not sign execution payloads. Wallet is for identity and chain-mismatch only.";
