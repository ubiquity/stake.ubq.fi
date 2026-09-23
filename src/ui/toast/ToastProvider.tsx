/**
 * Toast Provider
 * React Context provider for toast system with deduplication and auto-dismiss
 */

import { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from "react";
import type { Toast, ToastContextValue, ToastVariant, ToastAction } from "./types";
import { TOAST_CONFIG } from "./constants";

interface ToastState {
  toasts: Toast[];
  lastToast: { message: string; timestamp: number } | null;
}


const ToastContext = createContext<ToastContextValue | null>(null);

export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD": {
      // Prevent duplicate toasts within dedup window
      if (state.lastToast && state.lastToast.message === action.payload.message) {
        const timeSinceLast = Date.now() - state.lastToast.timestamp;
        if (timeSinceLast < TOAST_CONFIG.dedupWindow) {
          return state;
        }
      }

      const newState = {
        toasts: [...state.toasts, action.payload].slice(-TOAST_CONFIG.maxVisible),
        lastToast: { message: action.payload.message, timestamp: action.payload.timestamp },
      };
      return newState;
    }
    case "DISMISS": {
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    }
    case "CLEAR": {
      return { toasts: [], lastToast: null };
    }
    default:
      return state;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [], lastToast: null });

  const toast = useCallback((message: string, variant: ToastVariant = "info", duration?: number): string | null => {
    // Check for deduplication before creating a new toast
    if (state.lastToast && state.lastToast.message === message) {
      const timeSinceLast = Date.now() - state.lastToast.timestamp;
      if (timeSinceLast < TOAST_CONFIG.dedupWindow) {
        // Find and return the existing toast's id
        const existingToast = state.toasts.find(t => t.message === message);
        return existingToast?.id ?? null;
      }
    }

    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      message,
      variant,
      duration: duration ?? TOAST_CONFIG.defaultDuration,
      timestamp: Date.now(),
    };
    dispatch({ type: "ADD", payload: newToast });
    return id;
  }, [state.toasts, state.lastToast]);

  const dismiss = useCallback((id: string) => {
    dispatch({ type: "DISMISS", payload: id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  // Auto-dismiss non-persistent toasts
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    state.toasts.forEach((t) => {
      if (t.duration > 0) {
        const elapsed = Date.now() - t.timestamp;
        const remaining = Math.max(t.duration - elapsed, 0);
        const timer = setTimeout(() => {
          dismiss(t.id);
        }, remaining);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [state.toasts, dismiss]);

  const contextValue: ToastContextValue = {
    toasts: state.toasts,
    toast,
    dismiss,
    clear,
  };

  return <ToastContext.Provider value={contextValue}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
