# Universal NFT API Reference

## TypeScript SDK

### Installation

```bash
npm install @universal-nft/sdk
# or
yarn add @universal-nft/sdk
```

### Initialization

```typescript
import { UniversalNFTSDK, ChainConfig, SolanaConfig } from '@universal-nft/sdk';

const sdk = new UniversalNFTSDK(
  zetachainConfig: ChainConfig,
  evmConfigs: ChainConfig[],
  solanaConfig: SolanaConfig
);
```

### Configuration Types

```typescript
interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  gatewayAddress: string;
  universalNftAddress?: string;
  connectedNftAddress?: string;
}

interface SolanaConfig {
  rpcUrl: string;
  programId: string;
  gatewayPda: string;
}

interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}
```

## Core Methods

### `mintOnZetaChain(signer, to, metadata)`

Mint an NFT on the ZetaChain Universal contract.

```typescript
const result = await sdk.mintOnZetaChain(
  signer: ethers.Signer,
  to: string,
  metadata: NFTMetadata
);

// Returns: CrossChainTransferResult
{
  txHash: string;
  tokenId?: string;
  status: 'pending' | 'success' | 'failed';
}
```

### `mintOnEVM(chainId, signer, to, metadata)`

Mint an NFT on an EVM Connected contract.

```typescript
const result = await sdk.mintOnEVM(
  chainId: number,
  signer: ethers.Signer,
  to: string,
  metadata: NFTMetadata
);
```

### `transferToSolana(signer, tokenId, solanaRecipient)`

Transfer an NFT from ZetaChain to Solana.

```typescript
const result = await sdk.transferToSolana(
  signer: ethers.Signer,
  tokenId: string,
  solanaRecipient: string
);
```

### `transferFromSolana(keypair, tokenId, chainId, recipient)`

Transfer an NFT from Solana back to an EVM chain.

```typescript
const result = await sdk.transferFromSolana(
  solanaKeypair: Keypair,
  universalTokenId: string,
  destinationChainId: number,
  evmRecipient: string
);
```

### `queryNFT(tokenId)`

Query NFT status across all supported chains.

```typescript
const result = await sdk.queryNFT(tokenId: string);

// Returns: NFTQueryResult
{
  zetachain?: {
    owner: string;
    uri: string;
    creator: string;
  };
  evm?: Map<number, {
    owner: string;
    uri: string;
    creator: string;
  }>;
  solana?: {
    exists: boolean;
    pda: string;
    owner?: string;
    mint?: string;
  };
}
```

## Smart Contract Interfaces

### Universal NFT (ZetaChain)

```solidity
interface IUniversalNFT {
    function safeMint(address to, string memory uri) external returns (uint256);

    function transferCrossChain(
        uint256 tokenId,
        bytes memory receiver,
        address destination
    ) external payable;

    function setConnected(address zrc20, address contractAddress) external;

    function getCurrentTokenId() external view returns (uint256);

    function getCreator(uint256 tokenId) external view returns (address);
}
```

### Connected NFT (EVM)

```solidity
interface IConnectedNFT {
    function safeMint(address to, string memory uri) external returns (uint256);

    function transferCrossChain(
        uint256 tokenId,
        bytes memory receiver,
        address destination
    ) external payable;

    function setUniversal(address universalContract) external;
}
```

### Solana Program Interface

```rust
pub mod solana_universal_nft {
    // Initialize program
    pub fn initialize(
        ctx: Context<Initialize>,
        collection_name: String,
        collection_symbol: String,
        collection_uri: String,
        gateway_pda: Pubkey,
    ) -> Result<()>

    // Handle cross-chain calls
    pub fn on_call(
        ctx: Context<OnCall>,
        amount: u64,
        sender: [u8; 20],
        data: Vec<u8>,
    ) -> Result<()>

    // Burn NFT for return transfer
    pub fn burn_to_universal(
        ctx: Context<BurnToUniversal>,
        universal_token_id: u64,
        destination_chain: Vec<u8>,
        receiver: Vec<u8>,
    ) -> Result<()>

    // Update metadata
    pub fn update_metadata_from_universal(
        ctx: Context<UpdateMetadataFromUniversal>,
        universal_token_id: u64,
        new_uri: String,
        new_name: String,
    ) -> Result<()>
}
```

## Gateway Wiring

### Solana Message Encoding

```typescript
import { SolanaEncoder } from '@universal-nft/gateway-wiring';

// Encode cross-chain payload
const payload = SolanaEncoder.encodeWithdrawAndCallPayload(
  programId: string,
  instruction: CrossChainInstruction,
  accounts: SolanaAccountMeta[]
);

// Generate program accounts
const accounts = SolanaEncoder.generateMintFromUniversalAccounts(
  programId: string,
  universalTokenId: bigint,
  recipient: string,
  gatewayPda: string
);
```

### EVM Message Encoding

```typescript
import { EVMEncoder } from '@universal-nft/gateway-wiring';

// Encode cross-chain message
const message = EVMEncoder.encodeCrossChainMessage({
  tokenId: BigInt(tokenId),
  receiver: recipientAddress,
  uri: metadataUri,
  creator: creatorAddress,
  originalOwner: ownerAddress
});
```

## Error Handling

### Common Error Codes

```typescript
// ZetaChain/EVM
- "UniversalNFT: token does not exist"
- "UniversalNFT: not token owner"  
- "UniversalNFT: unsupported destination"
- "ConnectedNFT: universal contract not set"

// Solana
- UnauthorizedGateway: "Unauthorized gateway caller"
- InvalidPayload: "Invalid payload format"
- TokenNotOwned: "Token not owned by signer"
```

### Error Handling Pattern

```typescript
try {
  const result = await sdk.transferToSolana(signer, tokenId, recipient);

  if (result.status === 'failed') {
    console.error('Transfer failed');
    return;
  }

  // Monitor transaction
  await sdk.monitorTransaction(result.txHash, (status, data) => {
    console.log(`Status: ${status}`, data);
  });

} catch (error) {
  if (error.message.includes('not token owner')) {
    alert('You do not own this NFT');
  } else if (error.message.includes('unsupported destination')) {
    alert('Chain not supported');
  } else {
    alert(`Transfer failed: ${error.message}`);
  }
}
```

## Rate Limits and Best Practices

### RPC Rate Limits

- ZetaChain Public RPC: 100 requests/minute
- Solana Public RPC: 100 requests/minute  
- Consider using private RPC providers for production

### Gas Optimization

```typescript
// Estimate gas before transactions
const gasEstimate = await sdk.estimateTransferGas(
  sourceChainId,
  destinationChainId, 
  tokenId
);

console.log(`Estimated cost: ${ethers.utils.formatEther(gasEstimate.totalCost)} ETH`);
```

### Batch Operations

```typescript
// Batch multiple operations
const promises = tokenIds.map(tokenId => 
  sdk.queryNFT(tokenId)
);

const results = await Promise.allSettled(promises);
```