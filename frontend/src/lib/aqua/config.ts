export const FORBIDDEN_NAMES = [
  "MIN_NET_PROFIT_ETH",
  "MAX_BASE_FEE_GWEI",
  "MAX_DRAWDOWN_ETH",
  "BUILDER_SHARE_BPS",
] as const;

export type ConfigError =
  | { kind: "ForbiddenNamePresent"; key: string }
  | { kind: "Missing"; key: string }
  | { kind: "Invalid"; key: string; value: string }
  | { kind: "LiveAcknowledgementMissing" }
  | { kind: "LiveBroadcastDisabled" }
  | { kind: "LiveRegistryMissing" };

export interface BootConfig {
  chainId: number;
  rpcHttpUrl: string;
  mode: "simulation" | "live";
  broadcastEnabled: boolean;
  minNetProfitWei: bigint;
  protocolRegistryPath: string | null;
}

export function formatConfigError(err: ConfigError): string {
  switch (err.kind) {
    case "ForbiddenNamePresent":
      return `forbidden environment name present: ${err.key}`;
    case "Missing":
      return `required environment name missing: ${err.key}`;
    case "Invalid":
      return `invalid ${err.key}: ${err.value}`;
    case "LiveAcknowledgementMissing":
      return "live mode requires I_UNDERSTAND_LIVE_RISK=yes";
    case "LiveBroadcastDisabled":
      return "live mode requires BROADCAST_ENABLED=true";
    case "LiveRegistryMissing":
      return "live mode requires PROTOCOL_REGISTRY_PATH";
  }
}

export function parseBootConfig(values: Record<string, string>): BootConfig | ConfigError {
  for (const name of FORBIDDEN_NAMES) {
    if (Object.prototype.hasOwnProperty.call(values, name) && values[name] !== undefined) {
      return { kind: "ForbiddenNamePresent", key: name };
    }
  }
  const chainRaw = values.CHAIN_ID;
  if (!chainRaw) return { kind: "Missing", key: "CHAIN_ID" };
  const chainId = Number(chainRaw);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    return { kind: "Invalid", key: "CHAIN_ID", value: chainRaw };
  }
  const rpcHttpUrl = values.ETH_HTTP_URL;
  if (!rpcHttpUrl) return { kind: "Missing", key: "ETH_HTTP_URL" };
  if (!(rpcHttpUrl.startsWith("https://") || rpcHttpUrl.startsWith("http://"))) {
    return { kind: "Invalid", key: "ETH_HTTP_URL", value: rpcHttpUrl };
  }
  const live = values.LIVE_EXECUTION === "true";
  const broadcastEnabled = values.BROADCAST_ENABLED === "true";
  const minRaw = values.MIN_NET_PROFIT_WEI;
  if (!minRaw) return { kind: "Missing", key: "MIN_NET_PROFIT_WEI" };
  if (!/^\d+$/.test(minRaw)) {
    return { kind: "Invalid", key: "MIN_NET_PROFIT_WEI", value: minRaw };
  }
  const protocolRegistryPath = values.PROTOCOL_REGISTRY_PATH || null;
  if (live && values.I_UNDERSTAND_LIVE_RISK !== "yes") {
    return { kind: "LiveAcknowledgementMissing" };
  }
  if (live && !broadcastEnabled) return { kind: "LiveBroadcastDisabled" };
  if (live && !protocolRegistryPath) return { kind: "LiveRegistryMissing" };
  return {
    chainId,
    rpcHttpUrl,
    mode: live ? "live" : "simulation",
    broadcastEnabled,
    minNetProfitWei: BigInt(minRaw),
    protocolRegistryPath,
  };
}

/** In-process v1.0 cell: simulation, no RPC, no broadcast. */
export function demoBootValues(chainId: number): Record<string, string> {
  return {
    CHAIN_ID: String(chainId),
    ETH_HTTP_URL: "http://127.0.0.1:0/demo-no-rpc",
    MIN_NET_PROFIT_WEI: "1",
    LIVE_EXECUTION: "false",
    BROADCAST_ENABLED: "false",
  };
}
