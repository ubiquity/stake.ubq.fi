import { afterEach, describe, expect, it } from "bun:test";
import { createClient } from "viem";
import { http, type Transport } from "viem";
import { anvil, mainnet } from "viem/chains";

import { MAINNET_RPC_FALLBACK_URL, RPC_FALLBACK_URLS, RPC_URL } from "../src/constants/config";
import { __resetRpcRuntimeForTests, getResolvedRpcBaseUrl, initializeRpcRuntime } from "../src/utils/rpc-runtime";
import { dynamicRpcTransport, getChainRpcUrl, getRpcTransportUrls } from "../src/wallet/config";

describe("getChainRpcUrl", () => {
  it("appends the chain id to mainnet RPC endpoints", () => {
    expect(getChainRpcUrl("https://rpc.ubq.fi", 1, false)).toBe("https://rpc.ubq.fi/1");
    expect(getChainRpcUrl("https://rpc.ubq.fi/", 1, false)).toBe("https://rpc.ubq.fi/1");
  });

  it("keeps local-node RPC endpoints raw and unsuffixed", () => {
    expect(getChainRpcUrl("http://localhost:8545", 31337, true)).toBe("http://localhost:8545");
    expect(getChainRpcUrl("http://localhost:8545/", 31337, true)).toBe("http://localhost:8545");
  });

  it("keeps query strings after the chain path", () => {
    expect(getChainRpcUrl("https://rpc.example/rpc?key=abc", 1, false)).toBe("https://rpc.example/rpc/1?key=abc");
  });
});

describe("getRpcTransportUrls", () => {
  it("returns the primary and fallback URLs with the chain suffix", () => {
    expect(
      getRpcTransportUrls(mainnet, {
        fallbackUrls: ["https://fallback.example"],
        localNode: false,
        rpcUrl: "https://primary.example",
      })
    ).toEqual(["https://primary.example/1", "https://fallback.example/1"]);
  });

  it("deduplicates a fallback that matches the primary", () => {
    expect(
      getRpcTransportUrls(mainnet, {
        fallbackUrls: [MAINNET_RPC_FALLBACK_URL],
        localNode: false,
        rpcUrl: MAINNET_RPC_FALLBACK_URL,
      })
    ).toEqual([`${MAINNET_RPC_FALLBACK_URL}/1`]);
  });

  it("skips fallback endpoints for local-node transports", () => {
    expect(
      getRpcTransportUrls(anvil, {
        fallbackUrls: [MAINNET_RPC_FALLBACK_URL],
        localNode: true,
        rpcUrl: "http://localhost:8545",
      })
    ).toEqual(["http://localhost:8545"]);
  });

  it("defaults to the resolved config primary and fallbacks", () => {
    const urls = getRpcTransportUrls(mainnet);

    expect(urls[0]).toBe(`${RPC_URL}/1`);
    for (const fallbackUrl of RPC_FALLBACK_URLS) {
      expect(urls).toContain(`${fallbackUrl}/1`);
    }
  });
});

describe("dynamicRpcTransport", () => {
  const request = { method: "eth_chainId" } as const;
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    __resetRpcRuntimeForTests();
    globalThis.fetch = originalFetch;
  });

  const jsonOk = (): Response => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), { headers: { "content-type": "application/json" } });

  /** Mainnet transports batch, so a batched body has to be answered with an array. */
  const jsonOkFor = (init?: RequestInit): Response => {
    const parsed = JSON.parse(String(init?.body ?? "{}")) as unknown;
    if (!Array.isArray(parsed)) return jsonOk();
    return new Response(JSON.stringify(parsed.map((entry) => ({ jsonrpc: "2.0", id: entry.id, result: "0x1" }))), {
      headers: { "content-type": "application/json" },
    });
  };

  const stubFetch = (handler: (url: string) => Response | null) => {
    const seen: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push(url);
      return handler(url) ?? jsonOkFor(init);
    }) as typeof fetch;
    return seen;
  };

  /**
   * The primary is the relative `/rpc` path, which `fetch` resolves against the page origin,
   * so match on the path rather than on the configured string.
   */
  const isPrimary = (url: string) => !url.includes("rpc.ubq.fi") && /\/rpc(\/|$)/.test(url);

  /** Builds the same URL chain the app builds, from the current runtime selection. */
  const createTransportForTest = (): Transport[] =>
    getRpcTransportUrls(mainnet, { rpcUrl: getResolvedRpcBaseUrl() || RPC_URL }).map((rpcUrl) => http(rpcUrl, { batch: true }));

  it("constructs a client and requests through the primary endpoint", async () => {
    const seen = stubFetch(() => null);
    const client = createClient({ transport: dynamicRpcTransport(createTransportForTest) });

    await client.request(request);

    expect(seen).toHaveLength(1);
    expect(isPrimary(seen[0]!)).toBe(true);
  });

  it("passes transport factories to fallback instead of invoked transports", async () => {
    // The regression: `fallback` throws "fn is not a function" when handed invoked transports,
    // so a two-endpoint chain fails while a single-endpoint chain keeps working.
    const seen = stubFetch((url) => (isPrimary(url) ? new Response("", { status: 503 }) : null));
    const client = createClient({ transport: dynamicRpcTransport(createTransportForTest) });

    await expect(client.request(request)).resolves.toBe("0x1");

    expect(seen.length).toBeGreaterThan(1);
    expect(isPrimary(seen[0]!)).toBe(true);
    expect(seen.some((url) => !isPrimary(url))).toBe(true);
  });

  it("resolves the selected endpoint per request instead of at client creation", async () => {
    // Only the fallback answers, so the probe rejects the primary and selects a fallback.
    const seen = stubFetch((url) => (isPrimary(url) ? new Response("", { status: 503 }) : null));
    const client = createClient({ transport: dynamicRpcTransport(createTransportForTest) });

    // A client already exists and has been used; only now does the probe choose a fallback.
    await client.request(request).catch(() => undefined);
    await initializeRpcRuntime({
      candidates: [RPC_URL, ...RPC_FALLBACK_URLS],
      expectedChainId: 1,
      localNode: false,
    });

    seen.length = 0;
    await client.request(request);

    expect(seen[0]).toContain("rpc.ubq.fi");
    expect(isPrimary(seen[0]!)).toBe(false);
  });
});
