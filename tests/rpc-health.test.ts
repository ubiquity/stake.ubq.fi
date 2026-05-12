import { describe, expect, it } from "bun:test";

import { rpcHealthCheck } from "../src/utils/rpc-health";

describe("rpcHealthCheck", () => {
  it("returns ok status with parsed chain id", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    try {
      const result = await rpcHealthCheck("https://rpc.example", 100);
      expect(result.ok).toBe(true);
      expect(result.chainId).toBe(1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns unavailable status for non-200 responses", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("server error", { status: 500 })) as unknown as typeof fetch;

    try {
      const result = await rpcHealthCheck("https://rpc.example", 100);
      expect(result.ok).toBe(false);
      expect(result.error).toBe("HTTP 500");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
