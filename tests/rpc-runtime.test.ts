import { afterEach, describe, expect, it } from "bun:test";

import { LOCAL_NODE_RPC_URL, RPC_URL } from "../src/constants/config";
import { __resetRpcRuntimeForTests, getResolvedRpcBaseUrl, getRpcRuntimeState, initializeRpcRuntime } from "../src/utils/rpc-runtime";

const jsonResponse = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const healthyFetcher = (async () => jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" })) as typeof fetch;

const failingFetcher = (async () => jsonResponse({ jsonrpc: "2.0", id: 1, error: { message: "down" } })) as typeof fetch;

afterEach(() => {
  __resetRpcRuntimeForTests();
});

describe("initializeRpcRuntime", () => {
  it("keeps the primary candidate when the health probe passes", async () => {
    const probed: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      probed.push(String(input));
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
    }) as typeof fetch;

    await initializeRpcRuntime({ candidates: ["https://primary.example"], expectedChainId: 1, localNode: false, fetcher });

    const state = getRpcRuntimeState();
    expect(probed).toEqual(["https://primary.example/1"]);
    expect(state.resolvedRpcUrl).toBe("https://primary.example");
    expect(state.lastStatus).toBe("healthy");
    expect(state.lastChainId).toBe(1);
    expect(state.recentErrorCount).toBe(0);
    expect(state.initialized).toBe(true);
  });

  it("selects the first healthy fallback after primary failures", async () => {
    const probed: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      const url = String(input);
      probed.push(url);
      if (url.startsWith("https://primary.example")) return jsonResponse({ jsonrpc: "2.0", id: 1, error: { message: "primary down" } });
      if (url.startsWith("https://fallback.example")) return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
      return jsonResponse({ jsonrpc: "2.0", id: 1, error: { message: "unexpected" } }, 500);
    }) as typeof fetch;

    await initializeRpcRuntime({
      candidates: ["https://primary.example", "https://fallback.example", "https://later.example"],
      expectedChainId: 1,
      localNode: false,
      fetcher,
    });

    const state = getRpcRuntimeState();
    expect(probed).toEqual(["https://primary.example/1", "https://fallback.example/1"]);
    expect(state.resolvedRpcUrl).toBe("https://fallback.example");
    expect(getResolvedRpcBaseUrl()).toBe("https://fallback.example");
    expect(state.lastStatus).toBe("healthy");
    expect(state.recentErrorCount).toBe(1);
  });

  it("keeps the primary and counts every failure when no candidate is healthy", async () => {
    await initializeRpcRuntime({
      candidates: ["https://primary.example", "https://fallback.example"],
      expectedChainId: 1,
      localNode: false,
      fetcher: failingFetcher,
    });

    const state = getRpcRuntimeState();
    expect(state.resolvedRpcUrl).toBe("https://primary.example");
    expect(state.lastStatus).toBe("rpc-error");
    expect(state.recentErrorCount).toBe(2);
    expect(state.initialized).toBe(true);
  });

  it("probes the raw local-node URL without a chain suffix and enforces chain 31337", async () => {
    const probed: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      probed.push(String(input));
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
    }) as typeof fetch;

    await initializeRpcRuntime({ candidates: [LOCAL_NODE_RPC_URL], expectedChainId: 31337, localNode: true, fetcher });

    const state = getRpcRuntimeState();
    expect(probed).toEqual([LOCAL_NODE_RPC_URL]);
    expect(state.lastStatus).toBe("mismatched-chain");
    expect(state.lastChainId).toBe(1);
    expect(state.recentErrorCount).toBe(1);
    expect(state.resolvedRpcUrl).toBe(LOCAL_NODE_RPC_URL);
  });

  it("probes the configured primary by default", async () => {
    const probed: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      probed.push(String(input));
      return jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" });
    }) as typeof fetch;

    await initializeRpcRuntime({ fetcher, localNode: false, expectedChainId: 1 });

    expect(probed[0]).toBe(`${RPC_URL}/1`);
    expect(getRpcRuntimeState().resolvedRpcUrl).toBe(RPC_URL);
  });

  it("clears a previous fallback selection when a new run fails", async () => {
    const fallbackFetcher = (async (input: RequestInfo | URL) =>
      String(input).startsWith("https://primary.example")
        ? jsonResponse({ jsonrpc: "2.0", id: 1, error: { message: "primary down" } })
        : jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" })) as typeof fetch;

    await initializeRpcRuntime({
      candidates: ["https://primary.example", "https://fallback.example"],
      expectedChainId: 1,
      localNode: false,
      fetcher: fallbackFetcher,
    });
    expect(getRpcRuntimeState().resolvedRpcUrl).toBe("https://fallback.example");

    __resetRpcRuntimeForTests();
    expect(getResolvedRpcBaseUrl()).toBe(RPC_URL);
    expect(getRpcRuntimeState().initialized).toBe(false);

    await initializeRpcRuntime({ candidates: ["https://primary.example"], expectedChainId: 1, localNode: false, fetcher: failingFetcher });

    const state = getRpcRuntimeState();
    expect(state.resolvedRpcUrl).toBe("https://primary.example");
    expect(state.resolvedRpcUrl).not.toBe("https://fallback.example");
    expect(state.initialized).toBe(true);
  });

  it("does not leak state from a superseded run", async () => {
    let releaseSlow: ((response: Response) => void) | undefined;
    const slowFetcher = (async () =>
      new Promise<Response>((resolve) => {
        releaseSlow = resolve;
      })) as typeof fetch;

    const slowRun = initializeRpcRuntime({ candidates: ["https://slow.example"], expectedChainId: 1, localNode: false, fetcher: slowFetcher });
    await initializeRpcRuntime({ candidates: ["https://fast.example"], expectedChainId: 1, localNode: false, fetcher: healthyFetcher });

    expect(getRpcRuntimeState().resolvedRpcUrl).toBe("https://fast.example");

    releaseSlow?.(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x1" }));
    await slowRun;

    const state = getRpcRuntimeState();
    expect(state.resolvedRpcUrl).toBe("https://fast.example");
    expect(state.lastStatus).toBe("healthy");
  });
});
