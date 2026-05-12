export type RpcHealthStatus = {
  ok: boolean;
  url: string;
  chainId?: number;
  error?: string;
  elapsedMs: number;
};

export async function rpcHealthCheck(url: string, timeoutMs = 1500): Promise<RpcHealthStatus> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, url, error: `HTTP ${response.status}`, elapsedMs: Date.now() - startedAt };
    }

    const payload = (await response.json()) as { result?: string; error?: { message?: string } };
    if (payload.error) {
      return { ok: false, url, error: payload.error.message ?? "RPC returned an error", elapsedMs: Date.now() - startedAt };
    }

    if (!payload.result) {
      return { ok: false, url, error: "RPC response did not include chain id", elapsedMs: Date.now() - startedAt };
    }

    return { ok: true, url, chainId: Number.parseInt(payload.result, 16), elapsedMs: Date.now() - startedAt };
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? `Timed out after ${timeoutMs}ms` : error instanceof Error ? error.message : "Unknown RPC error";
    return { ok: false, url, error: message, elapsedMs: Date.now() - startedAt };
  } finally {
    clearTimeout(timeout);
  }
}
