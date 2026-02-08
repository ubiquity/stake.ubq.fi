/**
 * Toast System Types
 * Minimal toast types for error/success handling
 */

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number; // 0 = persistent
  timestamp: number;
}

export interface ToastConfig {
  defaultDuration: number; // 5000ms
  dedupWindow: number; // 2000ms
  maxVisible: number; // 3 toasts
}

export interface ToastContextValue {
  toasts: ReadonlyArray<Toast>;
  toast: (message: string, variant?: ToastVariant, duration?: number) => string | null;
  dismiss: (id: string) => void;
  clear: () => void;
}

export type ToastAction =
  | { type: "ADD"; payload: Toast }
  | { type: "DISMISS"; payload: string }
  | { type: "CLEAR" };
