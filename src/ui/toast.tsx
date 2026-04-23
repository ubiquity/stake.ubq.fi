import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ToastVariant = "info" | "success" | "error";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  persistent?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (variant: ToastVariant, message: string, options?: { persistent?: boolean }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, options?: { persistent?: boolean }) => {
      // Collapse duplicates: remove existing toast with same variant+message
      const duplicateKey = `${variant}:${message}`;
      setToasts((prev) => {
        const filtered = prev.filter((t) => `${t.variant}:${t.message}` !== duplicateKey);
        const id = `toast-${++toastCounter}`;
        const toast: Toast = { id, variant, message, persistent: options?.persistent };

        // Auto-dismiss after 5s unless persistent or critical error
        if (!toast.persistent) {
          const dismissMs = variant === "error" ? 6000 : 5000;
          const timer = setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
            timersRef.current.delete(id);
          }, dismissMs);
          timersRef.current.set(id, timer);
        }

        return [...filtered, toast];
      });
    },
    [removeToast]
  );

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div id="toast-container" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`} onClick={() => !toast.persistent && onDismiss(toast.id)}>
          <span className="toast-icon">{iconForVariant(toast.variant)}</span>
          <span className="toast-message">{toast.message}</span>
          {!toast.persistent && (
            <button className="toast-close" onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }} aria-label="Dismiss">
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function iconForVariant(variant: ToastVariant): string {
  switch (variant) {
    case "success":
      return "✓";
    case "error":
      return "⚠";
    case "info":
    default:
      return "ℹ";
  }
}
