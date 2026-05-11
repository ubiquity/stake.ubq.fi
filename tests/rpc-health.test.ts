import { describe, expect, it } from "bun:test";
import { rpcHealthCheck } from "../src/utils/rpc-health";

function mockResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("rpcHealthCheck", () => {
  it("returns healthy=true for a reachable RPC", async () => {
    const fetchImpl = () => Promise.resolve(mockResponse({ jsonrpc: "2.0", result: "0x1" }));
    const result = await rpcHealthCheck("https://rpc.example.com", 1500, fetchImpl);
    expect(result.healthy).toBe(true);
    expect(result.chainId).toBe(1n);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("returns healthy=false for non-ok HTTP response", async () => {
    const fetchImpl = () => Promise.resolve(mockResponse(null, false));
    const result = await rpcHealthCheck("https://rpc.example.com", 1500, fetchImpl);
    expect(result.healthy).toBe(false);
    expect(result.chainId).toBeNull();
    expect(result.error).toMatch(/HTTP/);
  });

  it("returns healthy=false for RPC error response", async () => {
    const fetchImpl = () => Promise.resolve(mockResponse({ jsonrpc: "2.0", error: { message: "Internal error" } }));
    const result = await rpcHealthCheck("https://rpc.example.com", 1500, fetchImpl);
    expect(result.healthy).toBe(false);
    expect(result.error).toBe("Internal error");
  });

  it("returns healthy=false on fetch throw (network error)", async () => {
    const fetchImpl = () => Promise.reject(new Error("ENETUNREACH"));
    const result = await rpcHealthCheck("https://rpc.unreachable.example.com", 1500, fetchImpl);
    expect(result.healthy).toBe(false);
    expect(result.error).toBe("ENETUNREACH");
  });

  it("returns healthy=false when aborted due to timeout", async () => {
    const fetchImpl = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        if (init?.signal?.aborted) {
          reject(new Error("AbortError"));
          return;
        }
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("AbortError"));
        });
      });
    const result = await rpcHealthCheck("https://rpc.hanging.example.com", 50, fetchImpl);
    expect(result.healthy).toBe(false);
    expect(result.error).toMatch(/AbortError/);
  });
});
