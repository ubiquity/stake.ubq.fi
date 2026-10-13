import { describe, expect, it } from "bun:test";

import { DEFAULT_RPC_HEALTH_TIMEOUT_MS, rpcHealthCheck } from "../src/utils/rpc-health";

const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const fetcherReturning = (body: unknown, status = 200): typeof fetch => (async () => jsonResponse(body, status)) as typeof fetch;

const ignoringAbortFetcher = (() => new Promise<Response>(() => undefined)) as typeof fetch;

const hangingFetcher = ((_input: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
  })) as typeof fetch;

describe("rpcHealthCheck", () => {
  it("returns a healthy result with the parsed chain id and latency", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      expectedChainId: 1,
      fetcher: fetcherReturning({ jsonrpc: "2.0", id: 1, result: "0x1" }),
    });

    expect(result.status).toBe("healthy");
    expect(result.chainId).toBe(1);
    expect(result.chainIdHex).toBe("0x1");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("detects an expectedChainId mismatch", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      expectedChainId: 31337,
      fetcher: fetcherReturning({ jsonrpc: "2.0", id: 1, result: "0x1" }),
    });

    expect(result.status).toBe("mismatched-chain");
    expect(result.chainId).toBe(1);
    expect(result.error).toContain("Expected chain 31337");
  });

  it("reports HTTP failures as unreachable", async () => {
    const result = await rpcHealthCheck("https://rpc.example", { fetcher: fetcherReturning("nope", 502) });

    expect(result.status).toBe("unreachable");
    expect(result.error).toBe("HTTP 502");
  });

  it("reports JSON-RPC error payloads", async () => {
    const result = await rpcHealthCheck("https://rpc.example", {
      fetcher: fetcherReturning({ jsonrpc: "2.0", id: 1, error: { message: "upstream failed" } }),
    });

    expect(result.status).toBe("rpc-error");
    expect(result.error).toBe("upstream failed");
  });

  it("rejects invalid and protocol-relative URLs before fetching", async () => {
    let calls = 0;
    const fetcher = (async () => {
      calls += 1;
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
    }) as typeof fetch;

    const invalid = await rpcHealthCheck("//rpc.example", { fetcher });

    expect(invalid.status).toBe("invalid-url");
    expect(calls).toBe(0);
  });

  it("times out hanging probes", async () => {
    const result = await rpcHealthCheck("https://rpc.example", { timeoutMs: 5, fetcher: hangingFetcher });

    expect(result.status).toBe("timeout");
    expect(result.error).toContain("Timed out");
  });

  it("settles on its deadline when the fetcher ignores the abort signal", async () => {
    const startedAt = Date.now();
    const result = await rpcHealthCheck("https://rpc.example", { timeoutMs: 30, fetcher: ignoringAbortFetcher });

    expect(result.status).toBe("timeout");
    expect(result.error).toContain("Timed out");
    expect(Date.now() - startedAt).toBeLessThan(2_000);
  });

  it("honors an already-aborted caller signal without fetching", async () => {
    let calls = 0;
    const fetcher = (async () => {
      calls += 1;
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
    }) as typeof fetch;
    const controller = new AbortController();
    controller.abort();

    const result = await rpcHealthCheck("https://rpc.example", { fetcher, signal: controller.signal });

    expect(result.status).toBe("aborted");
    expect(calls).toBe(0);
  });

  it("aborts an in-flight probe when the caller signal aborts", async () => {
    const controller = new AbortController();
    const pending = rpcHealthCheck("https://rpc.example", { fetcher: hangingFetcher, signal: controller.signal, timeoutMs: 5_000 });

    controller.abort();
    const result = await pending;

    expect(result.status).toBe("aborted");
  });

  it("exposes a short bounded default timeout", () => {
    expect(DEFAULT_RPC_HEALTH_TIMEOUT_MS).toBeLessThanOrEqual(2_000);
  });
});
