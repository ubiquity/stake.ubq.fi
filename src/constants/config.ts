/**
 * RPC endpoint for blockchain calls.
 * - In local-node mode, it uses a raw local Anvil URL with no chain suffix.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi.
 * - In production, it uses /rpc for performance.
 */
export const MAINNET_RPC_FALLBACK_URL = "https://rpc.ubq.fi";
export const LOCAL_NODE_RPC_URL = "http://localhost:8545";
export const PRODUCTION_RPC_PATH = "/rpc";

type LocationLike = Pick<Location, "hostname" | "origin">;
type WarningLogger = (message: string) => void;

export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

export function isValidRpcUrl(rpcUrl: string): boolean {
  try {
    const parsed = new URL(rpcUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return rpcUrl.startsWith("/");
  }
}

export function normalizeRpcUrl(rpcUrl: string): string {
  if (rpcUrl === "/") return rpcUrl;
  return rpcUrl.replace(/\/+$/, "");
}

export function getDefaultRpcUrl(mode: string, location?: LocationLike): string {
  if (mode === "local-node") return LOCAL_NODE_RPC_URL;
  if (mode === "dev" || isDenoDeployHost(location?.hostname ?? "")) return MAINNET_RPC_FALLBACK_URL;
  return location?.origin ? `${location.origin}${PRODUCTION_RPC_PATH}` : PRODUCTION_RPC_PATH;
}

export function resolveRpcUrl({
  envRpcUrl,
  location,
  mode,
  warn = console.warn,
}: {
  envRpcUrl?: string;
  location?: LocationLike;
  mode: string;
  warn?: WarningLogger;
}): string {
  if (envRpcUrl) {
    if (isValidRpcUrl(envRpcUrl)) return normalizeRpcUrl(envRpcUrl);
    const fallbackUrl = getDefaultRpcUrl(mode, location);
    warn(`Invalid VITE_RPC_URL "${envRpcUrl}". Falling back to ${fallbackUrl}.`);
    return fallbackUrl;
  }

  return getDefaultRpcUrl(mode, location);
}

export function getRpcFallbackUrls(primaryRpcUrl: string, mode: string): string[] {
  if (mode === "local-node") return [];
  const normalizedPrimary = normalizeRpcUrl(primaryRpcUrl);
  return normalizedPrimary === MAINNET_RPC_FALLBACK_URL ? [] : [MAINNET_RPC_FALLBACK_URL];
}

const currentLocation = globalThis.location;
const currentMode = import.meta.env.MODE ?? "prod";

export const RPC_URL = resolveRpcUrl({
  envRpcUrl: import.meta.env.VITE_RPC_URL,
  location: currentLocation,
  mode: currentMode,
});

export const RPC_FALLBACK_URLS = getRpcFallbackUrls(RPC_URL, currentMode);
