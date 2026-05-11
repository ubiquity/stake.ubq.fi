import { useEffect, useState } from "react";
import { isLocalNode, RPC_URL, resolveRpcUrl } from "../constants/config";
import { rpcHealthCheck, type RpcHealthResult } from "../utils/rpc-health";

export function RpcDiagnostics() {
  const [health, setHealth] = useState<RpcHealthResult | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string>(RPC_URL);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const [healthResult, url] = await Promise.all([
        rpcHealthCheck(RPC_URL, 2000),
        resolveRpcUrl(2000),
      ]);
      if (!cancelled) {
        setHealth(healthResult);
        setResolvedUrl(url);
        setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (import.meta.env.PROD) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        padding: "12px 16px",
        background: "#1a1a2e",
        color: "#eee",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "monospace",
        zIndex: 9999,
        maxWidth: 320,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>RPC Diagnostics</div>
      {loading ? (
        <div>Checking…</div>
      ) : (
        <>
          <div>Mode: {isLocalNode ? "local-node" : import.meta.env.MODE}</div>
          <div>URL: {resolvedUrl}</div>
          <div>
            Status:{" "}
            {health?.healthy ? (
              <span style={{ color: "#4ade80" }}>Healthy</span>
            ) : (
              <span style={{ color: "#f87171" }}>Unhealthy</span>
            )}
          </div>
          {health?.chainId !== null && health?.chainId !== undefined && <div>Chain ID: {health.chainId.toString()}</div>}
          {health?.latencyMs !== undefined && <div>Latency: {health.latencyMs}ms</div>}
          {health?.error && <div style={{ color: "#f87171" }}>Error: {health.error}</div>}
        </>
      )}
    </div>
  );
}
