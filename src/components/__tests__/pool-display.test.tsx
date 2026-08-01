import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";

const LP_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000001";
const REWARD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000002";

mock.module("wagmi", () => ({
  useAccount: () => ({
    address: "0x0000000000000000000000000000000000000003",
    isConnected: true,
  }),
  useReadContract: ({ functionName }: { functionName: string }) => {
    if (functionName === "getStakingSettings") {
      return queryState([REWARD_TOKEN_ADDRESS, 0n, 0n, 1000000000000000000n, 0n, 0n, 100n, 0n]);
    }

    if (functionName === "getStakingPoolInfo") {
      return queryState({
        lpToken: LP_TOKEN_ADDRESS,
        amount: 200000000000000000000n,
        allocationPoints: 25n,
      });
    }

    return queryState(undefined);
  },
}));

mock.module("../../hooks/erc20Token", () => ({
  useErc20Token: (address: string | undefined) =>
    queryState(
      address === LP_TOKEN_ADDRESS
        ? {
            address: LP_TOKEN_ADDRESS,
            name: "Liquidity Token",
            symbol: "LPT",
            decimals: 18,
          }
        : {
            address: REWARD_TOKEN_ADDRESS,
            name: "Reward Token",
            symbol: "UBQ",
            decimals: 18,
          }
    ),
}));

mock.module("../../hooks/useStaking", () => ({
  useStaking: () => ({
    data: {
      userInfo: queryState({ amount: 50000000000000000000n }),
      pendingRewards: queryState(2500000000000000000n),
      allowance: queryState(0n),
      balance: queryState(100000000000000000000n),
    },
    actions: {
      executeApprove: mock(),
      executeStake: mock(),
      executeUnstake: mock(),
      executeClaim: mock(),
    },
    refetchAll: mock(),
  }),
}));

function queryState<T>(data: T) {
  return {
    data,
    error: null,
    fetchStatus: "idle",
    isLoading: false,
    refetch: mock(),
  };
}

describe("PoolDisplay", () => {
  it("maps pool, wallet, and reward data into the rendered summary", async () => {
    const { PoolDisplay } = await import("../pool-display");

    render(<PoolDisplay poolId={1n} />);

    expect(screen.getByText("Liquidity Token Pool")).toBeTruthy();
    expect(screen.getByText("Total Staked: 200 LPT")).toBeTruthy();
    expect(screen.getByText(/Your Stake: 50 LPT/)).toBeTruthy();
    expect(screen.getByText(/25\.00% of pool/)).toBeTruthy();
    expect(screen.getByText(/Pending Rewards:/).textContent).toContain("2.50 UBQ");
    expect(screen.getByText("Reward Per Day: 447.94 UBQ")).toBeTruthy();
  });
});
