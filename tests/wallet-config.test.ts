import { describe, expect, it } from "bun:test";
import { createClient, type Transport } from "viem";
import { anvil, mainnet } from "viem/chains";

import { MAINNET_RPC_FALLBACK_URL, RPC_FALLBACK_URLS, RPC_URL } from "../src/constants/config";
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
  it("throws when no transport is provided", async () => {
    const transport = dynamicRpcTransport(() => []);
    const client = transport({ chain: mainnet });
    expect(client.request({ method: "eth_blockNumber" })).rejects.toThrow("No RPC transport URL is available");
  });

  it("switches the selected endpoint after client creation and observes the next request on the new endpoint", async () => {
    let currentEndpoint = "https://primary.example";
    const requestedEndpoints: string[] = [];

    const createMockTransport =
      (url: string): Transport =>
      () => ({
        config: { key: url, name: url, request: async () => {}, retryCount: 0, retryDelay: 0, timeout: 2000, type: "http" },
        request: async ({ method }: { method: string }) => {
          requestedEndpoints.push(url);
          if (method === "eth_chainId") return "0x1";
          return `result-from-${url}`;
        },
        value: undefined,
      });

    const client = createClient({
      chain: mainnet,
      transport: dynamicRpcTransport(() => [createMockTransport(currentEndpoint)]),
    });

    // Initial request reaches the primary endpoint
    const firstResult = await client.request({ method: "eth_blockNumber" });
    expect(firstResult).toBe("result-from-https://primary.example");
    expect(requestedEndpoints).toEqual(["https://primary.example"]);

    // Endpoint changes after client creation (e.g., health probe completes and selects fallback)
    currentEndpoint = "https://fallback.example";

    // Next request on the existing client immediately uses the newly selected endpoint
    const secondResult = await client.request({ method: "eth_blockNumber" });
    expect(secondResult).toBe("result-from-https://fallback.example");
    expect(requestedEndpoints).toEqual(["https://primary.example", "https://fallback.example"]);
  });

  it("exercises a two-endpoint fallback chain when the primary fails", async () => {
    let primaryCalled = false;
    let fallbackCalled = false;

    const primaryTransport: Transport = () => ({
      config: { key: "primary", name: "Primary", request: async () => {}, retryCount: 0, retryDelay: 0, timeout: 2000, type: "http" },
      request: async () => {
        primaryCalled = true;
        throw new Error("Primary RPC connection refused");
      },
      value: undefined,
    });

    const fallbackTransport: Transport = () => ({
      config: { key: "fallback", name: "Fallback", request: async () => {}, retryCount: 0, retryDelay: 0, timeout: 2000, type: "http" },
      request: async ({ method }: { method: string }) => {
        fallbackCalled = true;
        if (method === "eth_chainId") return "0x1";
        return "0x123";
      },
      value: undefined,
    });

    const transport = dynamicRpcTransport(() => [primaryTransport, fallbackTransport]);
    const client = transport({ chain: mainnet });

    const result = await client.request({ method: "eth_blockNumber" });
    expect(primaryCalled).toBe(true);
    expect(fallbackCalled).toBe(true);
    expect(result).toBe("0x123");
  });
});
