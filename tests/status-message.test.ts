import { describe, expect, it } from "bun:test";
import { receiptOutcomeAction, statusMessageReducer } from "../src/context/status-message";

type StatusMessage = { successMessage: string | null; errorMessage: string | null };

const initial: StatusMessage = { successMessage: null, errorMessage: null };

const apply = (state: StatusMessage, action: Parameters<typeof statusMessageReducer>[1]): StatusMessage => statusMessageReducer(state, action);

describe("receiptOutcomeAction", () => {
  it("reports a reverted receipt on the error channel", () => {
    const action = receiptOutcomeAction("reverted", "Staked and claimed rewards successfully");
    expect(action.type).toBe("setError");
    expect((action as { message: string }).message).toBe("Transaction reverted");
  });

  it("keeps a confirmed receipt on the success channel", () => {
    const action = receiptOutcomeAction("success", "Staked and claimed rewards successfully");
    expect(action.type).toBe("setSuccess");
    expect((action as { message: string }).message).toBe("Staked and claimed rewards successfully");
  });

  it("falls back to the generic confirmation message", () => {
    const action = receiptOutcomeAction("success");
    expect(action.type).toBe("setSuccess");
    expect((action as { message: string }).message).toBe("Transaction confirmed");
  });
});

describe("revert, clear, then next pending action", () => {
  it("leaves no stale revert notice after the status clears", () => {
    // 1. The staking action starts: the status channel is cleared before the write.
    let state = apply(initial, { type: "clear" });
    expect(state).toEqual({ successMessage: null, errorMessage: null });

    // 2. The transaction reverts; the revert is reported on the error channel.
    state = apply(state, receiptOutcomeAction("reverted"));
    expect(state.successMessage).toBeNull();
    expect(state.errorMessage).toBe("Transaction reverted");

    // 3. The next staking action clears the status again; nothing stale survives.
    state = apply(state, { type: "clear" });
    expect(state).toEqual({ successMessage: null, errorMessage: null });
  });

  it("shows only the new outcome after revert -> clear -> next confirmed action", () => {
    let state = apply(initial, receiptOutcomeAction("reverted"));
    state = apply(state, { type: "clear" });
    // The next action is pending (channel cleared), then confirms.
    state = apply(state, receiptOutcomeAction("success", "Staked and claimed rewards successfully"));
    expect(state.successMessage).toBe("Staked and claimed rewards successfully");
    expect(state.errorMessage).toBeNull();
  });

  it("a successful receipt on the success channel cannot re-surface after a clear", () => {
    let state = apply(initial, receiptOutcomeAction("success", "Claimed rewards successfully"));
    expect(state.successMessage).toBe("Claimed rewards successfully");
    state = apply(state, { type: "clear" });
    expect(state).toEqual({ successMessage: null, errorMessage: null });
  });
});
