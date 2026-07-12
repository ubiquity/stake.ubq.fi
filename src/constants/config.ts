/**
 * RPC endpoint resolution for blockchain calls.
 * - local-node mode always talks to the raw Anvil URL without a chain suffix.
 * - Development and Deno Deploy preview links default to https://rpc.ubq.fi.
 * - Production defaults to the relative /rpc proxy and can fall back to public RPC.
 */
export const DEFAULT_MAINNET_RPC_URL = "https://rpc.ubq.fi";
export const LOCAL_NODE_RPC_URL = "http://localhost:8545";
export const PRODUCTION_RPC_PATH = "/rpc";

export type RpcResolution = {
  rpcUrl: string;
  fallbackRpcUrls: string[];
  warnings: string[];
};

type RpcResolutionInput = {
  envRpcUrl?: string;
  hostname?: string;
  mode: string;
  origin?: string;
  warn?: (message: string) => void;
};

export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

export function isValidRpcUrl(value: string, origin = "http://localhost"): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  if (!trimmed.startsWith("/") && !/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed, origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getChainRpcUrl(rpcUrl: string, chainId: number, localNode = isLocalNode): string {
  const normalized = rpcUrl.replace(/\/+$/, "");
  return localNode ? normalized : `${normalized}/${chainId}`;
}

export function resolveRpcConfig(input: RpcResolutionInput): RpcResolution {
  const warnings: string[] = [];
  const mode = input.mode;
  const hostname = input.hostname ?? "";
  const origin = input.origin ?? "http://localhost";
  const envRpcUrl = input.envRpcUrl?.trim();
  const localNode = mode === "local-node";
  const isDevLike = mode === "development" || mode === "dev" || isDenoDeployHost(hostname);
  const fallbackRpcUrls = localNode ? [] : [DEFAULT_MAINNET_RPC_URL];

  const emitWarning = (message: string) => {
    warnings.push(message);
    input.warn?.(message);
  };

  if (envRpcUrl) {
    if (isValidRpcUrl(envRpcUrl, origin)) {
      return {
        rpcUrl: envRpcUrl.replace(/\/+$/, ""),
        fallbackRpcUrls: fallbackRpcUrls.filter((url) => url !== envRpcUrl.replace(/\/+$/, "")),
        warnings,
      };
    }

    emitWarning(`Ignoring invalid VITE_RPC_URL "${envRpcUrl}". Falling back to ${localNode ? LOCAL_NODE_RPC_URL : isDevLike ? DEFAULT_MAINNET_RPC_URL : PRODUCTION_RPC_PATH}.`);
  }

  if (localNode) {
    return { rpcUrl: LOCAL_NODE_RPC_URL, fallbackRpcUrls, warnings };
  }

  if (isDevLike) {
    return { rpcUrl: DEFAULT_MAINNET_RPC_URL, fallbackRpcUrls: [], warnings };
  }

  return { rpcUrl: PRODUCTION_RPC_PATH, fallbackRpcUrls, warnings };
}

const currentLocation = globalThis.location;

export const rpcConfig = resolveRpcConfig({
  envRpcUrl: import.meta.env.VITE_RPC_URL,
  hostname: currentLocation?.hostname,
  mode: import.meta.env.MODE,
  origin: currentLocation?.origin,
  warn: (message) => console.warn(message),
});

export const RPC_URL = rpcConfig.rpcUrl;
export const RPC_FALLBACK_URLS = rpcConfig.fallbackRpcUrls;
