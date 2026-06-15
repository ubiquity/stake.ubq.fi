/**
 * RPC endpoint for blockchain calls.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */

export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

const currentLocation = globalThis.location;
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || (isDenoDeployHost(currentLocation?.hostname ?? "") ? "https://rpc.ubq.fi" : `${currentLocation?.origin ?? ""}/rpc`);

/**
 * RPC timeout in milliseconds. Default 10 seconds.
 */
export const RPC_TIMEOUT = 10_000;

/**
 * Fallback RPC URLs used when the primary RPC is unreachable or misconfigured.
 */
export const FALLBACK_RPC_URLS: string[] = [
  "https://rpc.ubq.fi",
  "https://ethereum-rpc.publicnode.com",
  "https://rpc.ankr.com/eth",
];

/**
 * Validates an RPC URL format.
 * Returns true if the URL has a valid http or https scheme.
 */
export function validateRpcUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Returns the validated effective RPC URL.
 * If the configured URL is invalid, logs a warning and falls back to the first fallback.
 */
export function getEffectiveRpcUrl(): string {
  const url = RPC_URL;
  if (!validateRpcUrl(url)) {
    console.warn(
      `[stake.ubq.fi] Invalid VITE_RPC_URL: "${url}". ` +
      "Expected a valid http or https URL. " +
      `Falling back to "${FALLBACK_RPC_URLS[0]}".`
    );
    return FALLBACK_RPC_URLS[0];
  }
  return url;
}

/**
 * Checks whether an RPC endpoint is reachable by calling eth_blockNumber.
 * Returns true if the endpoint responds successfully within the timeout.
 */
export async function checkRpcHealth(url: string, timeout = RPC_TIMEOUT): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return false;
    const data = await response.json();
    return !data.error;
  } catch {
    return false;
  }
}
