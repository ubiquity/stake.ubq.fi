import { isLocalNode, RPC_FALLBACK_URLS, RPC_URL } from "../constants/config";
import { rpcHealthCheck, type RpcHealthCheckResult } from "./rpc-health";

type RpcRuntimeState = {
  resolvedRpcUrl: string;
  lastChainId?: number;
  lastStatus: RpcHealthCheckResult["status"] | "unknown";
  recentErrorCount: number;
  initialized: boolean;
};

const listeners = new Set<() => void>();
const state: RpcRuntimeState = {
  resolvedRpcUrl: RPC_URL,
  lastStatus: "unknown",
  recentErrorCount: 0,
  initialized: false,
};

const MAINNET_CHAIN_ID = 1;

const withChainPath = (baseUrl: string): string => (isLocalNode ? baseUrl : `${baseUrl}/${MAINNET_CHAIN_ID}`);

const notify = () => {
  listeners.forEach((listener) => listener());
};

export const subscribeRpcRuntime = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getRpcRuntimeState = (): RpcRuntimeState => ({ ...state });
export const getResolvedRpcBaseUrl = (): string => state.resolvedRpcUrl;

export const __resetRpcRuntimeForTests = () => {
  state.resolvedRpcUrl = RPC_URL;
  state.lastChainId = undefined;
  state.lastStatus = "unknown";
  state.recentErrorCount = 0;
  state.initialized = false;
};

export async function initializeRpcRuntime(): Promise<RpcRuntimeState> {
  const candidates = [RPC_URL, ...RPC_FALLBACK_URLS].filter((url, index, list) => list.indexOf(url) === index);

  for (const baseUrl of candidates) {
    const result = await rpcHealthCheck(withChainPath(baseUrl), { timeoutMs: 1_500 });
    state.lastStatus = result.status;
    state.lastChainId = result.chainId;

    if (result.status === "healthy") {
      if (baseUrl !== RPC_URL) {
        console.warn(`[rpc-runtime] Primary RPC failed quick check. Falling back to "${baseUrl}".`);
      }
      state.resolvedRpcUrl = baseUrl;
      state.initialized = true;
      notify();
      return getRpcRuntimeState();
    }

    state.recentErrorCount += 1;
  }

  state.initialized = true;
  console.warn(`[rpc-runtime] All RPC candidates failed quick health check. Using primary "${RPC_URL}" and relying on transport fallback.`);
  notify();
  return getRpcRuntimeState();
}
