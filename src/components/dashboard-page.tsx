import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { ICONS } from "./iconography.tsx";
import { PoolDisplay } from "./pool-display.tsx";
import { ConnectWalletButton } from "./connect-wallet.tsx";
import { supportedChains } from "../wallet/config.ts";
import { useStatusMessageState, useStatusMessageDispatch } from "../context/status-message.tsx";
import { useToast } from "../ui/toast.tsx";
import { useEffect, useRef } from "react";

const LogoSpan = () => <span id="header-logo-wrapper">{ICONS.DAO_LOGO}</span>;

export function DashboardPage() {
  const { isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { successMessage, errorMessage } = useStatusMessageState();
  const statusMessageDispatch = useStatusMessageDispatch();
  const { addToast } = useToast();
  const prevSuccessRef = useRef<string | null>(null);
  const prevErrorRef = useRef<string | null>(null);

  // Bridge status messages to toasts
  useEffect(() => {
    if (successMessage && successMessage !== prevSuccessRef.current) {
      addToast("success", successMessage);
      prevSuccessRef.current = successMessage;
    }
  }, [successMessage, addToast]);

  useEffect(() => {
    if (errorMessage && errorMessage !== prevErrorRef.current) {
      addToast("error", errorMessage);
      prevErrorRef.current = errorMessage;
    }
  }, [errorMessage, addToast]);

  // Clear inline status messages after they've been toasted
  useEffect(() => {
    if (successMessage || errorMessage) {
      const timer = setTimeout(() => statusMessageDispatch({ type: "clear" }), 100);
      return () => clearTimeout(timer);
    }
  }, [successMessage, errorMessage, statusMessageDispatch]);

  const isUnsupportedChain = isConnected && chainId && !supportedChains.some((c) => c.id === chainId);

  return (
    <>
      {/* Header Section */}
      <section id="header" className="header-logged-in">
        <div id="logo-wrapper">
          <h1>
            <LogoSpan />
            <span>Ubiquity</span>
            <span>Staking</span>
          </h1>
        </div>

        <ConnectWalletButton />
      </section>

      {/* Status messages are now handled by the toast system */}

      {isUnsupportedChain ? (
        <div className="pool-container">
          <div style={{ padding: "20px" }}>Switch to one of the supported chains: {supportedChains.map((chain) => chain.name).join(", ")}</div>
        </div>
      ) : (
        <PoolDisplay />
      )}
    </>
  );
}
