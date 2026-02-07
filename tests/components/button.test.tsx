import { describe, it, expect } from "bun:test";

// Simple Button tests - verify component can be imported
describe("Button component", () => {
  it("should be importable", async () => {
    const { Button } = await import("../../src/components/button");
    expect(Button).toBeDefined();
  });
});
