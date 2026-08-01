import { describe, expect, it } from "bun:test";

import { isDenoDeployHost, isLocalNodeMode, resolveRpcUrl } from "../config";

describe("config resolution", () => {
  it("detects local-node mode from Vite mode", () => {
    expect(isLocalNodeMode("local-node")).toBe(true);
    expect(isLocalNodeMode("development")).toBe(false);
    expect(isLocalNodeMode("production")).toBe(false);
  });

  it("detects Deno Deploy preview hostnames", () => {
    expect(isDenoDeployHost("stake-ubq-fi.deno.dev")).toBe(true);
    expect(isDenoDeployHost("p-stake-ubq-fi.ubiquity-dao.deno.net")).toBe(true);
    expect(isDenoDeployHost("stake.ubq.fi")).toBe(false);
    expect(isDenoDeployHost("localhost")).toBe(false);
  });

  it("prefers VITE_RPC_URL over location-derived defaults", () => {
    expect(
      resolveRpcUrl({
        viteRpcUrl: "https://custom.rpc",
        hostname: "stake.ubq.fi",
        origin: "https://stake.ubq.fi",
      })
    ).toBe("https://custom.rpc");
  });

  it("uses the shared RPC endpoint for Deno Deploy hosts", () => {
    expect(
      resolveRpcUrl({
        hostname: "preview.deno.dev",
        origin: "https://preview.deno.dev",
      })
    ).toBe("https://rpc.ubq.fi");
  });

  it("falls back to the current origin proxy outside Deno Deploy", () => {
    expect(
      resolveRpcUrl({
        hostname: "stake.ubq.fi",
        origin: "https://stake.ubq.fi",
      })
    ).toBe("https://stake.ubq.fi/rpc");
  });
});
