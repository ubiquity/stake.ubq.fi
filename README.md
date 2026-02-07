# Ubiquity Stake (`stake.ubq.fi`)

Staking frontend for the Ubiquity protocol. Built with React, Vite, wagmi, viem, and TanStack Query. Provides a minimal and fast interface to stake LP tokens, manage allowances, view pool stats, and claim rewards.

## 🚀 Quick Start

Prerequisites: Bun (<https://bun.sh>) and an injected wallet extension.

```bash
git clone https://github.com/ubiquity/stake.ubq.fi.git
cd stake.ubq.fi
bun install

# Start against public mainnet RPC (default dev mode)
bun run dev

# OR start with a local Anvil + mainnet fork / local contracts
bun run local
```

Visit: <http://localhost:5173>

### 🧪 Local Mainnet Fork (Anvil) Setup

Use this if you want to test staking flows against a deterministic mainnet fork with local state changes.

Prerequisites:

- Foundry installed (`cast`, `anvil`). Install: `curl -L https://foundry.paradigm.xyz | bash` then `foundryup`.
- Clone the protocol repo `ubiquity/ubiquity-dollar` (contracts + migration scripts).

#### 1. Clone contracts repo

```bash
git clone https://github.com/ubiquity/ubiquity-dollar.git
cd ubiquity-dollar
```

#### 2. Start a mainnet fork

In one terminal (leave it running):

```bash
anvil --fork-url https://eth.merkle.io --chain-id 31337
```

You can substitute another mainnet RPC URL if needed (Alchemy / Infura / custom).

#### 3. Run migration script

In another terminal at the root of `ubiquity-dollar`:

```bash
yarn
cd ./packages/contracts/
cp .env.example .env
yarn run build
yarn run deploy:mainnet:qa
```

This deploys the required staking-related contracts to your forked chain.

#### 4. Start the frontend in local mode

In the `stake.ubq.fi` project root (new terminal):

```bash
bun run local
```

#### 5. Fund the default Anvil test account with LP tokens

Impersonate the LUSD/UUSD LP token holder and transfer tokens to the first Anvil account (default address index 0: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`) or your own address if you prefer.

```bash
export WHALE_ADDRESS=0xefC0e701A824943b469a694aC564Aa1efF7Ab7dd
export LP_TOKEN_ADDRESS=0xcC68509F9cA0E1ed119EAC7c468EC1b1C42f384F
export RECIPIENT_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
cast rpc anvil_impersonateAccount $WHALE_ADDRESS
cast send $LP_TOKEN_ADDRESS \
    --from $WHALE_ADDRESS \
    "transfer(address,uint256)(bool)" \
    $RECIPIENT_ADDRESS \
    10000000000000000000000 \
    --unlocked
```

#### 6. Stake & simulate rewards

Use the UI to Approve and Stake. To advance blocks and accrue rewards rapidly:

```bash
cast rpc evm_mine
```

## 🔧 Scripts

| Script            | Purpose                                                      |
| ----------------- | ------------------------------------------------------------ |
| `bun run dev`     | Dev server (MODE=dev) using remote RPC                       |
| `bun run local`   | Dev server (MODE=local-node) enabling `anvil` chain id 31337 |
| `bun run build`   | Production build to `dist/`                                  |
| `bun run preview` | Serve `dist/` locally for preview (port `4173`)              |
| `bun run lint`    | ESLint over the repo                                         |

## 🧪 E2E Smoke (Playwright)

Smoke tests run in Chromium only and can target either a dev server or a built preview.

```bash
# Dev mode (starts Vite dev server on http://localhost:5173)
E2E_MODE=dev bun run e2e

# Preview mode (builds then serves on http://localhost:4173)
E2E_MODE=preview bun run e2e
```

## 🌐 RPC Resolution

Defined in `src/constants/config.ts`:

1. If `VITE_RPC_URL` env var is set → use it directly.
2. Else if development build or hostname includes `.deno.dev` (preview) → `https://rpc.ubq.fi`.
3. Else in production build → relative `/rpc` (can be reverse‑proxied / cached).

`local-node` mode adds the Anvil chain (31337) and uses the raw `RPC_URL` (no chain ID suffix) for all chains.

## 📦 Production Build & Deploy

```bash
bun run build
```

Outputs to `dist/`. Serve behind a CDN / static host. If you proxy RPC, map `/rpc/*` to your upstream provider for chain ID–scoped calls (`/${chainId}` suffix) except in `local-node` mode.

## Deno Deploy

To run your own instance on Deno Deploy:

1. Sign in to [Deno Deploy](https://dash.deno.com) with a GitHub account that has access to the forked repository (any organization works).
2. Click **New Project**, choose **Git** integration, and select the `<your_org>/stake.ubq.fi` repository fork.
3. When prompted for the project name, keep it identical to the repo slug (`stake-ubq-fi`). Deno will normalize the dots automatically.
4. Confirm the existing CI deploy script configuration and create the project. Deployments will follow whatever branch target you choose.
