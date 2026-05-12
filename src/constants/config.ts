/**
 * RPC endpoint for blockchain calls.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

export const MAINNET_RPC_FALLBACKS = ["https://rpc.ubq.fi"] as const;

const currentLocation = globalThis.location;

export type RpcUrlValidation = {
  valid: boolean;
  reason?: string;
};

export function validateRpcUrl(value: string): RpcUrlValidation {
  if (!value.trim()) return { valid: false, reason: "RPC URL is empty" };

  if (value.startsWith("/")) return { valid: true };

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { valid: false, reason: `RPC URL must use http or https, received ${url.protocol}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: "RPC URL must be an absolute http(s) URL or a relative path" };
  }
}

function warnInvalidRpcUrl(url: string, reason: string) {
  console.warn(`[rpc] Ignoring invalid VITE_RPC_URL "${url}": ${reason}`);
}

export function resolveRpcBaseUrl({
  envRpcUrl,
  hostname,
  origin,
  localNode,
}: {
  envRpcUrl?: string;
  hostname?: string;
  origin?: string;
  localNode?: boolean;
}) {
  if (localNode) return envRpcUrl || "http://localhost:8545";

  if (envRpcUrl) {
    const validation = validateRpcUrl(envRpcUrl);
    if (validation.valid) return envRpcUrl;
    warnInvalidRpcUrl(envRpcUrl, validation.reason ?? "unknown validation error");
  }

  if (isDenoDeployHost(hostname ?? "")) return MAINNET_RPC_FALLBACKS[0];

  return `${origin ?? ""}/rpc`;
}

export function getRpcUrlForChain(baseUrl: string, chainId: number, localNode = isLocalNode) {
  if (localNode) return baseUrl;
  return `${baseUrl.replace(/\/$/, "")}/${chainId}`;
}

export const RPC_URL = resolveRpcBaseUrl({
  envRpcUrl: import.meta.env.VITE_RPC_URL,
  hostname: currentLocation?.hostname,
  origin: currentLocation?.origin,
  localNode: isLocalNode,
});
