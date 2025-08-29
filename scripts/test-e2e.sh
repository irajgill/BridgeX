#!/bin/bash

set -e

echo "🧪 Running Universal NFT End-to-End Tests"

# Ensure localnet is running
if ! curl -s http://localhost:8545 > /dev/null; then
    echo "❌ Localnet is not running. Please start it with: yarn setup"
    exit 1
fi

if ! curl -s http://localhost:8899 > /dev/null; then
    echo "❌ Solana localnet is not running"
    exit 1
fi

# Load test environment
source .env.localnet

# Build all components
echo "🏗️  Building all components..."
yarn build

# Run contract tests
echo "🧪 Running contract tests..."
cd contracts/zetachain/universal-nft
yarn test
cd ../../evm-connected/universal-nft
yarn test
cd ../../..

# Run Solana program tests
echo "🧪 Running Solana program tests..."
cd programs/solana-universal-nft
anchor test
cd ../..

# Run SDK tests
echo "🧪 Running SDK tests..."
cd sdk
yarn test
cd ..

# Run integration tests
echo "🧪 Running integration tests..."
cd test
yarn test
cd ..

echo "✅ All tests passed!"

# Optional: Run demo app in test mode
echo "🎭 Starting demo app for manual testing..."
cd apps/demo
yarn build
echo "Demo app built successfully. Run 'yarn start' to launch it."
cd ../..

echo "🎉 End-to-end testing complete!"
