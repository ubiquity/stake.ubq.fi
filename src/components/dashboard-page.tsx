import { lazy, Suspense } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { ICONS } from "./iconography.tsx";
import { PoolDisplay } from "./pool-display.tsx";
import { supportedChains } from "../wallet/config.ts";
import { useStatusMessageState } from "../context/status-message.tsx";

/**
 * Lazy-loaded wallet connector button component.
 * Dynamically imported to reduce initial bundle size.
 * Falls back to skeleton while loading.
 */
const ConnectWalletButton = lazy(() => import("./connect-wallet.tsx").then(mod => ({ default: mod.ConnectWalletButton })));

/**
 * Loading skeleton placeholder for the wallet button.
 * Displayed while the wallet connector is being lazy-loaded.
 * @returns {JSX.Element} Skeleton div with placeholder styling
 */
const WalletButtonSkeleton = () => (
  <div className="wallet-button skeleton" style={{ width: "180px", height: "40px" }} />
);

/**
 * Logo span component displaying the DAO logo.
 * @returns {JSX.Element} Span containing the DAO logo icon
 */
const LogoSpan = () => <span id="header-logo-wrapper">{ICONS.DAO_LOGO}</span>;

export function DashboardPage() {
  const { isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { successMessage, errorMessage } = useStatusMessageState();

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

        <Suspense fallback={<WalletButtonSkeleton />}>
          <ConnectWalletButton />
        </Suspense>
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
