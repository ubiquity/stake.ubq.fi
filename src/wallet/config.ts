import { mainnet, anvil, type Chain } from "viem/chains";
import { getRpcUrlForChain, isLocalNode, RPC_URL } from "../constants/config";
import { createConfig, http, injected, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  // In local-node mode, use raw RPC_URL without chain ID suffix for ALL chains
  // In production/dev mode, append chain ID
  const rpcUrl = getRpcUrlForChain(RPC_URL, chain.id, isLocalNode);

  acc[chain.id] = http(rpcUrl, {
    batch: isLocalNode ? false : true,
  });
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
