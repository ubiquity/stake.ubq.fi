import { afterEach, describe, expect, it, mock } from "bun:test";
import { RPC_FALLBACK_URLS, RPC_URL } from "../src/constants/config";
import { __resetRpcRuntimeForTests, getRpcRuntimeState, initializeRpcRuntime } from "../src/utils/rpc-runtime";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  __resetRpcRuntimeForTests();
});

describe("initializeRpcRuntime", () => {
  it("keeps primary RPC when health check passes", async () => {
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: "0x1",
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    await initializeRpcRuntime();
    const state = getRpcRuntimeState();
    expect(state.resolvedRpcUrl).toBe(RPC_URL);
    expect(state.lastStatus).toBe("healthy");
    expect(state.recentErrorCount).toBe(0);
  });

  it("falls back when primary fails quick check", async () => {
    const fallback = RPC_FALLBACK_URLS[0];
    const primaryProbeUrl = `${RPC_URL}/1`;
    const fallbackProbeUrl = `${fallback}/1`;
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === primaryProbeUrl) {
        return new Response(JSON.stringify({ error: { message: "primary down" } }), { status: 200 });
      }
      if (url === fallbackProbeUrl) {
        return new Response(JSON.stringify({ result: "0x1" }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: { message: "unexpected" } }), { status: 500 });
    }) as typeof fetch;

    await initializeRpcRuntime();
    const state = getRpcRuntimeState();
    expect(state.resolvedRpcUrl).toBe(fallback);
    expect(state.recentErrorCount).toBe(1);
  });
});
