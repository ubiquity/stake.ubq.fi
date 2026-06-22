export type RpcHealthStatus =
  | {
      ok: true;
      url: string;
      chainId: number;
      latencyMs: number;
    }
  | {
      ok: false;
      url: string;
      error: string;
      latencyMs: number;
      status?: number;
      timedOut?: boolean;
    };

type RpcFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function parseChainId(chainId: unknown): number | null {
  if (typeof chainId !== "string") return null;
  const parsed = Number.parseInt(chainId, chainId.startsWith("0x") ? 16 : 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function rpcHealthCheck(
  url: string,
  {
    fetchFn = fetch,
    timeoutMs = 1500,
  }: {
    fetchFn?: RpcFetch;
    timeoutMs?: number;
  } = {}
): Promise<RpcHealthStatus> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_chainId",
        params: [],
      }),
      signal: controller.signal,
    });

    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return { ok: false, url, status: response.status, error: `HTTP ${response.status}`, latencyMs };
    }

    const data = (await response.json()) as { result?: unknown; error?: { message?: string } };
    if (data.error) {
      return { ok: false, url, error: data.error.message ?? "RPC error", latencyMs };
    }

    const chainId = parseChainId(data.result);
    if (chainId === null) {
      return { ok: false, url, error: "Invalid eth_chainId response", latencyMs };
    }

    return { ok: true, url, chainId, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const timedOut = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, url, error: timedOut ? `Timed out after ${timeoutMs}ms` : errorMessage(error), latencyMs, timedOut };
  } finally {
    clearTimeout(timeout);
  }
}
