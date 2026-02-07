/**
 * RPC endpoint for blockchain calls.
 * - In development (including deno.dev preview links), it uses https://rpc.ubq.fi
 * - In production, it uses /rpc for performance.
 */
export const isLocalNode = import.meta.env.MODE === "local-node";

function getRuntimeLocation(): { hostname: string; origin: string } {
  const loc = (globalThis as unknown as { location?: { hostname?: string; origin?: string } }).location;
  return {
    hostname: loc?.hostname ?? "",
    origin: loc?.origin ?? "",
  };
}

export function validateRpcUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function resolveRpcBaseUrl(params: {
  mode: string;
  viteRpcUrl?: string;
  hostname: string;
  origin: string;
}): { rpcBaseUrl: string; fallbacks: string[]; source: "env" | "default" } {
  const envUrlRaw = params.viteRpcUrl ?? "";
  const envUrl = envUrlRaw ? validateRpcUrl(envUrlRaw) : null;

  if (envUrlRaw && !envUrl) {
    console.warn(`⚠️ Invalid VITE_RPC_URL "${envUrlRaw}". Falling back to default RPC resolution.`);
  }

  const defaultRpc =
    params.mode !== "prod" || params.hostname.includes(".deno.dev")
      ? "https://rpc.ubq.fi"
      : params.origin
        ? `${params.origin}/rpc`
        : "/rpc";

  const primary = envUrl ?? defaultRpc;
  const source: "env" | "default" = envUrl ? "env" : "default";

  // Only add external fallbacks in non-prod. In prod we assume /rpc is a reverse-proxied endpoint.
  const fallbackBases =
    params.mode !== "prod"
      ? [
          "https://rpc.ubq.fi",
          "https://cloudflare-eth.com",
          "https://eth.merkle.io",
        ]
      : [];

  const unique = new Set([primary, ...fallbackBases].map((u) => u.replace(/\/$/, "")));
  unique.delete("");
  return { rpcBaseUrl: primary, fallbacks: [...unique], source };
}

const runtimeLoc = getRuntimeLocation();
const resolved = resolveRpcBaseUrl({
  mode: import.meta.env.MODE,
  viteRpcUrl: import.meta.env.VITE_RPC_URL,
  hostname: runtimeLoc.hostname,
  origin: runtimeLoc.origin,
});

export const RPC_URL = resolved.rpcBaseUrl;
export const RPC_URL_CANDIDATES = resolved.fallbacks;
