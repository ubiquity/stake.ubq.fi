import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption,
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'viem/chains': 'viem/chains',
      'viem/actions': 'viem/actions',
      'viem/utils': 'viem/utils',
      'viem/contracts': 'viem/contracts',
      'viem/errors': 'viem/errors',
    },
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true, 
    },
  },
  publicDir: 'public',
  build: {
    cssCodeSplit: true,
    outDir: "dist",
    sourcemap: false,
    assetsDir: 'assets',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 500,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          
          if (id.includes('node_modules/zustand/')) return 'zustand';
          if (id.includes('node_modules/eventemitter3/')) return 'eventemitter';
          if (id.includes('node_modules/@wagmi/core/')) return 'wagmi-core';
          if (id.includes('node_modules/ox/')) return 'ox-core';
          if (id.includes('node_modules/abitype/')) return 'abitype';

          // Noble 
          if (id.includes('node_modules/@noble/')) {
            if (id.includes('@noble/curves')) return 'noble-curves';
            return 'noble-hashes';
          }

          // React
          if (id.includes('node_modules/react/') && !id.includes('react-dom')) return 'react-core';
          if (id.includes('node_modules/react-dom/')) return 'react-dom';

          
          if (id.includes('node_modules/viem/')) {
            if (id.includes('/chains/')) return 'viem-chains';
            if (id.includes('/actions/')) return 'viem-actions';
            if (id.includes('/utils/')) return 'viem-utils';
            return 'viem-core';
          }

          // Query
          if (id.includes('node_modules/@tanstack/')) return 'query-vendor';
          if (id.includes('node_modules/wagmi/') && !id.includes('connectors')) return 'wagmi-vendor';
          if (id.includes('node_modules/@wagmi/connectors')) return 'connectors-vendor';

          // Restante
          if (id.includes('node_modules/')) return 'vendor-misc';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
    ],
    exclude: ["secp256k1"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      target: 'es2020',
    },
  },
});