import { describe, expect, it } from "bun:test";
import { resolveRpcBaseUrl, validateRpcUrl } from "../src/constants/config";

describe("validateRpcUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(validateRpcUrl("https://rpc.ubq.fi")).toBe("https://rpc.ubq.fi");
    expect(validateRpcUrl("http://localhost:8545/")).toBe("http://localhost:8545");
  });

  it("rejects non-http(s) URLs and invalid strings", () => {
    expect(validateRpcUrl("")).toBeNull();
    expect(validateRpcUrl("not a url")).toBeNull();
    expect(validateRpcUrl("ws://example.com")).toBeNull();
    expect(validateRpcUrl("/rpc")).toBeNull();
  });
});

describe("resolveRpcBaseUrl", () => {
  it("uses env URL when valid", () => {
    const res = resolveRpcBaseUrl({
      mode: "dev",
      viteRpcUrl: "https://example.com/rpc",
      hostname: "localhost",
      origin: "http://localhost:5173",
    });
    expect(res.source).toBe("env");
    expect(res.rpcBaseUrl).toBe("https://example.com/rpc");
    expect(res.fallbacks[0]).toBe("https://example.com/rpc");
  });

  it("defaults to rpc.ubq.fi in dev", () => {
    const res = resolveRpcBaseUrl({
      mode: "dev",
      hostname: "localhost",
      origin: "http://localhost:5173",
    });
    expect(res.source).toBe("default");
    expect(res.rpcBaseUrl).toBe("https://rpc.ubq.fi");
  });

  it("defaults to /rpc (origin) in prod", () => {
    const res = resolveRpcBaseUrl({
      mode: "prod",
      hostname: "stake.ubq.fi",
      origin: "https://stake.ubq.fi",
    });
    expect(res.source).toBe("default");
    expect(res.rpcBaseUrl).toBe("https://stake.ubq.fi/rpc");
  });
});

