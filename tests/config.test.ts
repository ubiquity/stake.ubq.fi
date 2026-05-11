import { describe, expect, it } from "bun:test";

import { isDenoDeployHost, isValidHttpUrl, getHealthyRpcUrl } from "../src/constants/config";
import type { RpcHealthResult } from "../src/utils/rpc-health";

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

describe("isValidHttpUrl", () => {
  it("accepts HTTP URLs", () => {
    expect(isValidHttpUrl("http://localhost:8545")).toBe(true);
    expect(isValidHttpUrl("https://rpc.ubq.fi")).toBe(true);
  });

  it("accepts HTTPS URLs with paths", () => {
    expect(isValidHttpUrl("https://rpc.ubq.fi/v1")).toBe(true);
  });

  it("rejects non-HTTP protocols", () => {
    expect(isValidHttpUrl("ftp://rpc.ubq.fi")).toBe(false);
    expect(isValidHttpUrl("ws://rpc.ubq.fi")).toBe(false);
  });

  it("rejects malformed URLs", () => {
    expect(isValidHttpUrl("not-a-url")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});

describe("getHealthyRpcUrl", () => {
  it("returns primary when healthy", async () => {
    const checkHealth = async (): Promise<RpcHealthResult> => ({
      healthy: true,
      chainId: 1n,
      latencyMs: 100,
    });
    const result = await getHealthyRpcUrl("https://primary.example.com", [], 1500, checkHealth);
    expect(result.url).toBe("https://primary.example.com");
    expect(result.health.healthy).toBe(true);
  });

  it("falls back when primary is unhealthy", async () => {
    let calls = 0;
    const checkHealth = async (url: string): Promise<RpcHealthResult> => {
      calls++;
      if (url === "https://primary.example.com") {
        return { healthy: false, chainId: null, error: "DOWN" };
      }
      return { healthy: true, chainId: 1n, latencyMs: 100 };
    };
    const result = await getHealthyRpcUrl(
      "https://primary.example.com",
      ["https://fallback.example.com"],
      1500,
      checkHealth
    );
    expect(result.url).toBe("https://fallback.example.com");
    expect(calls).toBe(2);
  });

  it("returns primary when all fallbacks fail", async () => {
    const checkHealth = async (): Promise<RpcHealthResult> => ({
      healthy: false,
      chainId: null,
      error: "DOWN",
    });
    const result = await getHealthyRpcUrl(
      "https://primary.example.com",
      ["https://fallback.example.com"],
      1500,
      checkHealth
    );
    expect(result.url).toBe("https://primary.example.com");
    expect(result.health.healthy).toBe(false);
  });

  it("skips duplicate fallback equal to primary", async () => {
    let calls = 0;
    const checkHealth = async (): Promise<RpcHealthResult> => {
      calls++;
      return { healthy: false, chainId: null, error: "DOWN" };
    };
    await getHealthyRpcUrl(
      "https://same.example.com",
      ["https://same.example.com"],
      1500,
      checkHealth
    );
    expect(calls).toBe(1);
  });
});
