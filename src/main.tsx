import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.tsx";
import { grid } from "./the-grid";
import { StatusMessageProvider } from "./context/status-message.tsx";
import { ToastProvider, ToastContainer } from "./ui/toast";
import "./css/toast.css";

// Configure wagmi
const supportedChains: [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

// Dynamically create transports for all supported chains
const transports = supportedChains.reduce((acc, chain) => {
  acc[chain.id] = http(isLocalNode ? RPC_URL : `${RPC_URL}/${chain.id}`, { batch: true });
  return acc;
}, {} as Record<number, ReturnType<typeof http>>);

export const config = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  transports: transports,
  batch: {
    multicall: false,
  },
});
import { wagmiAdapter } from "./wallet/config";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
const gridElement = document.getElementById("grid");

if (!rootElement) {
  throw new Error("Could not find root element to mount React app");
}

if (!gridElement) {
  console.warn("Could not find grid element for background animation");
}

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <StatusMessageProvider>
            <App />
            <ToastContainer />
          </StatusMessageProvider>
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);

if (gridElement) {
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
