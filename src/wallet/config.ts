import { mainnet, anvil, type Chain } from "viem/chains";
import { fallback } from "viem";
import { isLocalNode, RPC_FALLBACK_URLS, RPC_URL } from "../constants/config";
import { createConfig, http, injected, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

export function getChainRpcUrl(rpcUrl: string, chainId: number, localNode = isLocalNode): string {
  if (localNode) return rpcUrl;
  return `${rpcUrl}/${chainId}`;
}

export function getRpcTransportUrls(
  chain: Chain,
  {
    fallbackUrls = RPC_FALLBACK_URLS,
    localNode = isLocalNode,
    rpcUrl = RPC_URL,
  }: {
    fallbackUrls?: string[];
    localNode?: boolean;
    rpcUrl?: string;
  } = {}
): string[] {
  const rpcUrls = localNode ? [rpcUrl] : [rpcUrl, ...fallbackUrls];
  return rpcUrls.map((currentRpcUrl) => getChainRpcUrl(currentRpcUrl, chain.id, localNode));
}

function createRpcTransport(chain: Chain): Transport {
  const rpcUrls = getRpcTransportUrls(chain);
  const transports = rpcUrls.map((rpcUrl) =>
    http(rpcUrl, {
      batch: isLocalNode ? false : true,
    })
  );

  if (transports.length === 1) return transports[0];
  return fallback(transports, {
    rank: false,
  });
}

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  acc[chain.id] = createRpcTransport(chain);
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
