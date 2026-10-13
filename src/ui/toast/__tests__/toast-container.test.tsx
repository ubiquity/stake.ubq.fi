import { describe, expect, it } from "bun:test";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastContainer, ToastProvider, useToast } from "../index";

function ToastHarness() {
  const { toast } = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast("Persistent failure", "error", 0)}>
        Add persistent
      </button>
      <button type="button" onClick={() => toast("Transient notice", "info", 40)}>
        Add transient
      </button>
      <button type="button" onClick={() => toast("Duplicate notice", "info")}>
        Add duplicate
      </button>
      <ToastContainer />
    </div>
  );
}

function renderHarness() {
  render(
    <ToastProvider>
      <ToastHarness />
    </ToastProvider>
  );
}

describe("ToastContainer portal", () => {
  it("renders toasts into a portal on document.body with variant class and role", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Add persistent" }));

    const message = await screen.findByText("Persistent failure");
    const portal = document.getElementById("toast-portal");
    const toast = message.closest(".toast");

    expect(portal).not.toBeNull();
    expect(portal?.parentElement).toBe(document.body);
    expect(portal?.getAttribute("aria-live")).toBe("polite");
    expect(toast?.className).toContain("toast-error");
    expect(toast?.getAttribute("role")).toBe("alert");
  });

  it("auto-dismisses a timed toast and keeps a persistent toast visible", async () => {
    renderHarness();

    fireEvent.click(screen.getByRole("button", { name: "Add persistent" }));
    fireEvent.click(screen.getByRole("button", { name: "Add transient" }));

    expect(await screen.findByText("Transient notice")).not.toBeNull();

    // The provider schedules dismissal from the toast timestamp, so let real time pass inside act.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(screen.queryByText("Transient notice")).toBeNull();
    expect(screen.queryByText("Persistent failure")).not.toBeNull();
  });

  it("deduplicates a repeated message inside the dedup window", async () => {
    renderHarness();

    const duplicateButton = screen.getByRole("button", { name: "Add duplicate" });
    fireEvent.click(duplicateButton);
    fireEvent.click(duplicateButton);

    await waitFor(() => {
      expect(screen.getAllByText("Duplicate notice")).toHaveLength(1);
    });
  });
});
