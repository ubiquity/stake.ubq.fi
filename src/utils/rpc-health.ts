export type RpcHealthStatus = "healthy" | "unhealthy" | "timeout";

export type RpcHealthCheckResult = {
  status: RpcHealthStatus;
  rpcUrl: string;
  chainIdHex?: string;
  chainId?: number;
  error?: string;
};

type RpcHealthCheckOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
};

const parseChainId = (value: string): number | undefined => {
  const parsed = Number.parseInt(value, 16);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function rpcHealthCheck(rpcUrl: string, options: RpcHealthCheckOptions = {}): Promise<RpcHealthCheckResult> {
  const { timeoutMs = 1_500, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { status: "unhealthy", rpcUrl, error: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as { result?: string; error?: { message?: string } };
    if (typeof payload.result === "string") {
      return {
        status: "healthy",
        rpcUrl,
        chainIdHex: payload.result,
        chainId: parseChainId(payload.result),
      };
    }

    return {
      status: "unhealthy",
      rpcUrl,
      error: payload.error?.message ?? "Unexpected RPC response",
    };
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    return {
      status: isTimeout ? "timeout" : "unhealthy",
      rpcUrl,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
