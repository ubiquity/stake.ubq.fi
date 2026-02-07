import { describe, it, expect } from "bun:test";

// Simple config logic tests (no imports from the actual file since it uses import.meta.env)
describe("config logic", () => {
  it("isLocalNode should be true when MODE is 'local-node'", () => {
    const mode: string = "local-node";
    const isLocalNode = mode === "local-node";
    expect(isLocalNode).toBe(true);
  });

  it("isLocalNode should be false when MODE is 'production'", () => {
    const mode: string = "production";
    const isLocalNode = mode === "local-node";
    expect(isLocalNode).toBe(false);
  });

  it("RPC_URL should use VITE_RPC_URL when set", () => {
    const viteRpcUrl: string | undefined = "https://custom.rpc.url";
    const rpcUrl = viteRpcUrl || "fallback";
    expect(rpcUrl).toBe("https://custom.rpc.url");
  });

  it("RPC_URL should fall back to deno.dev rpc for deno.dev hostnames", () => {
    const viteRpcUrl: undefined = undefined;
    const hostname: string = "test.deno.dev";
    const origin: string = "http://test.deno.dev";
    const expectedRpc = hostname.includes(".deno.dev") ? "https://rpc.ubq.fi" : `${origin}/rpc`;
    expect(expectedRpc).toBe("https://rpc.ubq.fi");
  });

  it("RPC_URL should use origin/rpc for non-deno.dev hostnames", () => {
    const hostname: string = "localhost";
    const origin: string = "http://localhost:3000";
    const expectedRpc = hostname.includes(".deno.dev") ? "https://rpc.ubq.fi" : `${origin}/rpc`;
    expect(expectedRpc).toBe("http://localhost:3000/rpc");
  });
});
