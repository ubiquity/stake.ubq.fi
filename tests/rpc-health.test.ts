import { describe, expect, it } from "bun:test";

import { rpcHealthCheck } from "../src/utils/rpc-health";

describe("rpcHealthCheck", () => {
  it("returns healthy when eth_chainId responds", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      expectedChainId: 1,
      fetcher: async () => Response.json({ id: 1, jsonrpc: "2.0", result: "0x1" }),
    });

    expect(result.ok).toBe(true);
    expect(result.status).toBe("healthy");
    expect(result.chainId).toBe(1);
  });

  it("reports invalid URLs before fetch", async () => {
    const result = await rpcHealthCheck("not a url", {
      fetcher: async () => Response.json({ result: "0x1" }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid-url");
  });

  it("detects mismatched chain IDs", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      expectedChainId: 31337,
      fetcher: async () => Response.json({ id: 1, jsonrpc: "2.0", result: "0x1" }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("mismatched-chain");
    expect(result.error).toContain("Expected chain 31337");
  });

  it("surfaces JSON-RPC errors", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      fetcher: async () => Response.json({ error: { message: "method unavailable" }, id: 1, jsonrpc: "2.0" }),
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe("rpc-error");
    expect(result.error).toBe("method unavailable");
  });
});
