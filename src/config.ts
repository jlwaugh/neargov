const contractPerNetwork = {
  mainnet: "social.near",
  testnet: "v1.social08.testnet",
} as const;

type NetworkId = keyof typeof contractPerNetwork;

// Chains for EVM Wallets
const evmWalletChains = {
  mainnet: {
    chainId: 397,
    name: "Near Mainnet",
    explorer: "https://eth-explorer.near.org",
    rpc: "https://eth-rpc.mainnet.near.org",
  },
  testnet: {
    chainId: 398,
    name: "Near Testnet",
    explorer: "https://eth-explorer-testnet.near.org",
    rpc: "https://eth-rpc.testnet.near.org",
  },
} as const;

export const NetworkId: NetworkId = "mainnet";
export const SocialContract = contractPerNetwork[NetworkId];
export const EVMWalletChain = evmWalletChains[NetworkId];
