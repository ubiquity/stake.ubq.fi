import { useEffect } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork, useDisconnect } from "@reown/appkit/react";
import { supportedChains } from "../wallet/config";
import { ICONS } from "./iconography";
import { formatWalletAddress, getChainName } from "../utils";
import { useStatusMessageDispatch } from "../context/status-message";
import { Button } from "./button";

export function ConnectWalletButton() {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const dispatchStatusMessage = useStatusMessageDispatch();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    dispatchStatusMessage({ type: "clear" });
  }, [isConnected, chainId, dispatchStatusMessage]);

  const disconnectWallet = async () => {
    try {
      await disconnect();
      dispatchStatusMessage({ type: "clear" });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  const normalizedChainId = typeof chainId === "string" ? parseInt(chainId, 10) : chainId;
  const isConnecting = status === "connecting";

  if (isConnected && address) {
    return (
      <div className="wallet-connect-container">
        <Button onClick={disconnectWallet} className="wallet-button wallet-button--connected" id="disconnect" title="Click to disconnect wallet">
          {ICONS.DISCONNECT}
          <span>
            {formatWalletAddress(address)} (
            {getChainName(
              normalizedChainId,
              supportedChains.map((c) => ({ id: c.id, name: c.name }))
            )}
            )
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => open()}
      className="wallet-button"
      disabled={isConnecting}
      isLoading={isConnecting}
      isLoadingText="Connecting..."
      title={isConnecting ? "Connecting to wallet..." : "Connect your wallet"}
    >
      {ICONS.CONNECT}
      <span>Connect Wallet</span>
    </Button>
  );
}
