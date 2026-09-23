/**
 * Toast System Unit Tests
 * Tests for toast logic and reducer behavior
 */

import { describe, it, expect } from "bun:test";
import { toastReducer } from "../src/ui/toast/ToastProvider";
import { TOAST_CONFIG } from "../src/ui/toast/constants";
import type { Toast, ToastVariant } from "../src/ui/toast/types";

// Test state interface matching the reducer
interface TestToastState {
  toasts: Toast[];
  lastToast: { message: string; timestamp: number } | null;
}

describe("toast reducer logic", () => {
  it("should add a new toast", () => {
    const initialState: TestToastState = { toasts: [], lastToast: null };
    const action = {
      type: "ADD" as const,
      payload: {
        id: "test-1",
        message: "Test message",
        variant: "success" as ToastVariant,
        duration: 5000,
        timestamp: Date.now(),
      },
    };

    const newState = toastReducer(initialState, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].message).toBe("Test message");
    expect(newState.lastToast?.message).toBe("Test message");
  });

  it("should filter toasts by id on dismiss", () => {
    const state: TestToastState = {
      toasts: [
        { id: "1", message: "Toast 1", variant: "info" as ToastVariant, duration: 5000, timestamp: Date.now() },
        { id: "2", message: "Toast 2", variant: "success" as ToastVariant, duration: 5000, timestamp: Date.now() },
      ],
      lastToast: null,
    };
    const action = { type: "DISMISS" as const, payload: "1" };

    const newState = toastReducer(state, action);

    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0].id).toBe("2");
  });

  it("should clear all toasts", () => {
    const state: TestToastState = {
      toasts: [{ id: "1", message: "Toast", variant: "info" as ToastVariant, duration: 5000, timestamp: Date.now() }],
      lastToast: { message: "Toast", timestamp: Date.now() },
    };
    const action = { type: "CLEAR" as const };

    const newState = toastReducer(state, action);

    expect(newState.toasts).toHaveLength(0);
    expect(newState.lastToast).toBeNull();
  });

  it("should limit toasts to max visible", () => {
    const initialState: TestToastState = { toasts: [], lastToast: null };
    const now = Date.now();

    let state = initialState;
    for (let i = 1; i <= 5; i++) {
      const action = {
        type: "ADD" as const,
        payload: { id: String(i), message: `Toast ${i}`, variant: "info" as ToastVariant, duration: 5000, timestamp: now + i },
      };
      state = toastReducer(state, action);
    }

    expect(state.toasts).toHaveLength(TOAST_CONFIG.maxVisible);
    expect(state.toasts[0]?.id).toBe("3");
  });

  it("should deduplicate within window when message matches", () => {
    const now = Date.now();
    const state: TestToastState = {
      toasts: [{ id: "1", message: "Same message", variant: "info" as ToastVariant, duration: 5000, timestamp: now - 1000 }],
      lastToast: { message: "Same message", timestamp: now - 1000 },
    };
    const action = {
      type: "ADD" as const,
      payload: { id: "2", message: "Same message", variant: "info" as ToastVariant, duration: 5000, timestamp: now },
    };

    const newState = toastReducer(state, action);

    // Should not add duplicate
    expect(newState.toasts).toHaveLength(1);
    expect(newState.toasts[0]?.id).toBe("1");
  });

  it("should allow different messages within window", () => {
    const now = Date.now();
    const state: TestToastState = {
      toasts: [{ id: "1", message: "Message 1", variant: "info" as ToastVariant, duration: 5000, timestamp: now - 1000 }],
      lastToast: { message: "Message 1", timestamp: now - 1000 },
    };
    const action = {
      type: "ADD" as const,
      payload: { id: "2", message: "Message 2", variant: "info" as ToastVariant, duration: 5000, timestamp: now },
    };

    const newState = toastReducer(state, action);

    // Should add different message
    expect(newState.toasts).toHaveLength(2);
    expect(newState.toasts[1]?.message).toBe("Message 2");
  });

  it("should allow same message outside dedup window", () => {
    const now = Date.now();
    const state: TestToastState = {
      toasts: [{ id: "1", message: "Same message", variant: "info" as ToastVariant, duration: 5000, timestamp: now - 3000 }],
      lastToast: { message: "Same message", timestamp: now - 3000 },
    };
    const action = {
      type: "ADD" as const,
      payload: { id: "2", message: "Same message", variant: "info" as ToastVariant, duration: 5000, timestamp: now },
    };

    const newState = toastReducer(state, action);

    // Should add since outside dedup window
    expect(newState.toasts).toHaveLength(2);
  });
});

describe("toast configuration", () => {
  it("should have correct default duration", () => {
    expect(TOAST_CONFIG.defaultDuration).toBe(5000);
  });

  it("should have correct dedup window", () => {
    expect(TOAST_CONFIG.dedupWindow).toBe(2000);
  });

  it("should have correct max visible", () => {
    expect(TOAST_CONFIG.maxVisible).toBe(3);
  });
});

describe("toast variants", () => {
  it("should accept info variant", () => {
    const toast: Toast = {
      id: "1",
      message: "Test",
      variant: "info",
      duration: 5000,
      timestamp: Date.now(),
    };
    expect(toast.variant).toBe("info");
  });

  it("should accept success variant", () => {
    const toast: Toast = {
      id: "1",
      message: "Test",
      variant: "success",
      duration: 5000,
      timestamp: Date.now(),
    };
    expect(toast.variant).toBe("success");
  });

  it("should accept error variant", () => {
    const toast: Toast = {
      id: "1",
      message: "Test",
      variant: "error",
      duration: 5000,
      timestamp: Date.now(),
    };
    expect(toast.variant).toBe("error");
  });
});

describe("toast id generation", () => {
  it("should generate unique ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(crypto.randomUUID());
    }
    expect(ids.size).toBe(100);
  });

  it("should generate string ids", () => {
    const id = crypto.randomUUID();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(36); // UUID format
  });
});

describe("toast message formatting", () => {
  it("should handle base error messages", () => {
    const formatError = (error: { shortMessage?: string; message?: string }) => {
      return error.shortMessage || error.message || "An unknown error occurred";
    };

    expect(formatError({ shortMessage: "User rejected request" })).toBe("User rejected request");
    expect(formatError({ message: "Connection timeout" })).toBe("Connection timeout");
    expect(formatError({})).toBe("An unknown error occurred");
  });

  it("should handle generic errors", () => {
    const formatError = (error: Error | unknown) => {
      return error instanceof Error ? error.message : "An unknown error occurred";
    };

    expect(formatError(new Error("Custom error"))).toBe("Custom error");
    expect(formatError(null)).toBe("An unknown error occurred");
  });
});
