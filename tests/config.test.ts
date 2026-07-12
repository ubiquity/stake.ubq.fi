import { describe, expect, it } from "bun:test";

import { DEFAULT_MAINNET_RPC_URL, getChainRpcUrl, isDenoDeployHost, isValidRpcUrl, resolveRpcConfig } from "../src/constants/config";

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
  it("accepts valid VITE_RPC_URL values and adds the mainnet fallback only when useful", () => {
    const resolved = resolveRpcConfig({
      envRpcUrl: "https://example.com/rpc/",
      mode: "prod",
      warn: () => undefined,
    });

    expect(resolved.rpcUrl).toBe("https://example.com/rpc");
    expect(resolved.fallbackRpcUrls).toEqual([DEFAULT_MAINNET_RPC_URL]);
    expect(resolved.warnings).toEqual([]);
  });

  it("warns and falls back when VITE_RPC_URL is malformed", () => {
    const warnings: string[] = [];
    const resolved = resolveRpcConfig({
      envRpcUrl: "not a url",
      mode: "dev",
      warn: (message) => warnings.push(message),
    });

    expect(resolved.rpcUrl).toBe(DEFAULT_MAINNET_RPC_URL);
    expect(resolved.fallbackRpcUrls).toEqual([]);
    expect(warnings[0]).toContain("Ignoring invalid VITE_RPC_URL");
  });

  it("keeps local-node mode on the raw Anvil endpoint without fallbacks", () => {
    const resolved = resolveRpcConfig({
      mode: "local-node",
      warn: () => undefined,
    });

    expect(resolved.rpcUrl).toBe("http://localhost:8545");
    expect(resolved.fallbackRpcUrls).toEqual([]);
  });

  it("uses the production proxy with a public fallback when no env URL exists", () => {
    const resolved = resolveRpcConfig({
      hostname: "stake.ubq.fi",
      mode: "prod",
      warn: () => undefined,
    });

    expect(resolved.rpcUrl).toBe("/rpc");
    expect(resolved.fallbackRpcUrls).toEqual([DEFAULT_MAINNET_RPC_URL]);
  });

  it("builds chain-aware URLs except in local-node mode", () => {
    expect(getChainRpcUrl("https://rpc.ubq.fi/", 1, false)).toBe("https://rpc.ubq.fi/1");
    expect(getChainRpcUrl("http://localhost:8545/", 31337, true)).toBe("http://localhost:8545");
  });

  it("validates absolute and relative HTTP RPC URLs", () => {
    expect(isValidRpcUrl("https://rpc.ubq.fi")).toBe(true);
    expect(isValidRpcUrl("/rpc", "https://stake.ubq.fi")).toBe(true);
    expect(isValidRpcUrl("ftp://rpc.ubq.fi")).toBe(false);
  });
});
