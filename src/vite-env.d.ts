/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string;
  readonly VITE_BUNDLE_SPLIT_REPORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Bundle Performance Split Report:
 *
 * Baseline build output:
 * - dist/assets/index.js: ~603.47 kB (gzip: ~185.31 kB)
 *
 * Code-splitting and vendor chunking targets:
 * - Vendor chunks: react, react-dom, @tanstack/react-query, wagmi, viem, connectors
 * - Main non-vendor application chunk gzip target: < 140 kB gz
 */
