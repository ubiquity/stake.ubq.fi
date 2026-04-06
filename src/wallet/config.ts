import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { mainnet, anvil, type Chain } from "viem/chains";
import { isLocalNode, RPC_URL } from "../constants/config";
import { http, injected, type Transport } from "wagmi";

export const supportedChains: readonly [Chain, ...Chain[]] = isLocalNode ? [mainnet, anvil] : [mainnet];

type ChainId = (typeof supportedChains)[number]["id"];
type TransportsMap = Record<ChainId, Transport>;

// Anvil doesn't support URLs like http://localhost:8545/31337
const transports = supportedChains.reduce<TransportsMap>((acc, chain) => {
  // In local-node mode, use raw RPC_URL without chain ID suffix for ALL chains
  // In production/dev mode, append chain ID
  const rpcUrl = isLocalNode ? RPC_URL : `${RPC_URL}/${chain.id}`;

  acc[chain.id] = http(rpcUrl, {
    batch: isLocalNode ? false : true,
  });
  return acc;
}, {} as TransportsMap);

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";

export const isWalletConnectConfigured = projectId.length > 0;

if (!isWalletConnectConfigured && import.meta.env.DEV) {
  console.warn(
    "⚠️  VITE_WALLETCONNECT_PROJECT_ID not configured. WalletConnect features will be limited.\n" + "Get your project ID at: https://cloud.reown.com/"
  );
}

const metadata = {
  name: "Ubiquity Staking",
  description: "Staking frontend for the Ubiquity protocol",
  url: typeof window !== "undefined" ? window.location.origin : "https://stake.ubq.fi",
  icons: [
    typeof window !== "undefined" ? `${window.location.origin}/src/assets/ubiquity-dao-logo.svg` : "https://stake.ubq.fi/src/assets/ubiquity-dao-logo.svg",
  ],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [...supportedChains],
  projectId,
  transports,
  connectors: [injected()],
  batch: {
    multicall: false, // Disabled because rpc.ubq.fi already uses multicall
  },
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...supportedChains],
  projectId,
  metadata,
  features: {
    analytics: false,
  },
  themeVariables: {
    "--w3m-accent": "#00BFFF",
    "--w3m-border-radius-master": "4px",
  },
});
