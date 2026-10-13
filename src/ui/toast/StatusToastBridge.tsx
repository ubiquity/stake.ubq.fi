/**
 * Status Toast Bridge
 * Mirrors the existing status-message context into toasts.
 * The inline status display in the dashboard stays authoritative; toasts add a
 * transient notification without changing wallet, RPC or message semantics.
 */

import { useEffect, useRef } from "react";
import { useStatusMessageState } from "../../context/status-message";
import { useToast } from "./ToastProvider";

/**
 * Status-channel messages that describe a failed on-chain outcome. The status context
 * only carries text, so severity has to come from the message the staking hook set; a
 * reverted receipt arrives on the success channel and must not render as a green toast.
 */
const FAILURE_OUTCOME_PATTERN = /\b(revert(ed|ing)?|failed|failure|error)\b/i;

export const isFailureOutcomeMessage = (message: string): boolean => FAILURE_OUTCOME_PATTERN.test(message);

export function StatusToastBridge() {
  const { successMessage, errorMessage } = useStatusMessageState();
  const { toast, dismiss } = useToast();
  // A status message stays set until it is replaced or cleared, so remember what
  // was already surfaced to avoid re-emitting it on unrelated provider re-renders.
  const emitted = useRef<{ success: string | null; error: string | null }>({ success: null, error: null });
  // The status context carries one message at a time, so only the newest failure toast
  // stays on screen; it is dismissed by id so unrelated toasts are never touched.
  const failureToastId = useRef<string | null>(null);
  // The toast context is memoized but changes identity whenever a message is added, and an
  // effect that re-runs on that change would dismiss the toast it just added. Keep the emitters
  // in refs so the effects below react to status changes only.
  const toastRef = useRef(toast);
  const dismissRef = useRef(dismiss);
  toastRef.current = toast;
  dismissRef.current = dismiss;

  useEffect(() => {
    // The previous failure is superseded by whatever the channel reports next.
    if (failureToastId.current) {
      dismissRef.current(failureToastId.current);
      failureToastId.current = null;
    }

    if (!errorMessage) {
      emitted.current.error = null;
      return;
    }
    if (emitted.current.error === errorMessage) {
      // An unchanged message keeps the toast that is already tracked.
      return;
    }
    emitted.current.error = errorMessage;
    // Errors stay until dismissed or superseded, matching the donor wiring for transaction failures.
    failureToastId.current = toastRef.current(errorMessage, "error", 0);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) {
      emitted.current.success = null;
      return;
    }
    if (emitted.current.success === successMessage) {
      return;
    }
    emitted.current.success = successMessage;

    // Recovery must not leave the previous persistent failure on screen next to the result.
    if (failureToastId.current) {
      dismissRef.current(failureToastId.current);
      failureToastId.current = null;
    }

    if (isFailureOutcomeMessage(successMessage)) {
      // On-chain reverts are reported on the success channel but are still failures.
      failureToastId.current = toastRef.current(successMessage, "error", 0);
      return;
    }

    toastRef.current(successMessage, "success");
  }, [successMessage]);

  return null;
}
