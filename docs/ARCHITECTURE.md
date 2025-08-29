# Universal NFT Architecture

## Overview

The Universal NFT implementation enables seamless NFT transfers across ZetaChain, EVM-compatible chains, and Solana while maintaining persistent token IDs and metadata consistency.

## Architecture Components

### 1. Universal Contract (ZetaChain)

The Universal contract serves as the central hub for all cross-chain NFT operations:

- **Location**: Deployed on ZetaChain
- **Role**: Orchestrates all cross-chain transfers
- **Key Functions**:
  - `safeMint()`: Create new universal NFTs
  - `transferCrossChain()`: Initiate cross-chain transfers
  - `onCall()`: Handle incoming transfers from connected chains
  - `onRevert()`: Handle failed transfers

### 2. Connected Contracts (EVM Chains)

Connected contracts enable NFT operations on EVM-compatible chains:

- **Location**: Deployed on each supported EVM chain
- **Role**: Local NFT operations and cross-chain messaging
- **Key Functions**:
  - `safeMint()`: Create NFTs that can be transferred cross-chain
  - `transferCrossChain()`: Send NFTs to other chains via ZetaChain
  - `onCall()`: Receive NFTs from other chains

### 3. Solana Program

The Solana program handles NFT operations using Metaplex standards:

- **Location**: Deployed on Solana
- **Role**: NFT minting, burning, and metadata management
- **Key Instructions**:
  - `on_call()`: Receive cross-chain calls from ZetaChain Gateway
  - `burn_to_universal()`: Return NFTs to other chains
  - `update_metadata_from_universal()`: Update NFT metadata

## Cross-Chain Flow

### ZetaChain → Solana

1. User calls `transferCrossChain()` on Universal contract
2. NFT is burned on ZetaChain
3. Gateway `withdrawAndCall` invoked with Solana program accounts
4. Solana program receives `on_call` instruction
5. NFT minted on Solana with same universal ID

### Solana → EVM

1. User calls `burn_to_universal()` on Solana program
2. NFT burned on Solana, event emitted
3. ZetaChain observers detect event
4. Universal contract processes return via `onCall`
5. NFT minted on destination EVM chain

### EVM → EVM (via ZetaChain)

1. User calls `transferCrossChain()` on Connected contract
2. NFT burned on source EVM chain
3. Message sent to ZetaChain Universal contract
4. Universal contract routes to destination Connected contract
5. NFT minted on destination EVM chain

## Security Model

### Trust Assumptions

- ZetaChain validators are trusted to relay messages correctly
- Gateway contracts are trusted entry points
- Program state modifications require proper authorization

### Validation Mechanisms

- Connected contracts verify Universal contract address
- Solana program validates Gateway PDA signatures
- Revert mechanisms protect against failed transfers

## Data Persistence

### Universal Token ID

- Generated on first mint (ZetaChain or EVM)
- Preserved across all chain transfers
- Used as deterministic seed for Solana PDAs

### Metadata Consistency

- Stored on-chain and referenced via IPFS URIs
- Propagated during cross-chain transfers
- Updatable via cross-chain calls

## Gas and Fee Structure

### ZetaChain Operations

- Minting: Standard EVM gas fees
- Cross-chain transfers: Gas + cross-chain fees

### EVM Operations

- Local operations: Standard gas fees
- Cross-chain transfers: Gas + message passing fees

### Solana Operations

- Program calls: Standard compute unit fees
- Cross-chain returns: Compute units + event emission