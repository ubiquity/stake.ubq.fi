import { mainnet, anvil, type Chain } from "viem/chains";
import { isLocalNode, RPC_FALLBACK_URLS, RPC_URL } from "../constants/config";
import { createConfig, fallback, http, injected, type Transport } from "wagmi";
import { getResolvedRpcBaseUrl } from "../utils/rpc-runtime";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  // In local-node mode, use raw RPC_URL without chain ID suffix for ALL chains
  // In production/dev mode, append chain ID and use fallback RPCs on failures
  const activeBaseUrl = getResolvedRpcBaseUrl() || RPC_URL;
  const rpcUrl = isLocalNode ? activeBaseUrl : `${activeBaseUrl}/${chain.id}`;

  if (isLocalNode) {
    acc[chain.id] = http(rpcUrl, { batch: false });
    return acc;
  }

  const fallbackUrls = [rpcUrl, ...RPC_FALLBACK_URLS.map((url) => `${url}/${chain.id}`)].filter((url, index, list) => list.indexOf(url) === index);
  const fallbackTransports = fallbackUrls.map((url) => http(url, { batch: true }));
  acc[chain.id] = fallback(fallbackTransports);
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
