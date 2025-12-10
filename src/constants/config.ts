/**
 * RPC endpoint for blockchain calls.
 * - In development (including deno.dev preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";
export const RPC_URL = import.meta.env.VITE_RPC_URL || (self.location.hostname.includes(".deno.dev") ? "https://rpc.ubq.fi" : `${self.location.origin}/rpc`);
