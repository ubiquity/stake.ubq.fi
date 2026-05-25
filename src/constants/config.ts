export const DEFAULT_MAINNET_RPC_FALLBACKS = ["https://rpc.ubq.fi"] as const;
const DEFAULT_LOCAL_RPC_URL = "http://localhost:8545";

type AppMode = "dev" | "prod" | "local-node" | string;

export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

const hasHttpProtocol = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const isValidRpcUrl = (value: string): boolean => {
  if (!value) return false;
  if (value.startsWith("/")) return true;
  return hasHttpProtocol(value);
};

export const getDefaultRpcUrl = (mode: AppMode, origin: string, hostname: string): string => {
  if (mode === "local-node") return DEFAULT_LOCAL_RPC_URL;
  if (mode === "dev" || isDenoDeployHost(hostname)) return DEFAULT_MAINNET_RPC_FALLBACKS[0];
  return `${origin}/rpc`;
};

export const resolveRpcConfig = (params: {
  mode: AppMode;
  hostname: string;
  origin: string;
  envRpcUrl?: string;
}): { rpcUrl: string; fallbackRpcUrls: string[] } => {
  const { mode, hostname, origin, envRpcUrl } = params;
  const defaultRpcUrl = getDefaultRpcUrl(mode, origin, hostname);
  const fallbackRpcUrls = mode === "local-node" ? [DEFAULT_LOCAL_RPC_URL] : [...DEFAULT_MAINNET_RPC_FALLBACKS];

  if (!envRpcUrl) {
    return { rpcUrl: defaultRpcUrl, fallbackRpcUrls };
  }

  if (!isValidRpcUrl(envRpcUrl)) {
    console.warn(`[rpc-config] Invalid VITE_RPC_URL "${envRpcUrl}". Falling back to "${defaultRpcUrl}".`);
    return { rpcUrl: defaultRpcUrl, fallbackRpcUrls };
  }

  return { rpcUrl: envRpcUrl, fallbackRpcUrls };
};

const currentLocation = globalThis.location;
const resolved = resolveRpcConfig({
  mode: import.meta.env.MODE,
  envRpcUrl: import.meta.env.VITE_RPC_URL,
  hostname: currentLocation?.hostname ?? "",
  origin: currentLocation?.origin ?? "",
});

export const RPC_URL = resolved.rpcUrl;
export const RPC_FALLBACK_URLS = resolved.fallbackRpcUrls;
