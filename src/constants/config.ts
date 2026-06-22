/**
 * RPC endpoint for blockchain calls.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

const DEFAULT_PUBLIC_RPC_URL = "https://rpc.ubq.fi";
const LOCAL_NODE_RPC_URL = "http://localhost:8545";

export type RpcMode = "dev" | "local-node" | "prod";

export interface RpcConfig {
  mode: RpcMode;
  url: string;
  fallbacks: string[];
  shouldAppendChainId: boolean;
  warnings: string[];
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function isHttpUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function warnOnce(message: string): void {
  if (typeof console !== "undefined") {
    console.warn(message);
  }
}

function currentHostname(): string {
  return typeof globalThis.location !== "undefined" ? globalThis.location.hostname : "";
}

function currentOrigin(): string {
  return typeof globalThis.location !== "undefined" ? globalThis.location.origin : "";
}

export function resolveRpcConfig(
  mode = import.meta.env.MODE,
  envRpcUrl = import.meta.env.VITE_RPC_URL,
  hostname = currentHostname(),
  origin = currentOrigin()
): RpcConfig {
  const normalizedEnvRpc = normalizeUrl(envRpcUrl);
  const warnings: string[] = [];
  const rpcMode: RpcMode = mode === "local-node" ? "local-node" : mode === "prod" ? "prod" : "dev";

  if (rpcMode === "local-node") {
    const url = normalizedEnvRpc || LOCAL_NODE_RPC_URL;
    if (!isHttpUrl(url)) {
      warnings.push(`Invalid local-node VITE_RPC_URL "${url}". Falling back to ${LOCAL_NODE_RPC_URL}.`);
      return {
        mode: rpcMode,
        url: LOCAL_NODE_RPC_URL,
        fallbacks: [],
        shouldAppendChainId: false,
        warnings,
      };
    }
    return {
      mode: rpcMode,
      url,
      fallbacks: [],
      shouldAppendChainId: false,
      warnings,
    };
  }

  if (normalizedEnvRpc) {
    if (isHttpUrl(normalizedEnvRpc)) {
      return {
        mode: rpcMode,
        url: normalizedEnvRpc,
        fallbacks: normalizedEnvRpc === DEFAULT_PUBLIC_RPC_URL ? [] : [DEFAULT_PUBLIC_RPC_URL],
        shouldAppendChainId: true,
        warnings,
      };
    }
    warnings.push(`Invalid VITE_RPC_URL "${normalizedEnvRpc}". Falling back to ${DEFAULT_PUBLIC_RPC_URL}.`);
    return {
      mode: rpcMode,
      url: DEFAULT_PUBLIC_RPC_URL,
      fallbacks: [],
      shouldAppendChainId: true,
      warnings,
    };
  }

  const url = isDenoDeployHost(hostname) ? DEFAULT_PUBLIC_RPC_URL : `${origin}/rpc`;
  return {
    mode: rpcMode,
    url,
    fallbacks: url === DEFAULT_PUBLIC_RPC_URL ? [] : [DEFAULT_PUBLIC_RPC_URL],
    shouldAppendChainId: true,
    warnings,
  };
}

export const RPC_CONFIG = resolveRpcConfig();

for (const warning of RPC_CONFIG.warnings) {
  warnOnce(warning);
}

export const RPC_URL = RPC_CONFIG.url;
