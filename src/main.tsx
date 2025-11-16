import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider, createConfig, http } from "wagmi";
import { type Chain } from "./lib/viem-optimized";
import { injected } from "@wagmi/connectors";
import { mainnet, anvil } from "wagmi/chains";
import App from "./App.tsx";
import { grid } from "./the-grid";
import { isLocalNode, RPC_URL } from "./constants/config";
import { StatusMessageProvider } from "./context/status-message.tsx";

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

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");
const gridElement = document.getElementById("grid"); // Get the grid container

if (!rootElement) {
  throw new Error("Could not find root element to mount React app");
}
if (!gridElement) {
  console.warn("Could not find grid element for background animation"); // Warn if grid element is missing
}

createRoot(rootElement).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <StatusMessageProvider>
          <App />
        </StatusMessageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);

// Initialize the grid animation, targeting the #grid div if it exists
if (gridElement) {
  // Call grid with the element and the callback
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
