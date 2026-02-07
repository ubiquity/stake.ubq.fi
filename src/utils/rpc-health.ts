export type RpcHealthOk = {
  ok: true;
  url: string;
  latencyMs: number;
  chainId: number;
};

export type RpcHealthError = {
  ok: false;
  url: string;
  latencyMs: number;
  error: string;
};

export type RpcHealthStatus = RpcHealthOk | RpcHealthError;

function parseHexChainId(value: unknown): number | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("0x")) return null;
  const n = Number.parseInt(value.slice(2), 16);
  return Number.isFinite(n) ? n : null;
}

export async function rpcHealthCheck(url: string, opts?: { timeoutMs?: number }): Promise<RpcHealthStatus> {
  const timeoutMs = opts?.timeoutMs ?? 1500;

  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Many JSON-RPC providers don't support HEAD reliably; do a minimal `eth_chainId` call.
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { ok: false, url, latencyMs: Date.now() - startedAt, error: `HTTP ${res.status}` };
    }

    const data = (await res.json().catch(() => null)) as { result?: unknown } | null;
    const chainId = parseHexChainId(data?.result);
    if (chainId == null) {
      return { ok: false, url, latencyMs: Date.now() - startedAt, error: "Invalid JSON-RPC response (missing/invalid eth_chainId)" };
    }

    return { ok: true, url, latencyMs: Date.now() - startedAt, chainId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, url, latencyMs: Date.now() - startedAt, error: message };
  } finally {
    clearTimeout(timer);
  }
}

