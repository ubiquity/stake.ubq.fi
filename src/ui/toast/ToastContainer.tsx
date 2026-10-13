/**
 * Toast Container
 * Portal-based container for rendering toasts at document body level
 */

import { createPortal } from "react-dom";
import { useToast } from "./ToastProvider";
import type { ToastVariant } from "./types";

const ICONS: Record<ToastVariant, string> = {
  info: "ℹ",
  success: "✓",
  error: "✕",
};

interface ToastItemProps {
  toast: {
    id: string;
    message: string;
    variant: ToastVariant;
  };
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  return (
    <div
      className={`toast toast-${toast.variant}`}
      onClick={() => onDismiss(toast.id)}
      role={toast.variant === "error" ? "alert" : "status"}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onDismiss(toast.id);
        }
      }}
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.variant]}
      </span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  // Don't render anything during SSR
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div id="toast-portal" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>,
    document.body
  );
}
