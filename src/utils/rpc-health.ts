import { RPC_CONFIG, type RpcConfig } from "../constants/config";

export interface RpcHealthStatus {
  ok: boolean;
  url: string;
  chainId?: string;
  error?: string;
}

const ETH_CHAIN_ID_PAYLOAD = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "eth_chainId",
  params: [],
});

function chainRpcUrl(baseUrl: string, chainId: number, shouldAppendChainId: boolean): string {
  if (!shouldAppendChainId) {
    return baseUrl;
  }
  return `${baseUrl.replace(/\/$/, "")}/${chainId}`;
}

export async function rpcHealthCheck(
  chainId = 1,
  config: RpcConfig = RPC_CONFIG,
  timeoutMs = 1500
): Promise<RpcHealthStatus> {
  const candidates = [config.url, ...config.fallbacks];
  let lastError = "RPC health check failed";

  for (const baseUrl of candidates) {
    const url = chainRpcUrl(baseUrl, chainId, config.shouldAppendChainId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: ETH_CHAIN_ID_PAYLOAD,
        signal: controller.signal,
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const json = (await response.json()) as { result?: string; error?: { message?: string } };
      if (typeof json.result === "string") {
        return { ok: true, url, chainId: json.result };
      }
      lastError = json.error?.message || "Missing eth_chainId result";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: false,
    url: candidates[0],
    error: lastError,
  };
}
