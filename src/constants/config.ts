import { rpcHealthCheck, type RpcHealthResult } from "../utils/rpc-health";

/**
 * RPC endpoint for blockchain calls.
 * - In development (including deno.dev preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 * - Supports VITE_RPC_URL override with validation and fallback to known-good endpoints.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";

const PUBLIC_FALLBACK_RPC = "https://rpc.ubq.fi";

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function getRpcUrl(): string {
  const override = import.meta.env.VITE_RPC_URL;

  if (override) {
    if (!isValidHttpUrl(override)) {
      console.warn(
        `[RPC Config] VITE_RPC_URL="${override}" is not a valid HTTP(S) URL. ` +
        `Falling back to default RPC.`
      );
      return PUBLIC_FALLBACK_RPC;
    }
    return override;
  }

  // Deno.dev preview links always use public RPC
  if (self.location?.hostname?.includes(".deno.dev")) {
    return PUBLIC_FALLBACK_RPC;
  }

  // Production: relative path to reverse proxy
  if (self.location?.origin) {
    return `${self.location.origin}/rpc`;
  }

  return PUBLIC_FALLBACK_RPC;
}

export const RPC_URL = getRpcUrl();

// Fallback RPC list for dev mode
const DEV_FALLBACK_RPCS = [PUBLIC_FALLBACK_RPC];

/**
 * Get a healthy RPC URL from a list, checking sequentially.
 * Returns the first that responds within the timeout, or the last checked.
 */
export async function getHealthyRpcUrl(
  primaryUrl: string,
  fallbackUrls: readonly string[],
  timeoutMs = 2000
): Promise<{ url: string; health: RpcHealthResult }> {
  // Check primary first
  const primaryHealth = await rpcHealthCheck(primaryUrl, timeoutMs);
  if (primaryHealth.healthy) {
    return { url: primaryUrl, health: primaryHealth };
  }
  console.warn(`[RPC Health] Primary RPC (${primaryUrl}) unhealthy: ${primaryHealth.error}. Trying fallbacks…`);

  for (const fallback of fallbackUrls) {
    if (fallback === primaryUrl) continue;
    const health = await rpcHealthCheck(fallback, timeoutMs);
    if (health.healthy) {
      console.info(`[RPC Health] Fallback RPC (${fallback}) is healthy. Using it.`);
      return { url: fallback, health };
    }
  }

  // No healthy endpoint found — return primary with last health result
  console.error(`[RPC Health] All RPC endpoints failed. Last error: ${primaryHealth.error}`);
  return { url: primaryUrl, health: primaryHealth };
}

/**
 * In dev mode: resolve the RPC URL, optionally probing for health.
 * Exported separately so callers can decide when to probe.
 */
export async function getResolvedRpcUrl(): Promise<string> {
  if (isLocalNode) {
    return RPC_URL;
  }
  // In dev mode, use fallback list
  const { url } = await getHealthyRpcUrl(RPC_URL, DEV_FALLBACK_RPCS);
  return url;
}
