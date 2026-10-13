import { mainnet, anvil, type Chain } from "viem/chains";
import { fallback } from "viem";
import { createConfig, http, injected, type Transport } from "wagmi";
import { getChainRpcUrl, isLocalNode, RPC_FALLBACK_URLS, RPC_URL } from "../constants/config";
import { getResolvedRpcBaseUrl } from "../utils/rpc-runtime";

export { getChainRpcUrl };

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

/** Bound every RPC transport so a stalled endpoint cannot hold a request open. */
const RPC_TRANSPORT_TIMEOUT_MS = 2_000;

/**
 * Returns the base URLs that should back a chain transport: the primary alone in
 * local-node mode (Anvil does not serve chain paths), otherwise the primary followed
 * by the configured public fallbacks with duplicates removed.
 */
export function getRpcTransportUrls(
  chain: Chain,
  {
    fallbackUrls = RPC_FALLBACK_URLS,
    localNode = isLocalNode,
    rpcUrl = RPC_URL,
  }: {
    fallbackUrls?: readonly string[];
    localNode?: boolean;
    rpcUrl?: string;
  } = {}
): string[] {
  const rpcUrls = localNode ? [rpcUrl] : [rpcUrl, ...fallbackUrls];
  return [...new Set(rpcUrls.map((currentRpcUrl) => getChainRpcUrl(currentRpcUrl, chain.id, localNode)))];
}

function createRpcTransport(rpcUrl: string): Transport {
  return http(rpcUrl, {
    batch: !isLocalNode,
    timeout: RPC_TRANSPORT_TIMEOUT_MS,
  });
}

/**
 * Wraps a transport factory so the URL chain is rebuilt on every request instead of when
 * this module is evaluated. `src/wallet/config.ts` is statically imported through
 * App -> dashboard-page -> connect-wallet, so it loads before `main.tsx` starts the RPC
 * health probe, and wagmi memoizes the client it builds from these transports. Resolving
 * here is what lets the probe selection actually replace the endpoint that is called.
 */
function dynamicRpcTransport(createTransport: () => Transport[]): Transport {
  const transport: Transport = (params) => {
    const [primary, ...rest] = createTransport();
    if (!primary) throw new Error("No RPC transport URL is available");
    if (rest.length === 0) return primary(params);
    return fallback(
      [primary, ...rest].map((next) => next(params)),
      { rank: false }
    )(params);
  };

  return transport;
}

// Anvil cannot serve URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  acc[chain.id] = dynamicRpcTransport(() =>
    getRpcTransportUrls(chain, { rpcUrl: getResolvedRpcBaseUrl() || RPC_URL }).map((rpcUrl) => createRpcTransport(rpcUrl))
  );
  return acc;
}, {} as TransportsMap);

export const wagmiConfig = createConfig({
  chains: supportedChains,
  transports,
  connectors: [injected()],
  batch: {
    multicall: false, // Disabled because rpc.ubq.fi already uses multicall
  },
});
