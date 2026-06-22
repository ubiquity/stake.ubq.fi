import { afterEach, describe, expect, it } from "bun:test";
import type { RpcConfig } from "../src/constants/config";
import { rpcHealthCheck } from "../src/utils/rpc-health";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function config(overrides: Partial<RpcConfig> = {}): RpcConfig {
  return {
    mode: "dev",
    url: "https://primary.example",
    fallbacks: ["https://fallback.example"],
    shouldAppendChainId: true,
    warnings: [],
    ...overrides,
  };
}

describe("rpcHealthCheck", () => {
  it("returns the first healthy candidate", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ result: "0x1" }), { status: 200 });
    }) as typeof fetch;

    const result = await rpcHealthCheck(1, config());

    expect(result).toEqual({
      ok: true,
      url: "https://primary.example/1",
      chainId: "0x1",
    });
    expect(calls).toEqual(["https://primary.example/1"]);
  });

  it("falls back after a failed primary RPC", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      if (calls.length === 1) {
        return new Response("nope", { status: 500 });
      }
      return new Response(JSON.stringify({ result: "0x1" }), { status: 200 });
    }) as typeof fetch;

    const result = await rpcHealthCheck(1, config());

    expect(result.ok).toBe(true);
    expect(result.url).toBe("https://fallback.example/1");
    expect(calls).toEqual(["https://primary.example/1", "https://fallback.example/1"]);
  });

  it("does not append chain id for local-node config", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL) => {
      calls.push(String(url));
      return new Response(JSON.stringify({ result: "0x1" }), { status: 200 });
    }) as typeof fetch;

    await rpcHealthCheck(
      31337,
      config({
        mode: "local-node",
        url: "http://localhost:8545",
        fallbacks: [],
        shouldAppendChainId: false,
      })
    );

    expect(calls).toEqual(["http://localhost:8545"]);
  });
});
