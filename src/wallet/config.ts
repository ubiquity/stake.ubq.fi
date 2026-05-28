import { mainnet, anvil, type Chain } from "viem/chains";
import { isLocalNode, primaryRpcUrl, RPC_TIMEOUT_MS } from "../constants/config";
import { createConfig, http, fallback, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  // In local-node mode, use raw primaryRpcUrl without chain ID suffix for ALL chains
  // In production/dev mode, append chain ID
  const rpcUrl = isLocalNode ? primaryRpcUrl : `${primaryRpcUrl}/${chain.id}`;
  const fallbackUrl1 = `https://rpc.ubq.fi/${chain.id}`;
  const fallbackUrl2 = `https://ethereum-rpc.publicnode.com`;

  acc[chain.id] = isLocalNode
    ? http(rpcUrl, {
        timeout: RPC_TIMEOUT_MS,
        batch: false,
      })
    : fallback(
        [
          http(rpcUrl, { timeout: RPC_TIMEOUT_MS, batch: true }),
          http(fallbackUrl1, { timeout: RPC_TIMEOUT_MS, batch: true }),
          http(fallbackUrl2, { timeout: RPC_TIMEOUT_MS }),
        ],
        { retryCount: 3 }
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
