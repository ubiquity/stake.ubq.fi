import { describe, expect, it } from "bun:test";
import { isDenoDeployHost, resolveRpcConfig } from "../src/constants/config";

describe("resolveRpcConfig", () => {
  it("keeps local-node RPC raw and disables chain suffixing", () => {
    const config = resolveRpcConfig("local-node", undefined, "localhost", "http://localhost:5173");

    expect(config.url).toBe("http://localhost:8545");
    expect(config.fallbacks).toEqual([]);
    expect(config.shouldAppendChainId).toBe(false);
  });

  it("uses valid VITE_RPC_URL with public fallback in dev mode", () => {
    const config = resolveRpcConfig("dev", "https://rpc.example.com", "localhost", "http://localhost:5173");

    expect(config.url).toBe("https://rpc.example.com");
    expect(config.fallbacks).toEqual(["https://rpc.ubq.fi"]);
    expect(config.shouldAppendChainId).toBe(true);
    expect(config.warnings).toEqual([]);
  });

  it("falls back with a warning for invalid VITE_RPC_URL", () => {
    const config = resolveRpcConfig("dev", "not a url", "localhost", "http://localhost:5173");

    expect(config.url).toBe("https://rpc.ubq.fi");
    expect(config.warnings[0]).toContain("Invalid VITE_RPC_URL");
  });

  it("uses relative production RPC outside Deno preview", () => {
    const config = resolveRpcConfig("prod", undefined, "stake.ubq.fi", "https://stake.ubq.fi");

    expect(config.url).toBe("https://stake.ubq.fi/rpc");
    expect(config.fallbacks).toEqual(["https://rpc.ubq.fi"]);
  });

  it("uses public RPC for Deno deploy hosts", () => {
    expect(isDenoDeployHost("preview.deno.dev")).toBe(true);
    expect(isDenoDeployHost("preview.deno.net")).toBe(true);
    expect(resolveRpcConfig("prod", undefined, "preview.deno.net", "https://preview.deno.net").url).toBe(
      "https://rpc.ubq.fi"
    );
  });
});
