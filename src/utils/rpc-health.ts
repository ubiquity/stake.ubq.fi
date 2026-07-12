import { isValidRpcUrl } from "../constants/config";

type RpcHealthCheckOptions = {
  expectedChainId?: number;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

export type RpcHealthStatus = "healthy" | "invalid-url" | "mismatched-chain" | "rpc-error" | "timeout" | "unreachable";

export type RpcHealthResult = {
  chainId?: number;
  error?: string;
  latencyMs: number;
  ok: boolean;
  status: RpcHealthStatus;
  url: string;
};

type RpcResponse = {
  error?: { message?: string };
  result?: string;
};

export async function rpcHealthCheck(url: string, options: RpcHealthCheckOptions = {}): Promise<RpcHealthResult> {
  const timeoutMs = options.timeoutMs ?? 1500;
  const startedAt = Date.now();

  if (!isValidRpcUrl(url)) {
    return {
      latencyMs: Date.now() - startedAt,
      ok: false,
      status: "invalid-url",
      url,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(url, {
      body: JSON.stringify({ id: 1, jsonrpc: "2.0", method: "eth_chainId", params: [] }),
      headers: { "content-type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        error: `HTTP ${response.status}`,
        latencyMs: Date.now() - startedAt,
        ok: false,
        status: "unreachable",
        url,
      };
    }

    const payload = (await response.json()) as RpcResponse;
    if (payload.error || !payload.result) {
      return {
        error: payload.error?.message ?? "Missing eth_chainId result",
        latencyMs: Date.now() - startedAt,
        ok: false,
        status: "rpc-error",
        url,
      };
    }

    const chainId = Number.parseInt(payload.result, 16);
    if (options.expectedChainId && chainId !== options.expectedChainId) {
      return {
        chainId,
        error: `Expected chain ${options.expectedChainId}, got ${chainId}`,
        latencyMs: Date.now() - startedAt,
        ok: false,
        status: "mismatched-chain",
        url,
      };
    }

    return {
      chainId,
      latencyMs: Date.now() - startedAt,
      ok: true,
      status: "healthy",
      url,
    };
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    return {
      error: error instanceof Error ? error.message : "Unknown RPC health check failure",
      latencyMs: Date.now() - startedAt,
      ok: false,
      status: isTimeout ? "timeout" : "unreachable",
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}
