# Universal NFT Troubleshooting Guide

## Common Issues and Solutions

### Deployment Issues

#### "Cannot find module" Errors

**Problem**: Missing dependencies during build
```bash
Error: Cannot find module '@zetachain/standard-contracts'
```

**Solution**:
```bash
# Install all dependencies
yarn install

# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install

# For Solana programs
cd programs/solana-universal-nft
anchor build
```

#### "Network not configured" Error

**Problem**: Hardhat network configuration missing
```bash
Error: Network zetachain_localnet is not configured
```

**Solution**:
```typescript
// hardhat.config.ts
networks: {
  zetachain_localnet: {
    url: "http://localhost:8545",
    accounts: [process.env.PRIVATE_KEY || "0xac09..."],
    chainId: 7001,
  }
}
```

#### Insufficient Gas Errors

**Problem**: Gas limit too low for cross-chain transactions
```bash
Error: Transaction reverted: out of gas
```

**Solution**:
```solidity
// Increase gas limit in contract calls
gateway.call{value: msg.value, gas: 500000}(
    receiver,
    destination,
    message,
    // ...
);
```

### Cross-Chain Transfer Issues

#### "Unsupported destination" Error

**Problem**: Destination chain not configured in Universal contract

**Solution**:
```bash
# Configure connected contract
yarn hardhat run scripts/configure.ts -- --universal $UNIVERSAL_ADDRESS --connected $CONNECTED_ADDRESS --zrc20 $ZRC20_ADDRESS
```

#### Transfer Stuck "Processing"

**Problem**: Cross-chain message not being picked up by observers

**Diagnosis**:
```bash
# Check CCTX status
zetachain query crosschain list-cctx --limit 10

# Check specific transaction
zetachain query crosschain show-cctx $TX_HASH
```

**Solution**:
```bash
# Wait for observers (can take 5-15 minutes)
# Check gas prices are sufficient
# Verify gateway contract addresses
```

#### Revert with "Unauthorized sender"

**Problem**: Cross-chain call from wrong address

**Solution**:
```solidity
// Verify sender is Universal contract
require(context.sender == universalContract, "Unauthorized sender");

// Update Universal contract address if needed
connectedNft.setUniversal(newUniversalAddress);
```

### Solana Program Issues

#### "Unauthorized gateway caller"

**Problem**: Gateway PDA verification failed

**Solution**:
```rust
// Verify correct Gateway PDA in program state
let expected_pda = Pubkey::from_str("2f9SLuUNb7TNeM6gzBwT4ZjbL5ZyKzzHg1Ce9yiquEjj")?;
require_eq!(ctx.accounts.program_state.gateway_pda, expected_pda);
```

#### "Account does not exist"

**Problem**: PDA derivation mismatch

**Solution**:
```rust
// Verify PDA derivation seeds
let (pda, bump) = Pubkey::find_program_address(
    &[b"nft_state", universal_token_id.to_le_bytes().as_ref()],
    program_id
);
```

#### Program deployment fails

**Problem**: Insufficient SOL or program too large

**Solution**:
```bash
# Check SOL balance
solana balance

# Request airdrop on devnet
solana airdrop 2

# Optimize program size
[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
```

### SDK and Frontend Issues

#### MetaMask Connection Issues

**Problem**: Wallet not connecting or wrong network

**Solution**:
```typescript
// Check if MetaMask is installed
if (typeof window.ethereum === 'undefined') {
  alert('Please install MetaMask');
  return;
}

// Request account access
await window.ethereum.request({
  method: 'eth_requestAccounts'
});

// Switch to correct network
await window.ethereum.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: '0x1B59' }], // ZetaChain testnet
});
```

#### Phantom Wallet Issues

**Problem**: Solana wallet not connecting

**Solution**:
```typescript
import { WalletAdapter } from '@solana/wallet-adapter-react';

// Check wallet adapter configuration
const wallets = useMemo(
  () => [new PhantomWalletAdapter()],
  []
);

// Verify connection
if (!wallet.connected) {
  await wallet.connect();
}
```

#### "Invalid signature" Errors

**Problem**: Transaction signing issues

**Solution**:
```typescript
// Ensure signer has provider
const signerWithProvider = signer.connect(provider);

// For Solana, verify keypair
const isValidKeypair = keypair.publicKey.equals(expectedPublicKey);
```

### Testing Issues

#### Localnet Not Starting

**Problem**: Port conflicts or Docker issues

**Solution**:
```bash
# Check port usage
lsof -i :8545
lsof -i :8546
lsof -i :8899

# Kill conflicting processes
kill -9 $PID

# Restart Docker
docker-compose down -v
docker-compose up -d

# Reset localnet data
rm -rf infra/localnet-data
```

#### Tests Timing Out

**Problem**: Cross-chain operations taking too long

**Solution**:
```typescript
// Increase test timeout
describe('Cross-chain tests', function() {
  this.timeout(120000); // 2 minutes

  it('should transfer cross-chain', async function() {
    // Add explicit waits
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Poll for completion
    let attempts = 0;
    while (attempts < 10) {
      const status = await checkStatus();
      if (status === 'completed') break;
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
  });
});
```

### Performance Issues

#### Slow RPC Responses

**Problem**: Public RPC rate limiting

**Solution**:
```typescript
// Use multiple RPC endpoints with fallback
const providers = [
  new ethers.providers.JsonRpcProvider(primaryRpc),
  new ethers.providers.JsonRpcProvider(fallbackRpc)
];

// Implement retry logic
async function callWithRetry(provider, method, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await provider.send(method, params);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

#### High Gas Costs

**Problem**: Inefficient contract execution

**Solution**:
```solidity
// Optimize storage reads
mapping(uint256 => TokenData) private _tokens;

// Pack structs efficiently
struct TokenData {
    address creator;    // 20 bytes
    uint96 timestamp;   // 12 bytes (fits in single slot)
}

// Use events for data that doesn't need on-chain storage
event TokenMinted(uint256 indexed tokenId, string uri);
```

## Debug Commands

### Contract State Verification

```bash
# Check Universal NFT state
yarn hardhat console --network zetachain_localnet
> const contract = await ethers.getContractAt("UniversalNFT", "0x...");
> await contract.getCurrentTokenId();
> await contract.connectedContracts("0x2ca7d64A7EFE2D62A725E2B35Cf7230D6677FfEe");

# Check Connected NFT state  
> const connected = await ethers.getContractAt("ConnectedNFT", "0x...");
> await connected.universalContract();
```

### Solana Program State

```bash
# Check program account
anchor account programState $PROGRAM_STATE_PDA

# Check NFT state
anchor account nftState $NFT_STATE_PDA

# View program logs
solana logs $PROGRAM_ID
```

### Transaction Analysis

```bash
# Ethereum transaction trace
cast run $TX_HASH --rpc-url $RPC_URL --trace

# Solana transaction details
solana confirm $TX_SIGNATURE --verbose
```

### Network Connectivity

```bash
# Test RPC endpoints
curl -X POST -H "Content-Type: application/json"   --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'   $ZETACHAIN_RPC_URL

curl -X POST -H "Content-Type: application/json"   --data '{"jsonrpc":"2.0","method":"getHealth","params":[],"id":1}'   $SOLANA_RPC_URL
```

## Getting Help

### Documentation Resources

- [ZetaChain Documentation](https://www.zetachain.com/docs/)
- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)

### Community Support

- [Discord](https://discord.gg/zetachain)
- [GitHub Issues](https://github.com/your-org/universal-nft-cross-chain/issues)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/zetachain)

### Professional Support

For production deployments, consider:
- Professional security audits
- Dedicated RPC endpoints
- Priority support channels
- Custom integration assistance