#!/bin/bash

set -e

echo "🔧 Configuring Universal NFT Cross-Chain Connections"

# Load environment variables
if [ -f .env.localnet ]; then
    source .env.localnet
elif [ -f .env.testnet ]; then
    source .env.testnet
else
    echo "❌ No environment file found"
    exit 1
fi

# Parse command line arguments
NETWORK="localnet"
while [[ $# -gt 0 ]]; do
    case $1 in
        --network)
            NETWORK="$2"
            shift
            shift
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

echo "Configuring for network: $NETWORK"

# Read addresses from file
ADDRESSES_FILE="infra/addresses.json"
if [ ! -f "$ADDRESSES_FILE" ]; then
    echo "❌ Addresses file not found: $ADDRESSES_FILE"
    exit 1
fi

# Extract addresses using jq (assuming it's available)
ZETACHAIN_NFT=$(cat $ADDRESSES_FILE | jq -r ".$NETWORK.zetachain.universalNft")
EVM_NFT=$(cat $ADDRESSES_FILE | jq -r ".$NETWORK.ethereum.connectedNft")
SOLANA_PROGRAM=$(cat $ADDRESSES_FILE | jq -r ".$NETWORK.solana.programId")

echo "Universal NFT: $ZETACHAIN_NFT"
echo "Connected NFT: $EVM_NFT" 
echo "Solana Program: $SOLANA_PROGRAM"

# Configure ZetaChain Universal contract
echo "🔧 Configuring ZetaChain Universal contract..."
cd contracts/zetachain/universal-nft
yarn hardhat run scripts/configure.ts --network "zetachain_$NETWORK" -- --universal "$ZETACHAIN_NFT" --connected "$EVM_NFT" --zrc20 "0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe"
cd ../../..

# Configure EVM Connected contract  
echo "🔧 Configuring EVM Connected contract..."
cd contracts/evm-connected/universal-nft
yarn hardhat run scripts/configure.ts --network "ethereum_$NETWORK" -- --connected "$EVM_NFT" --universal "$ZETACHAIN_NFT"
cd ../../..

echo "✅ All cross-chain connections configured!"
