import { describe, expect, it } from "bun:test";
import { act, render, screen, waitFor } from "@testing-library/react";
import { StatusMessageProvider, useStatusMessageDispatch } from "../src/context/status-message";
import { StatusToastBridge, ToastContainer, ToastProvider } from "../src/ui/toast/index";

type Dispatch = ReturnType<typeof useStatusMessageDispatch>;

let dispatch: Dispatch | undefined;

function DispatchProbe() {
  dispatch = useStatusMessageDispatch();
  return null;
}

function renderBridge() {
  render(
    <ToastProvider>
      <StatusMessageProvider>
        <DispatchProbe />
        <StatusToastBridge />
        <ToastContainer />
      </StatusMessageProvider>
    </ToastProvider>
  );
}

const toastElement = (message: string) => screen.getByText(message).closest(".toast");

describe("StatusToastBridge severity", () => {
  it("renders a reverted receipt from the success channel as a red alert", async () => {
    renderBridge();

    await act(async () => {
      dispatch?.({ type: "setSuccess", message: "Transaction reverted" });
    });

    await waitFor(() => {
      const toast = toastElement("Transaction reverted");
      expect(toast?.className).toContain("toast-error");
      expect(toast?.getAttribute("role")).toBe("alert");
    });
  });

  it("keeps a confirmed success green", async () => {
    renderBridge();

    await act(async () => {
      dispatch?.({ type: "setSuccess", message: "Staked and claimed rewards successfully" });
    });

    await waitFor(() => {
      const toast = toastElement("Staked and claimed rewards successfully");
      expect(toast?.className).toContain("toast-success");
      expect(toast?.getAttribute("role")).toBe("status");
    });
  });
});

describe("StatusToastBridge recovery", () => {
  it("dismisses the persistent error toast once a success arrives", async () => {
    renderBridge();

    await act(async () => {
      dispatch?.({ type: "setError", message: "Transaction failed" });
    });
    expect(await screen.findByText("Transaction failed")).not.toBeNull();

    await act(async () => {
      dispatch?.({ type: "setSuccess", message: "Claimed rewards successfully" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Transaction failed")).toBeNull();
    });
    expect(screen.queryByText("Claimed rewards successfully")).not.toBeNull();
  });

  it("dismisses the persistent error toast when the status channel clears", async () => {
    renderBridge();

    await act(async () => {
      dispatch?.({ type: "setError", message: "User rejected the request" });
    });
    expect(await screen.findByText("User rejected the request")).not.toBeNull();

    await act(async () => {
      dispatch?.({ type: "clear" });
    });

    await waitFor(() => {
      expect(screen.queryByText("User rejected the request")).toBeNull();
    });
  });

  it("supersedes an older failure toast with the newest one", async () => {
    renderBridge();

    await act(async () => {
      dispatch?.({ type: "setSuccess", message: "Transaction reverted" });
    });
    expect(await screen.findByText("Transaction reverted")).not.toBeNull();

    await act(async () => {
      dispatch?.({ type: "setError", message: "User rejected the request" });
    });

    await waitFor(() => {
      expect(screen.queryByText("Transaction reverted")).toBeNull();
    });
    expect(screen.queryByText("User rejected the request")).not.toBeNull();
  });
});
