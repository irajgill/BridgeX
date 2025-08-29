# Universal NFT Deployment Guide

## Prerequisites

### System Requirements

- **Node.js** >= 18.0.0
- **Yarn** >= 1.22.0
- **Rust** >= 1.70.0
- **Anchor CLI** >= 0.29.0
- **Solana CLI** >= 1.16.0
- **Docker** (for localnet)

### Tool Installation

```bash
# Install Node.js and Yarn
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
npm install -g yarn

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v1.16.0/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor anchor-cli --locked
```

## Localnet Deployment

### Quick Start

```bash
# Clone and setup
git clone https://github.com/your-org/universal-nft-cross-chain.git
cd universal-nft-cross-chain

# One-command setup
yarn setup
```

### Manual Setup

```bash
# Install dependencies
yarn install

# Start localnet infrastructure
docker-compose up -d

# Deploy contracts
./scripts/deploy-all.sh

# Configure cross-chain connections
./scripts/configure-contracts.sh

# Run tests
yarn test:e2e
```

## Testnet Deployment

### Environment Setup

```bash
# Create testnet environment
cp .env.example .env.testnet

# Edit configuration
vim .env.testnet
```

### Required Environment Variables

```bash
# ZetaChain
ZETACHAIN_RPC_URL=https://zetachain-athens-evm.blockpi.network/v1/rpc/public
ZETACHAIN_PRIVATE_KEY=your_private_key

# EVM Testnets
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_private_key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_base58_key
```

### Deploy to Testnets

```bash
# Deploy ZetaChain Universal NFT
cd contracts/zetachain/universal-nft
yarn deploy:testnet

# Deploy EVM Connected NFTs
cd ../../../contracts/evm-connected/universal-nft
yarn deploy:sepolia
yarn deploy:base

# Deploy Solana Program
cd ../../../programs/solana-universal-nft
anchor build
anchor deploy --provider.cluster devnet

# Configure cross-chain connections
./scripts/configure-contracts.sh --network testnet
```

## Mainnet Deployment

### Security Checklist

- [ ] Multi-sig wallet setup for admin functions
- [ ] Contract verification on block explorers
- [ ] Security audit completed
- [ ] Test transactions on testnets
- [ ] Emergency pause mechanisms tested

### Deployment Steps

```bash
# Set mainnet environment
cp .env.testnet .env.mainnet
# Update with mainnet RPC URLs and keys

# Deploy with mainnet configuration
NODE_ENV=mainnet ./scripts/deploy-all.sh

# Verify all contracts
yarn verify:all

# Configure with production settings
./scripts/configure-contracts.sh --network mainnet
```

## Verification

### Contract Verification

```bash
# ZetaChain (Blockscout)
yarn hardhat verify --network zeta_mainnet CONTRACT_ADDRESS

# Ethereum Sepolia
yarn hardhat verify --network sepolia CONTRACT_ADDRESS

# Base Sepolia
yarn hardhat verify --network base_sepolia CONTRACT_ADDRESS
```

### Solana Program Verification

```bash
# Build verifiable binary
anchor build --verifiable

# Submit for verification
solana program deploy --program-id PROGRAM_ID target/verifiable/program.so
```

## Post-Deployment

### Address Management

Update `infra/addresses.json` with deployed addresses:

```json
{
  "mainnet": {
    "zetachain": {
      "universalNft": "0x...",
      "gateway": "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf"
    },
    "ethereum": {
      "connectedNft": "0x...",
      "gateway": "0x70e967acFcC17c3941E87562161406d41676FD83"
    },
    "solana": {
      "programId": "UnivNFT...",
      "gatewayPda": "GatewayPDA..."
    }
  }
}
```

### Monitoring Setup

```bash
# Deploy monitoring infrastructure
docker-compose -f docker-compose.monitoring.yml up -d

# Configure alerts
./scripts/setup-monitoring.sh
```

### SDK Configuration

```typescript
// Update SDK with production addresses
const sdk = new UniversalNFTSDK(
  {
    chainId: 7000,
    rpcUrl: 'https://zetachain-evm.blockpi.network/v1/rpc/public',
    gatewayAddress: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf',
    universalNftAddress: addresses.mainnet.zetachain.universalNft
  },
  evmConfigs,
  solanaConfig
);
```

## Troubleshooting

### Common Issues

**Deployment Fails**
```bash
# Check network connectivity
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' $RPC_URL

# Verify private key has funds
cast balance $ADDRESS --rpc-url $RPC_URL
```

**Configuration Issues**
```bash
# Validate contract addresses
yarn hardhat run scripts/validate-deployment.ts

# Check cross-chain connections
yarn test:integration
```

**Solana Program Issues**
```bash
# Check program deployment
solana program show PROGRAM_ID

# Validate accounts
anchor account programState ACCOUNT_ADDRESS
```