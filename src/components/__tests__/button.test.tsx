import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";

import { Button } from "../button";

describe("Button", () => {
  it("renders children and preserves button props", () => {
    render(
      <Button className="action-button" type="button" disabled>
        Stake
      </Button>
    );

    const button = screen.getByRole("button", { name: "Stake" }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.className).toContain("action-button");
    expect(button.type).toBe("button");
  });

  it("shows loading text and disables interaction while loading", () => {
    render(
      <Button isLoading isLoadingText="Approving..." type="button">
        Approve
      </Button>
    );

    const button = screen.getByRole("button", { name: "Approving..." }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("Approving...");
    expect(button.querySelector(".button-spinner")).toBeTruthy();
  });
});
