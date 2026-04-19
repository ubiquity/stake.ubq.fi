/**
 * Lightweight RPC health check using eth_chainId with a short timeout.
 */
export interface RpcHealthResult {
  healthy: boolean;
  chainId: bigint | null;
  error?: string;
  latencyMs?: number;
}

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Probe an RPC URL with eth_chainId to verify it's reachable.
 */
export async function rpcHealthCheck(
  rpcUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<RpcHealthResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_chainId",
        params: [],
        id: 1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        healthy: false,
        chainId: null,
        error: `HTTP ${response.status}`,
        latencyMs: Date.now() - start,
      };
    }

    const data = (await response.json()) as { result?: string; error?: { message?: string } };
    if (data.error) {
      return {
        healthy: false,
        chainId: null,
        error: data.error.message ?? "RPC error",
        latencyMs: Date.now() - start,
      };
    }

    return {
      healthy: true,
      chainId: data.result ? BigInt(data.result) : null,
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    return {
      healthy: false,
      chainId: null,
      error: message,
      latencyMs: Date.now() - start,
    };
  }
}
