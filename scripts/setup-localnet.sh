#!/bin/bash

set -e

echo "🚀 Setting up Universal NFT Localnet Environment"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v yarn >/dev/null 2>&1 || { echo "❌ Yarn is required but not installed. Aborting." >&2; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "❌ Anchor CLI is required but not installed. Aborting." >&2; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
yarn install

# Setup environment variables
if [ ! -f .env.localnet ]; then
    echo "📝 Creating localnet environment file..."
    cp .env.example .env.localnet
fi

# Start ZetaChain localnet with Solana support
echo "🔗 Starting ZetaChain Localnet with Solana..."
yarn zetachain localnet start --chains solana &
LOCALNET_PID=$!

# Wait for localnet to be ready
echo "⏳ Waiting for localnet to initialize..."
sleep 30

# Check if localnet is running
if ! curl -s http://localhost:8545 > /dev/null; then
    echo "❌ Localnet failed to start"
    exit 1
fi

echo "✅ Localnet is ready!"

# Build Solana program
echo "🏗️  Building Solana program..."
cd programs/solana-universal-nft
anchor build
cd ../..

# Deploy contracts and programs
echo "📋 Deploying contracts and programs..."
./scripts/deploy-all.sh

echo "🎉 Setup complete! Localnet is running with PID: $LOCALNET_PID"
echo "💡 Run 'kill $LOCALNET_PID' to stop the localnet"
echo "🔧 To deploy to testnet, run: ./scripts/deploy-testnet.sh"
