import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { UserConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  css: {
    devSourcemap: true,
  },
  build: {
    cssCodeSplit: false,
    outDir: "dist",
    rollupOptions: {
      output: {
        // Keep the heavy vendor libraries in stable, cacheable chunks instead of one entry bundle.
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@tanstack/react-query/")) {
            return "vendor-query";
          }
          if (id.includes("node_modules/wagmi/") || id.includes("node_modules/viem/")) {
            return "vendor-wallet";
          }
        },
      },
    },
  },
  worker: {
    format: "es",
  },
  optimizeDeps: {
    exclude: ["secp256k1"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
}) as UserConfig;
