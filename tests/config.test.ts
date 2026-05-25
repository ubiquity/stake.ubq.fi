import { afterEach, describe, expect, it, mock } from "bun:test";

import { getDefaultRpcUrl, isDenoDeployHost, isValidRpcUrl, resolveRpcConfig } from "../src/constants/config";

const warnSpy = mock(() => {});

afterEach(() => {
  warnSpy.mockReset();
});

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

describe("isValidRpcUrl", () => {
  it("accepts https and relative rpc URLs", () => {
    expect(isValidRpcUrl("https://rpc.ubq.fi")).toBe(true);
    expect(isValidRpcUrl("http://localhost:8545")).toBe(true);
    expect(isValidRpcUrl("/rpc")).toBe(true);
  });

  it("rejects malformed values", () => {
    expect(isValidRpcUrl("ftp://rpc.ubq.fi")).toBe(false);
    expect(isValidRpcUrl("not-a-url")).toBe(false);
    expect(isValidRpcUrl("")).toBe(false);
  });
});

describe("resolveRpcConfig", () => {
  it("falls back in dev mode when VITE_RPC_URL is invalid", () => {
    const originalWarn = console.warn;
    console.warn = warnSpy;
    try {
      const result = resolveRpcConfig({
        mode: "dev",
        hostname: "localhost",
        origin: "http://localhost:5173",
        envRpcUrl: "this-is-invalid",
      });

      expect(result.rpcUrl).toBe("https://rpc.ubq.fi");
      expect(result.fallbackRpcUrls).toContain("https://rpc.ubq.fi");
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      console.warn = originalWarn;
    }
  });

  it("uses localhost rpc in local-node mode", () => {
    const result = resolveRpcConfig({
      mode: "local-node",
      hostname: "localhost",
      origin: "http://localhost:5173",
    });

    expect(result.rpcUrl).toBe("http://localhost:8545");
    expect(result.fallbackRpcUrls).toEqual(["http://localhost:8545"]);
  });

  it("uses /rpc in prod mode when env value is not set", () => {
    const result = resolveRpcConfig({
      mode: "prod",
      hostname: "stake.ubq.fi",
      origin: "https://stake.ubq.fi",
    });

    expect(getDefaultRpcUrl("prod", "https://stake.ubq.fi", "stake.ubq.fi")).toBe("https://stake.ubq.fi/rpc");
    expect(result.rpcUrl).toBe("https://stake.ubq.fi/rpc");
  });
});
