import { describe, expect, it } from "bun:test";
import { createPublicClient, custom } from "viem";
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
  function fakeTransport(key: string, calls: string[], result: () => Promise<unknown>) {
    return custom(
      {
        request: async () => {
          calls.push(key);
          return result();
        },
      },
      { key, retryCount: 0 }
    );
  }

  it("builds a viem fallback for a two-endpoint chain and falls through to the second endpoint", async () => {
    const calls: string[] = [];
    const transport = dynamicRpcTransport(() => [
      fakeTransport("primary", calls, () => Promise.reject(new Error("primary is down"))),
      fakeTransport("secondary", calls, () => Promise.resolve("0x10")),
    ]);

    const client = createPublicClient({ chain: mainnet, transport });

    expect(await client.getBlockNumber()).toBe(16n);
    expect(calls).toEqual(["primary", "secondary"]);
  });

  it("uses a single endpoint directly without a fallback wrapper", async () => {
    const calls: string[] = [];
    const transport = dynamicRpcTransport(() => [fakeTransport("only", calls, () => Promise.resolve("0x2a"))]);

    const client = createPublicClient({ chain: mainnet, transport });

    expect(await client.getBlockNumber()).toBe(42n);
    expect(calls).toEqual(["only"]);
  });

  it("rebuilds the endpoint chain every time a client is created", async () => {
    const calls: string[] = [];
    let selected = "first";
    const transport = dynamicRpcTransport(() => [
      fakeTransport(selected, calls, () => Promise.resolve("0x1")),
      fakeTransport("backup", calls, () => Promise.resolve("0x1")),
    ]);

    await createPublicClient({ chain: mainnet, transport }).getBlockNumber();
    selected = "second";
    await createPublicClient({ chain: mainnet, transport }).getBlockNumber();

    expect(calls).toEqual(["first", "second"]);
  });
});
