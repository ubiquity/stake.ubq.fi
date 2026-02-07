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
        /**
         * Custom chunking function for vendor splitting.
         * Separates heavy dependencies into distinct chunks to reduce initial bundle size.
         * @param id - The module ID being evaluated
         * @returns {string | undefined} Chunk name if module should be separated, undefined otherwise
         */
        manualChunks(id) {
          // Separate React + React DOM
          if (id.includes("react") && (id.includes("node_modules/react") || id.includes("node_modules/react-dom"))) {
            return "vendor-react";
          }
          // Separate TanStack Query
          if (id.includes("@tanstack/react-query")) {
            return "vendor-query";
          }
          // Separate wallet libraries
          if (id.includes("node_modules/wagmi") || id.includes("node_modules/viem") || id.includes("@reown/appkit")) {
            return "vendor-wallet";
          }
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
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
