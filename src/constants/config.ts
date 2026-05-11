import { rpcHealthCheck, type RpcHealthResult } from "../utils/rpc-health";

/**
 * RPC endpoint for blockchain calls.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 * - Supports VITE_RPC_URL override with validation and fallback to known-good endpoints.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";

export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

const PUBLIC_FALLBACK_RPC = "https://rpc.ubq.fi";

export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getRawRpcUrl(): string {
  const override = import.meta.env.VITE_RPC_URL;
  const currentLocation = globalThis.location;

  if (override) {
    if (!isValidHttpUrl(override)) {
      console.warn(
        `[RPC Config] VITE_RPC_URL="${override}" is not a valid HTTP(S) URL. ` + `Falling back to default RPC.`
      );
      return PUBLIC_FALLBACK_RPC;
    }
    return override;
  }

  if (isDenoDeployHost(currentLocation?.hostname ?? "")) {
    return PUBLIC_FALLBACK_RPC;
  }

  return `${currentLocation?.origin ?? ""}/rpc`;
}

/**
 * Synchronous, backward-compatible RPC URL.
 * In local-node mode this is the raw URL (no chain suffixing).
 * In dev/prod it may be overridden by VITE_RPC_URL.
 */
export const RPC_URL = getRawRpcUrl();

/**
 * Fallback RPC endpoints for mainnet when the primary fails.
 */
export const DEV_FALLBACK_RPCS: readonly string[] = [PUBLIC_FALLBACK_RPC];

/**
 * Get a healthy RPC URL from a list, checking sequentially.
 * Returns the first that responds within the timeout, or the last checked.
 */
export async function getHealthyRpcUrl(
  primaryUrl: string,
  fallbackUrls: readonly string[],
  timeoutMs = 1500,
  checkHealth = rpcHealthCheck
): Promise<{ url: string; health: RpcHealthResult }> {
  const primaryHealth = await checkHealth(primaryUrl, timeoutMs);
  if (primaryHealth.healthy) {
    return { url: primaryUrl, health: primaryHealth };
  }

  if (!isLocalNode) {
    console.warn(`[RPC Health] Primary RPC (${primaryUrl}) unhealthy: ${primaryHealth.error}. Trying fallbacks…`);
  }

  for (const fallback of fallbackUrls) {
    if (fallback === primaryUrl) continue;
    const health = await checkHealth(fallback, timeoutMs);
    if (health.healthy) {
      if (!isLocalNode) {
        console.info(`[RPC Health] Fallback RPC (${fallback}) is healthy. Using it.`);
      }
      return { url: fallback, health };
    }
  }

  if (!isLocalNode) {
    console.error(`[RPC Health] All RPC endpoints failed. Last error: ${primaryHealth.error}`);
  }
  return { url: primaryUrl, health: primaryHealth };
}

/**
 * Resolve the best available RPC URL.
 * - In local-node mode, returns the raw RPC_URL without health checks.
 * - In dev/prod, probes the primary and falls back to known-good endpoints.
 */
export async function resolveRpcUrl(timeoutMs = 1500, checkHealth = rpcHealthCheck): Promise<string> {
  if (isLocalNode) {
    return RPC_URL;
  }
  const { url } = await getHealthyRpcUrl(RPC_URL, DEV_FALLBACK_RPCS, timeoutMs, checkHealth);
  return url;
}
