import { describe, expect, it } from "bun:test";

import { getRpcUrlForChain, isDenoDeployHost, resolveRpcBaseUrl, validateRpcUrl } from "../src/constants/config";

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

describe("validateRpcUrl", () => {
  it("accepts absolute http(s) URLs and relative paths", () => {
    expect(validateRpcUrl("https://rpc.ubq.fi").valid).toBe(true);
    expect(validateRpcUrl("http://localhost:8545").valid).toBe(true);
    expect(validateRpcUrl("/rpc").valid).toBe(true);
  });

  it("rejects malformed and unsupported URLs", () => {
    expect(validateRpcUrl("not a url").valid).toBe(false);
    expect(validateRpcUrl("ftp://example.com").valid).toBe(false);
    expect(validateRpcUrl("").valid).toBe(false);
  });
});

describe("resolveRpcBaseUrl", () => {
  it("uses valid VITE_RPC_URL when provided", () => {
    expect(resolveRpcBaseUrl({ envRpcUrl: "https://example.com/rpc", hostname: "localhost", origin: "http://localhost:5173" })).toBe("https://example.com/rpc");
  });

  it("falls back to Deno Deploy RPC when env URL is invalid", () => {
    expect(resolveRpcBaseUrl({ envRpcUrl: "bad url", hostname: "preview.deno.dev", origin: "https://preview.deno.dev" })).toBe("https://rpc.ubq.fi");
  });

  it("uses localhost RPC in local-node mode without needing env", () => {
    expect(resolveRpcBaseUrl({ hostname: "localhost", origin: "http://localhost:5173", localNode: true })).toBe("http://localhost:8545");
  });
});

describe("getRpcUrlForChain", () => {
  it("appends chain id outside local-node mode", () => {
    expect(getRpcUrlForChain("https://rpc.ubq.fi/", 1, false)).toBe("https://rpc.ubq.fi/1");
  });

  it("does not append chain id in local-node mode", () => {
    expect(getRpcUrlForChain("http://localhost:8545", 31337, true)).toBe("http://localhost:8545");
  });
});
