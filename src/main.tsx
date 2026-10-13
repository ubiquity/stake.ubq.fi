import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.tsx";
import { grid } from "./the-grid";
import { StatusMessageProvider } from "./context/status-message.tsx";
import { StatusToastBridge, ToastContainer, ToastProvider } from "./ui/toast/index.ts";
import { initializeRpcRuntime } from "./utils/rpc-runtime";
import { wagmiConfig } from "./wallet/config.ts";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
const gridElement = document.getElementById("grid");

if (!rootElement) {
  throw new Error("Could not find root element to mount React app");
}

if (!gridElement) {
  console.warn("Could not find grid element for background animation");
}

const root = createRoot(rootElement);

// The transports resolve the RPC endpoint at request time, so the shell renders now
// and the health probe only re-points it once it settles instead of gating first paint.
root.render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <StatusMessageProvider>
            <App />
            <StatusToastBridge />
            <ToastContainer />
          </StatusMessageProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);

// A failed probe must not blank the app: reads keep using the primary while the
// transport fallback covers the outage, and the diagnostics panel reports the selection.
void initializeRpcRuntime().catch((error: unknown) => {
  console.error("[bootstrap] Unable to initialize the RPC runtime", error);
});

if (gridElement) {
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
