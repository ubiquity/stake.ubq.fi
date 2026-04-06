import { type Address, BaseError, parseUnits } from "viem";
import { useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import { stakingContract } from "../constants/contracts";
import erc20Abi from "../abis/erc20";
import { toValidAddress } from "../utils";
import { useStatusMessageDispatch } from "../context/status-message";

interface UseStakingParams {
  poolId: bigint;
  userAddress: string | undefined;
  lpToken:
    | {
        address: Address;
        name: string;
        symbol: string;
        decimals: number;
      }
    | undefined;
  isConnected: boolean;
  onTransactionComplete: () => void;
}

export const useStaking = ({ poolId, userAddress, lpToken, isConnected, onTransactionComplete }: UseStakingParams) => {
  const validUserAddress = toValidAddress(userAddress);
  const publicClient = usePublicClient();
  const statusMessageDispatch = useStatusMessageDispatch();

  const userInfo = useReadContract({
    ...stakingContract,
    functionName: "getStakingUserInfo",
    args: [poolId, validUserAddress],
    query: { enabled: isConnected && !!userAddress },
  });

  const pendingRewards = useReadContract({
    ...stakingContract,
    functionName: "getPendingStakingRewards",
    args: [poolId, validUserAddress],
    query: { enabled: isConnected && !!userAddress },
  });

  const allowance = useReadContract({
    abi: erc20Abi,
    address: lpToken?.address,
    functionName: "allowance",
    args: [validUserAddress, stakingContract.address],
    query: { enabled: isConnected && !!userAddress && !!lpToken?.address },
  });

  const balance = useReadContract({
    abi: erc20Abi,
    address: lpToken?.address,
    functionName: "balanceOf",
    args: [validUserAddress],
    query: { enabled: isConnected && !!userAddress && !!lpToken?.address },
  });

  const handleSuccess = async (hash: `0x${string}`, successMessage?: string) => {
    if (!publicClient) {
      statusMessageDispatch({ type: "setError", message: "No public client available" });
      return;
    }

    try {
      const receipt = await waitForTransactionReceipt(publicClient, { hash });
      statusMessageDispatch({ type: "setSuccess", message: receipt.status === "success" ? successMessage || "Transaction confirmed" : "Transaction reverted" });
    } catch (error) {
      statusMessageDispatch({ type: "setError", message: error instanceof Error ? error.message : "Transaction failed" });
    }
  };

  const handleError = (error: unknown, errorMessagePrefix?: string) => {
    const message = error instanceof BaseError ? error.shortMessage || error.message : error instanceof Error ? error.message : "An unknown error occurred";
    statusMessageDispatch({ type: "setError", message: `${errorMessagePrefix ? errorMessagePrefix + ": " : ""}${message}` });
  };

  const { writeContract } = useWriteContract({
    mutation: {
      onSuccess: (hash) => handleSuccess(hash),
      onError: (error) => handleError(error),
      onSettled: () => onTransactionComplete(),
    },
  });

  const executeStake = (amount: string) => {
    if (!lpToken) {
      statusMessageDispatch({ type: "setError", message: "LP token information not available" });
      return;
    }
    statusMessageDispatch({ type: "clear" });
    writeContract(
      {
        ...stakingContract,
        functionName: "stake",
        args: [poolId, parseUnits(amount, lpToken.decimals)],
      },
      {
        onSuccess: (hash) => handleSuccess(hash, "Staked and claimed rewards successfully"),
      }
    );
  };

  const executeUnstake = (amount: string) => {
    if (!lpToken) {
      statusMessageDispatch({ type: "setError", message: "LP token information not available" });
      return;
    }
    statusMessageDispatch({ type: "clear" });
    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, parseUnits(amount, lpToken.decimals)],
      },
      {
        onSuccess: (hash) => handleSuccess(hash, "Unstaked and claimed rewards successfully"),
        onError: (error) => handleError(error, "Failed to unstake"),
      }
    );
  };

  const executeClaim = () => {
    statusMessageDispatch({ type: "clear" });
    writeContract(
      {
        ...stakingContract,
        functionName: "unstake",
        args: [poolId, 0n],
      },
      {
        onSuccess: (hash) => handleSuccess(hash, "Claimed rewards successfully"),
        onError: (error) => handleError(error, "Failed to claim rewards"),
      }
    );
  };

  const executeApprove = (amount: string) => {
    if (!lpToken) {
      statusMessageDispatch({ type: "setError", message: "LP token information not available" });
      return;
    }

    statusMessageDispatch({ type: "clear" });
    writeContract(
      {
        abi: erc20Abi,
        address: lpToken.address,
        functionName: "approve",
        args: [stakingContract.address, parseUnits(amount, lpToken.decimals)],
      },
      {
        onSuccess: (hash) => handleSuccess(hash, "Approved successfully"),
        onError: (error) => handleError(error, "Failed to approve"),
      }
    );
  };

  const refetchAll = () => {
    userInfo.refetch();
    pendingRewards.refetch();
    allowance.refetch();
    balance.refetch();
  };

  return {
    data: { userInfo, pendingRewards, allowance, balance },
    actions: { executeStake, executeUnstake, executeClaim, executeApprove },
    refetchAll,
  };
};
