import { erc20Abi } from "viem";
import { useReadContracts } from "wagmi";

export function useErc20Token(tokenAddress: `0x${string}` | undefined) {
  const tokenInfo = useReadContracts({
    contracts: [
      {
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "name",
      },
      {
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "symbol",
      },
      {
        abi: erc20Abi,
        address: tokenAddress,
        functionName: "decimals",
      },
    ],
    query: {
      enabled: !!tokenAddress,
    },
  });

  return {
    ...tokenInfo,
    data:
      !tokenAddress || !tokenInfo.data || tokenInfo.data[0].error || tokenInfo.data[1].error || tokenInfo.data[2].error
        ? undefined
        : {
            address: tokenAddress,
            name: tokenInfo.data[0].result,
            symbol: tokenInfo.data[1].result,
            decimals: tokenInfo.data[2].result,
          },
  };
}
