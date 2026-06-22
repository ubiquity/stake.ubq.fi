import { describe, expect, it } from "bun:test";

import { rpcHealthCheck } from "../src/utils/rpc-health";

describe("rpcHealthCheck", () => {
  it("returns chain id for healthy RPC response", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      fetchFn: async () =>
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), {
          status: 200,
        }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.chainId).toBe(1);
  });

  it("reports non-ok HTTP responses", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      fetchFn: async () => new Response("nope", { status: 502 }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.error).toBe("HTTP 502");
    }
  });

  it("reports RPC error payloads", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      fetchFn: async () =>
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { message: "upstream failed" } }), {
          status: 200,
        }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("upstream failed");
  });

  it("times out hanging RPC calls", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      timeoutMs: 1,
      fetchFn: (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.timedOut).toBe(true);
  });
});
