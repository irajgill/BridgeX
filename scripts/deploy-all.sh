#!/bin/bash

set -e

echo "🚀 Deploying Universal NFT Contracts and Programs"

# Load environment variables
source .env.localnet

# Deploy ZetaChain Universal NFT
echo "📋 Deploying ZetaChain Universal NFT..."
cd contracts/zetachain/universal-nft
ZETACHAIN_NFT=$(yarn hardhat run scripts/deploy.ts --network zetachain_localnet | grep "Contract deployed to:" | awk '{print $4}')
echo "✅ ZetaChain Universal NFT deployed to: $ZETACHAIN_NFT"
cd ../../..

# Deploy EVM Connected NFT
echo "📋 Deploying EVM Connected NFT..."
cd contracts/evm-connected/universal-nft
EVM_NFT=$(yarn hardhat run scripts/deploy.ts --network ethereum_localnet | grep "Contract deployed to:" | awk '{print $4}')
echo "✅ EVM Connected NFT deployed to: $EVM_NFT"
cd ../../..

# Deploy Solana Program
echo "📋 Deploying Solana Universal NFT Program..."
cd programs/solana-universal-nft
SOLANA_PROGRAM=$(anchor deploy | grep "Program Id:" | awk '{print $3}')
echo "✅ Solana Universal NFT Program deployed: $SOLANA_PROGRAM"
cd ../..

# Configure contracts
echo "🔧 Configuring cross-chain connections..."

# Set connected contract on ZetaChain
cd contracts/zetachain/universal-nft
yarn hardhat run scripts/configure.ts --network zetachain_localnet -- --universal $ZETACHAIN_NFT --connected $EVM_NFT --zrc20 "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"
cd ../../..

# Set universal contract on EVM
cd contracts/evm-connected/universal-nft
yarn hardhat run scripts/configure.ts --network ethereum_localnet -- --connected $EVM_NFT --universal $ZETACHAIN_NFT
cd ../../..

# Initialize Solana program
cd programs/solana-universal-nft
anchor run initialize -- --program-id $SOLANA_PROGRAM --gateway-pda "2f9SLuUNb7TNeM6gzBwT4ZjbL5ZyKzzHg1Ce9yiquEjj"
cd ../..

# Update addresses file
echo "📝 Updating addresses file..."
cat > infra/addresses.json << EOF
{
  "localnet": {
    "zetachain": {
      "universalNft": "$ZETACHAIN_NFT",
      "gateway": "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"
    },
    "ethereum": {
      "connectedNft": "$EVM_NFT",
      "gateway": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    },
    "solana": {
      "programId": "$SOLANA_PROGRAM",
      "gatewayPda": "2f9SLuUNb7TNeM6gzBwT4ZjbL5ZyKzzHg1Ce9yiquEjj"
    }
  }
}
EOF

echo "✅ All contracts deployed and configured!"
echo "📋 Contract addresses saved to infra/addresses.json"
echo "🎉 Ready for testing! Run: yarn test:e2e"
