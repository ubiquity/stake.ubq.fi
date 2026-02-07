import { describe, it, expect } from "bun:test";

// Simple PoolDisplay tests - verify component can be imported
describe("PoolDisplay component", () => {
  it("should be importable", async () => {
    const { PoolDisplay } = await import("../../src/components/pool-display");
    expect(PoolDisplay).toBeDefined();
  });
});
