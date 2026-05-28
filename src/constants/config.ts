/**
 * RPC endpoint configuration with fallback support, timeouts, and health checks.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 * - Fallback RPCs are used when the primary fails.
 */

export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");
const currentLocation = globalThis.location;

/** RPC fallback endpoints for resilience */
export const RPC_FALLBACKS = [
  "https://rpc.ubq.fi",
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
] as const;

/** RPC request timeout in milliseconds */
export const RPC_TIMEOUT_MS = 15_000;

/** Maximum number of RPC retry attempts */
export const RPC_MAX_RETRIES = 3;

/** Primary RPC URL derived from environment or mode */
export const primaryRpcUrl =
  import.meta.env.VITE_RPC_URL || (isDenoDeployHost(currentLocation?.hostname ?? "") ? "https://rpc.ubq.fi" : `${currentLocation?.origin ?? ""}/rpc`);

/** All RPC URLs: primary first, then fallbacks */
export const RPC_URLS = [primaryRpcUrl, ...RPC_FALLBACKS.filter((url) => url !== primaryRpcUrl)];

/** Current active RPC URL (exported for backward compatibility) */
export const RPC_URL = primaryRpcUrl;

/**
 * Perform a simple health check against an RPC endpoint.
 * Returns true if the endpoint responds to `eth_chainId`.
 */
export async function checkRpcHealth(url: string, timeoutMs: number = RPC_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return false;
    const data = await response.json();
    return !!data?.result;
  } catch {
    clearTimeout(timer);
    return false;
  }
}

/**
 * Find the first healthy RPC URL from the list.
 * Returns the first URL that passes the health check, or the primary if none respond.
 */
export async function getHealthyRpcUrl(): Promise<string> {
  for (const url of RPC_URLS) {
    const healthy = await checkRpcHealth(url);
    if (healthy) return url;
  }
  // Fallback to primary if nothing works
  return primaryRpcUrl;
}
