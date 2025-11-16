import { injected, useAccount, useChains, useConnect, useDisconnect } from "wagmi";
import { ICONS } from "./iconography.tsx";
import { PoolDisplay } from "./pool-display.tsx";
import { BaseError } from "../lib/viem-optimized";
import { useStatusMessage } from "../context/status-message.tsx";

const LogoSpan = () => <span id="header-logo-wrapper">{ICONS.DAO_LOGO}</span>;

export function DashboardPage() {
  const { address, isConnected, chain, chainId } = useAccount();
  const supportedChains = useChains();
  const { connect, status } = useConnect();
  const { disconnect } = useDisconnect();

  const { successMessage, errorMessage, setErrorMessage, clearMessages } = useStatusMessage();

  const isWalletInstalled = typeof window !== "undefined" && !!window.ethereum;

  return (
    <>
      {/* Header Section */}
      <section id="header" className="header-logged-in">
        <div id="logo-wrapper">
          <h1>
            <LogoSpan />
            <span>Ubiquity</span>
            <span>Stake</span>
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
            disabled={!isWalletInstalled || status === "pending"}
            onClick={() =>
              connect(
                { connector: injected() },
                {
                  onError: (error) => {
                    if (error instanceof BaseError) {
                      setErrorMessage(error.shortMessage);
                    } else {
                      setErrorMessage(error.message);
                    }
                  },
                  onSuccess: () => clearMessages(),
                }
              )
            }
          >
            {!isWalletInstalled ? ICONS.WARNING : ICONS.CONNECT}
            <span>{status === "pending" ? "Connecting..." : !isWalletInstalled ? "Requires Wallet Extension" : "Connect Wallet"}</span>
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

      {isConnected && chainId && !supportedChains.some((c) => c.id === chainId) ? (
        <div className="pool-container">
          <div style={{ padding: "20px" }}>Switch to one of the supported chains: {supportedChains.map((chain) => chain.name).join(", ")}</div>
        </div>
      ) : (
        <PoolDisplay />
      )}
    </>
  );
}
