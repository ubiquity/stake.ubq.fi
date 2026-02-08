import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ICONS } from "./iconography.tsx";
import { PoolDisplay } from "./pool-display.tsx";
import { BaseError } from "viem";
import { useStatusMessageState, useStatusMessageDispatch } from "../context/status-message.tsx";
import { useToast } from "../ui/toast";
import { ConnectWalletButton } from "./connect-wallet.tsx";
import { supportedChains } from "../wallet/config.ts";

const LogoSpan = () => <span id="header-logo-wrapper">{ICONS.DAO_LOGO}</span>;

export function DashboardPage() {
  const { isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { address, chain, status } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { successMessage, errorMessage } = useStatusMessageState();
  const dispatch = useStatusMessageDispatch();
  const setErrorMessage = (message: string) => dispatch({ type: "setError", message });
  const clearMessages = () => dispatch({ type: "clear" });
  const { toast } = useToast();

  const isWalletInstalled = typeof window !== "undefined" && !!(window as { ethereum?: unknown }).ethereum;
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

        {/* Header Buttons/Controls (Directly under #header) */}
        {isConnected && address ? (
          <>
            <button id="disconnect" onClick={() => disconnect({}, { onSuccess: () => clearMessages() })} className="button-with-icon">
              {ICONS.DISCONNECT}
              <span>
                {`${address.substring(0, 6)}...${address.substring(address.length - 4)}`} {chain ? `(${chain.name})` : ""}
              </span>
            </button>
          </>
        ) : (
          <button
            className="button-with-icon"
            disabled={!isWalletInstalled || status === "connecting"}
            onClick={() =>
              connect(
                { connector: injected() },
                {
                  onError: (error) => {
                    const message = error instanceof BaseError ? error.shortMessage : error.message;
                    toast(message, "error", 0);
                    setErrorMessage(message);
                  },
                  onSuccess: () => clearMessages(),
                }
              )
            }
          >
            {!isWalletInstalled ? ICONS.WARNING : ICONS.CONNECT}
            <span>{status === "connecting" ? "Connecting..." : !isWalletInstalled ? "Requires Wallet Extension" : "Connect Wallet"}</span>
          </button>
        )}
      </section>

      {/* Status Displays */}
      {errorMessage && (
        <section id="error-message-wrapper">
          <div className="status-message">
            {ICONS.WARNING}
            <span>{errorMessage}</span>
          </div>
        </section>
      )}
      {successMessage && (
        <section id="success-message-wrapper">
          <div className="status-message">
            {ICONS.SUCCESS}
            <span>{successMessage}</span>
          </div>
        </section>
      )}

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
