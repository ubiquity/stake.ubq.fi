import { mainnet, anvil, type Chain } from "viem/chains";
import { isLocalNode, RPC_CONFIG } from "../constants/config";
import { createConfig, http, injected, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  const rpcUrl = RPC_CONFIG.shouldAppendChainId ? `${RPC_CONFIG.url.replace(/\/$/, "")}/${chain.id}` : RPC_CONFIG.url;

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
