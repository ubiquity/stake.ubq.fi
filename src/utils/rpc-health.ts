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

type RpcFetchOutcome = { kind: "http-error"; status: number } | { kind: "payload"; payload: RpcResponsePayload };

/**
 * Performs the request and fully decodes the body. Kept separate so the caller can race the
 * complete operation against its deadline rather than just the response headers.
 */
const fetchAndDecode = async (fetcher: typeof fetch, rpcUrl: string, signal: AbortSignal): Promise<RpcFetchOutcome> => {
  const response = await fetcher(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    }),
    signal,
  });

  if (!response.ok) {
    return { kind: "http-error", status: response.status };
  }

  return { kind: "payload", payload: (await response.json()) as RpcResponsePayload };
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
  let rejectDeadline: ((reason: Error) => void) | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    rejectDeadline = reject;
  });

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
    rejectDeadline?.(new Error(`Timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  const onCallerAbort = () => {
    controller.abort();
    rejectDeadline?.(new Error("Health check was aborted"));
  };
  signal?.addEventListener("abort", onCallerAbort);

  try {
    // The deadline has to cover the body decode as well as the headers. A fetcher that ignores
    // the abort signal can resolve headers and then never finish its body, which would leave
    // `response.json()` pending forever and stall the probe past its deadline.
    const attempt = fetchAndDecode(fetcher, rpcUrl, controller.signal);
    // A rejection that lands after the deadline has already won must not surface as unhandled.
    attempt.catch(() => undefined);

    const outcome = await Promise.race([attempt, deadline]);

    if (outcome.kind === "http-error") {
      return { status: "unreachable", rpcUrl, latencyMs: elapsed(), error: `HTTP ${outcome.status}` };
    }

    const payload = outcome.payload;
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
    signal?.removeEventListener("abort", onCallerAbort);
  }
}
