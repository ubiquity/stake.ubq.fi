import { useSyncExternalStore } from "react";
import { getRpcRuntimeState, subscribeRpcRuntime } from "../utils/rpc-runtime";

export function DevRpcPanel() {
  const state = useSyncExternalStore(subscribeRpcRuntime, getRpcRuntimeState, getRpcRuntimeState);
  const isProd = import.meta.env.MODE === "prod";

  if (isProd) return null;

  return (
    <section style={{ margin: "12px 0", padding: "8px 12px", border: "1px solid #2f2f2f", fontSize: "12px", fontFamily: "monospace" }}>
      <div>RPC: {state.resolvedRpcUrl}</div>
      <div>Status: {state.lastStatus}</div>
      <div>ChainId: {state.lastChainId ?? "n/a"}</div>
      <div>Recent errors: {state.recentErrorCount}</div>
    </section>
  );
}
