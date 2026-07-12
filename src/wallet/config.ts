import { mainnet, anvil, type Chain } from "viem/chains";
import { getChainRpcUrl, isLocalNode, RPC_FALLBACK_URLS, RPC_URL } from "../constants/config";
import { createConfig, fallback, http, injected, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  const rpcUrls = [RPC_URL, ...RPC_FALLBACK_URLS].map((rpcUrl) => getChainRpcUrl(rpcUrl, chain.id, isLocalNode));
  const uniqueRpcUrls = [...new Set(rpcUrls)];
  const rpcTransports = uniqueRpcUrls.map((rpcUrl) =>
    http(rpcUrl, {
      batch: isLocalNode ? false : true,
      timeout: 2_000,
    })
  );

  acc[chain.id] = rpcTransports.length === 1 ? rpcTransports[0] : fallback(rpcTransports);
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
