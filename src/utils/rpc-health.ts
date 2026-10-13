import { isValidRpcUrl } from "../constants/config";

export type RpcHealthStatus = "healthy" | "mismatched-chain" | "invalid-url" | "rpc-error" | "unreachable" | "timeout" | "aborted";

export type RpcHealthCheckResult = {
  status: RpcHealthStatus;
  rpcUrl: string;
  chainId?: number;
  chainIdHex?: string;
  latencyMs: number;
  error?: string;
};

export type RpcHealthCheckOptions = {
  expectedChainId?: number;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** Short bounded probe timeout so startup is never blocked by a dead endpoint. */
export const DEFAULT_RPC_HEALTH_TIMEOUT_MS = 1_500;

type RpcResponsePayload = {
  error?: { message?: string };
  result?: unknown;
};

const parseChainId = (value: unknown): { chainId: number; chainIdHex: string } | null => {
  if (typeof value !== "string" || !value.startsWith("0x")) return null;
  const parsed = Number.parseInt(value.slice(2), 16);
  if (!Number.isFinite(parsed)) return null;
  return { chainId: parsed, chainIdHex: value };
};

/**
 * Probes an RPC endpoint with a minimal `eth_chainId` JSON-RPC call and a short bounded timeout.
 * The result is always typed; the probe never throws, so callers can safely count failures.
 */
export async function rpcHealthCheck(rpcUrl: string, options: RpcHealthCheckOptions = {}): Promise<RpcHealthCheckResult> {
  const { expectedChainId, fetcher = fetch, signal, timeoutMs = DEFAULT_RPC_HEALTH_TIMEOUT_MS } = options;
  const startedAt = Date.now();
  const elapsed = () => Date.now() - startedAt;

  if (!isValidRpcUrl(rpcUrl)) {
    return { status: "invalid-url", rpcUrl, latencyMs: elapsed(), error: "RPC URL must be an absolute http(s) URL or a relative path" };
  }

  if (signal?.aborted) {
    return { status: "aborted", rpcUrl, latencyMs: elapsed(), error: "Health check was aborted before it started" };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener("abort", onCallerAbort);

  // A fetcher may ignore the abort signal, so the probe settles on its own deadline
  // instead of leaving the caller pending forever. The abandoned fetch is not awaited.
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    deadlineTimer = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetcher(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: [],
        }),
        signal: controller.signal,
      }),
      deadline,
    ]);

    if (!response.ok) {
      return { status: "unreachable", rpcUrl, latencyMs: elapsed(), error: `HTTP ${response.status}` };
    }

    const payload = (await response.json()) as RpcResponsePayload;
    if (payload.error) {
      return { status: "rpc-error", rpcUrl, latencyMs: elapsed(), error: payload.error.message ?? "RPC responded with an error" };
    }

    const parsed = parseChainId(payload.result);
    if (!parsed) {
      return { status: "rpc-error", rpcUrl, latencyMs: elapsed(), error: "Invalid eth_chainId response" };
    }

    if (expectedChainId !== undefined && parsed.chainId !== expectedChainId) {
      return {
        status: "mismatched-chain",
        rpcUrl,
        chainId: parsed.chainId,
        chainIdHex: parsed.chainIdHex,
        latencyMs: elapsed(),
        error: `Expected chain ${expectedChainId}, got ${parsed.chainId}`,
      };
    }

    return { status: "healthy", rpcUrl, chainId: parsed.chainId, chainIdHex: parsed.chainIdHex, latencyMs: elapsed() };
  } catch (error) {
    const status: RpcHealthStatus = timedOut ? "timeout" : signal?.aborted ? "aborted" : "unreachable";
    return {
      status,
      rpcUrl,
      latencyMs: elapsed(),
      error: timedOut ? `Timed out after ${timeoutMs}ms` : error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
    if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
