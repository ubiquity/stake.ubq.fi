/**
 * Status Toast Bridge
 * Mirrors the existing status-message context into toasts.
 * The inline status display in the dashboard stays authoritative; toasts add a
 * transient notification without changing wallet, RPC or message semantics.
 */

import { useEffect, useRef } from "react";
import { useStatusMessageState } from "../../context/status-message";
import { useToast } from "./ToastProvider";

export function StatusToastBridge() {
  const { successMessage, errorMessage } = useStatusMessageState();
  const { toast } = useToast();
  // A status message stays set until it is replaced or cleared, so remember what
  // was already surfaced to avoid re-emitting it on unrelated provider re-renders.
  const emitted = useRef<{ success: string | null; error: string | null }>({ success: null, error: null });

  useEffect(() => {
    if (!errorMessage) {
      emitted.current.error = null;
      return;
    }
    if (emitted.current.error === errorMessage) {
      return;
    }
    emitted.current.error = errorMessage;
    // Errors stay until dismissed, matching the donor wiring for transaction failures.
    toast(errorMessage, "error", 0);
  }, [errorMessage, toast]);

  useEffect(() => {
    if (!successMessage) {
      emitted.current.success = null;
      return;
    }
    if (emitted.current.success === successMessage) {
      return;
    }
    emitted.current.success = successMessage;
    toast(successMessage, "success");
  }, [successMessage, toast]);

  return null;
}
