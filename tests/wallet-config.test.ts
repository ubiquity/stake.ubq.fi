import { describe, expect, it } from "bun:test";

import { getChainRpcUrl, getRpcTransportUrls } from "../src/wallet/config";

describe("wallet RPC transport config", () => {
  it("appends chain id to mainnet RPC endpoints", () => {
    expect(getChainRpcUrl("https://rpc.ubq.fi", 1)).toBe("https://rpc.ubq.fi/1");
  });

  it("keeps local-node RPC endpoints unsuffixed", () => {
    expect(getChainRpcUrl("http://localhost:8545", 31337, true)).toBe("http://localhost:8545");
  });

  it("exposes RPC URLs that are wired into wagmi transports", () => {
    expect(getRpcTransportUrls({ id: 1 } as Parameters<typeof getRpcTransportUrls>[0])).toContain("https://rpc.ubq.fi/1");
  });

  it("skips fallback endpoints for local-node transports", () => {
    expect(
      getRpcTransportUrls({ id: 31337 } as Parameters<typeof getRpcTransportUrls>[0], {
        fallbackUrls: ["https://rpc.ubq.fi"],
        localNode: true,
        rpcUrl: "http://localhost:8545",
      })
    ).toEqual(["http://localhost:8545"]);
  });
});
