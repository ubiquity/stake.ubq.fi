import { useEffect } from "react";
import { isLocalNode } from "../constants/config";
import { useStatusMessageDispatch } from "../context/status-message";
import { rpcHealthCheck } from "../utils/rpc-health";
import { getResolvedRpcBaseUrl } from "../utils/rpc-runtime";

export function RpcHealthNotice() {
  const dispatch = useStatusMessageDispatch();

  useEffect(() => {
    if (!isLocalNode) return;

    let cancelled = false;
    const healthUrl = getResolvedRpcBaseUrl();

    const check = async () => {
      const result = await rpcHealthCheck(healthUrl, { timeoutMs: 1_500 });
      if (cancelled) return;
      if (result.status !== "healthy") {
        dispatch({
          type: "setError",
          message: "Local node RPC unavailable at http://localhost:8545. Start Anvil and refresh.",
        });
      }
    };

    void check();
    const id = setInterval(() => void check(), 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [dispatch]);

  return null;
}
