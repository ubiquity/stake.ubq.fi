/**
 * RPC endpoint for blockchain calls.
 * - In development (including Deno Deploy preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
export const isLocalNodeMode = (mode: string): boolean => mode === "local-node";
export const isLocalNode = isLocalNodeMode(import.meta.env.MODE);
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");

export const resolveRpcUrl = ({ viteRpcUrl, hostname, origin }: { viteRpcUrl?: string; hostname?: string; origin?: string }): string =>
  viteRpcUrl || (isDenoDeployHost(hostname ?? "") ? "https://rpc.ubq.fi" : `${origin ?? ""}/rpc`);

const currentLocation = globalThis.location;
export const RPC_URL = resolveRpcUrl({
  viteRpcUrl: import.meta.env.VITE_RPC_URL,
  hostname: currentLocation?.hostname,
  origin: currentLocation?.origin,
});
