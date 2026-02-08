/**
 * Toast System Constants
 * Configuration for toast behavior
 */

import type { ToastConfig } from "./types";

export const TOAST_CONFIG: ToastConfig = {
  defaultDuration: 5000, // 5 seconds
  dedupWindow: 2000, // 2 seconds - prevent rapid duplicate toasts
  maxVisible: 3, // Maximum visible toasts at once
};

export const TOAST_VARIANTS = {
  info: "info",
  success: "success",
  error: "error",
} as const;
