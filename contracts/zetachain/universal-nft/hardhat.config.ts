import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../../.env.localnet" });

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    zetachain_localnet: {
      url: "http://localhost:8545",
      accounts: [process.env.PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
      chainId: 7001,
    },
    zeta_testnet: {
      url: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
      accounts: [process.env.ZETACHAIN_PRIVATE_KEY || ""],
      chainId: 7001,
    },
    zeta_mainnet: {
      url: "https://zetachain-evm.blockpi.network/v1/rpc/public",
      accounts: [process.env.ZETACHAIN_PRIVATE_KEY || ""],
      chainId: 7000,
    },
  },
  etherscan: {
    apiKey: {
      zetachain_testnet: "NOT_REQUIRED",
      zetachain_mainnet: "NOT_REQUIRED",
    },
    customChains: [
      {
        network: "zetachain_testnet",
        chainId: 7001,
        urls: {
          apiURL: "https://zetachain-athens.blockscout.com/api",
          browserURL: "https://zetachain-athens.blockscout.com",
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;