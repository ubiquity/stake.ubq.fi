import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.tsx";
import { grid } from "./the-grid";
import { StatusMessageProvider } from "./context/status-message.tsx";
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
        <StatusMessageProvider>
          <App />
        </StatusMessageProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);

if (gridElement) {
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
