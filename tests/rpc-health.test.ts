import { afterEach, describe, expect, it, mock } from "bun:test";

import { rpcHealthCheck } from "../src/utils/rpc-health";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("rpcHealthCheck", () => {
  it("returns healthy status with parsed chain id", async () => {
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

    const result = await rpcHealthCheck("https://rpc.ubq.fi");
    expect(result.status).toBe("healthy");
    expect(result.chainId).toBe(1);
    expect(result.chainIdHex).toBe("0x1");
  });

  it("returns unhealthy status on rpc error payload", async () => {
    globalThis.fetch = mock(async () =>
      new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          error: { message: "bad upstream" },
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    const result = await rpcHealthCheck("https://rpc.ubq.fi");
    expect(result.status).toBe("unhealthy");
    expect(result.error).toContain("bad upstream");
  });

  it("returns timeout status when aborted by timeout", async () => {
    globalThis.fetch = mock(
      () =>
        new Promise<Response>((_, reject) => {
          setTimeout(() => reject(new DOMException("timeout", "AbortError")), 20);
        }),
    ) as typeof fetch;

    const result = await rpcHealthCheck("http://localhost:8545", { timeoutMs: 1 });
    expect(result.status).toBe("timeout");
  });
});
