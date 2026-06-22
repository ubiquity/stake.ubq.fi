import { describe, expect, it } from "bun:test";

import { getDefaultRpcUrl, getRpcFallbackUrls, isDenoDeployHost, isValidRpcUrl, resolveRpcUrl } from "../src/constants/config";

describe("isDenoDeployHost", () => {
  it("matches Deno Deploy preview hostnames", () => {
    expect(isDenoDeployHost("stake-ubq-fi.deno.dev")).toBe(true);
    expect(isDenoDeployHost("p-stake-ubq-fi.ubiquity-dao.deno.net")).toBe(true);
  });

  it("does not match unrelated hostnames", () => {
    expect(isDenoDeployHost("stake.ubq.fi")).toBe(false);
    expect(isDenoDeployHost("localhost")).toBe(false);
  });
});

describe("RPC config resolution", () => {
  it("validates HTTP(S) and relative RPC URLs", () => {
    expect(isValidRpcUrl("https://rpc.ubq.fi")).toBe(true);
    expect(isValidRpcUrl("http://localhost:8545")).toBe(true);
    expect(isValidRpcUrl("/rpc")).toBe(true);
    expect(isValidRpcUrl("not a url")).toBe(false);
  });

  it("falls back to public RPC when dev VITE_RPC_URL is invalid", () => {
    const warnings: string[] = [];
    const resolved = resolveRpcUrl({
      envRpcUrl: "bad url",
      location: { hostname: "localhost", origin: "http://localhost:5173" },
      mode: "dev",
      warn: (message) => warnings.push(message),
    });

    expect(resolved).toBe("https://rpc.ubq.fi");
    expect(warnings[0]).toContain("Invalid VITE_RPC_URL");
  });

  it("keeps local-node mode on raw Anvil URL", () => {
    expect(getDefaultRpcUrl("local-node")).toBe("http://localhost:8545");
    expect(
      resolveRpcUrl({
        envRpcUrl: "http://localhost:8545",
        mode: "local-node",
      })
    ).toBe("http://localhost:8545");
  });

  it("adds mainnet fallback when primary RPC differs", () => {
    expect(getRpcFallbackUrls("https://custom-rpc.example", "dev")).toEqual(["https://rpc.ubq.fi"]);
    expect(getRpcFallbackUrls("https://rpc.ubq.fi", "dev")).toEqual([]);
    expect(getRpcFallbackUrls("http://localhost:8545", "local-node")).toEqual([]);
  });
});
