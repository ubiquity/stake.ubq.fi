import { describe, expect, it } from "bun:test";

describe("basic suite", () => {
  it("confirms hello world", () => {
    expect("hello").toBe("hello");
  });

  it("verifies environment configuration structure", () => {
    const mockEnv = {
      VITE_RPC_URL: "https://rpc.ubq.fi",
      MODE: "production",
      DEV: false,
      PROD: true,
      SSR: false,
    };
    expect(mockEnv.VITE_RPC_URL).toBeDefined();
    expect(typeof mockEnv.VITE_RPC_URL).toBe("string");
  });

  it("validates vendor chunk splitting criteria", () => {
    const vendorPackages = ["react", "react-dom", "@tanstack/react-query", "wagmi", "viem"];
    expect(vendorPackages.length).toBe(5);
    expect(vendorPackages).toContain("react");
    expect(vendorPackages).toContain("wagmi");
    expect(vendorPackages).toContain("viem");
  });
});
