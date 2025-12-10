import { type Address, zeroAddress, isAddress } from "viem";

export const formatWalletAddress = (address: string): string => {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getChainName = (chainId: number | undefined, chains: Array<{ id: number; name: string }>): string => {
  return chainId ? chains.find((c) => c.id === chainId)?.name || `Chain ${chainId}` : "Unknown Chain";
};

export const toValidAddress = (address: string | Address | undefined): Address => {
  return address && isAddress(address) ? (address as Address) : zeroAddress;
};
