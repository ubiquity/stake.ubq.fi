import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import App from "./App.tsx";
import { grid } from "./the-grid";
import { StatusMessageProvider } from "./context/status-message.tsx";
import { StatusToastBridge, ToastContainer, ToastProvider } from "./ui/toast/index.ts";
import { initializeRpcRuntime } from "./utils/rpc-runtime";

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

async function bootstrap() {
  await initializeRpcRuntime();
  // The wallet config reads the resolved RPC selection, so it must load after initialization.
  const { wagmiConfig } = await import("./wallet/config.ts");

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
}

function renderBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("[bootstrap] Unable to initialize the RPC runtime", error);

  root.render(
    <StrictMode>
      <section id="bootstrap-error" style={{ padding: "20px" }}>
        <h1>Unable to start Ubiquity Staking</h1>
        <p>RPC initialization failed: {message}</p>
      </section>
    </StrictMode>
  );
}

void bootstrap().catch(renderBootstrapError);

if (gridElement) {
  grid(gridElement, () => document.body.classList.add("grid-loaded"));
}
