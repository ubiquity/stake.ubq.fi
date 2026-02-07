import { describe, expect, it } from "bun:test";
import { rpcHealthCheck } from "../src/utils/rpc-health";

describe("rpcHealthCheck", () => {
  it("returns ok=true when eth_chainId is valid", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    try {
      const res = await rpcHealthCheck("https://example.invalid/rpc", { timeoutMs: 100 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.chainId).toBe(1);
        expect(typeof res.latencyMs).toBe("number");
      }
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("returns ok=false on non-OK HTTP response", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;

    try {
      const res = await rpcHealthCheck("https://example.invalid/rpc", { timeoutMs: 100 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toContain("HTTP 500");
      }
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

