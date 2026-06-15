export const isLocalNode = import.meta.env.MODE === "local-node";
export const isDenoDeployHost = (hostname: string) => hostname.endsWith(".deno.dev") || hostname.endsWith(".deno.net");
const currentLocation = globalThis.location;
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || (isDenoDeployHost(currentLocation?.hostname ?? "") ? "https://rpc.ubq.fi" : `${currentLocation?.origin ?? ""}/rpc`);
export const RPC_TIMEOUT = 10_000;
export const FALLBACK_RPC_URLS: string[] = ["https://rpc.ubq.fi", "https://ethereum-rpc.publicnode.com"];
export function validateRpcUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try { const p = new URL(url); return p.protocol === "http:" || p.protocol === "https:"; }
  catch { return false; }
}
export function getEffectiveRpcUrl(): string {
  if (!validateRpcUrl(RPC_URL)) {
    console.warn("[stake.ubq.fi] Invalid VITE_RPC_URL. Falling back to " + FALLBACK_RPC_URLS[0]);
    return FALLBACK_RPC_URLS[0];
  }
  return RPC_URL;
}
export async function checkRpcHealth(url: string, timeout = RPC_TIMEOUT): Promise<boolean> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeout);
    const r = await fetch(url, { method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({jsonrpc:"2.0",method:"eth_blockNumber",params:[],id:1}), signal: c.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    const d = await r.json();
    return !d.error;
  } catch { return false; }
}