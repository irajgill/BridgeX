import { ethers } from 'ethers';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { SolanaEncoder, MintFromUniversalPayload } from '../gateway-wiring/src/encoders/solana';
import { ChainConfig, SolanaConfig, NFTMetadata, CrossChainTransferResult, NFTQueryResult } from './types';
import { ZetaChainClient } from './chains/zetachain';
import { EVMClient } from './chains/evm';
import { SolanaClient } from './chains/solana';

export class UniversalNFTSDK {
  private zetachainClient: ZetaChainClient;
  private evmClients: Map<number, EVMClient> = new Map();
  private solanaClient: SolanaClient;
  private zetachainConfig: ChainConfig;
  private evmConfigs: Map<number, ChainConfig> = new Map();
  private solanaConfig: SolanaConfig;

  constructor(
    zetachainConfig: ChainConfig,
    evmConfigs: ChainConfig[],
    solanaConfig: SolanaConfig
  ) {
    this.zetachainConfig = zetachainConfig;
    this.solanaConfig = solanaConfig;

    // Initialize clients
    this.zetachainClient = new ZetaChainClient(zetachainConfig);
    this.solanaClient = new SolanaClient(solanaConfig);

    // Initialize EVM clients
    evmConfigs.forEach(config => {
      this.evmConfigs.set(config.chainId, config);
      this.evmClients.set(config.chainId, new EVMClient(config));
    });
  }

  /**
   * Mint NFT on ZetaChain Universal contract
   */
  async mintOnZetaChain(
    signer: ethers.Signer,
    to: string,
    metadata: NFTMetadata
  ): Promise<CrossChainTransferResult> {
    return await this.zetachainClient.mintNFT(signer, to, metadata);
  }

  /**
   * Mint NFT on EVM Connected contract
   */
  async mintOnEVM(
    chainId: number,
    signer: ethers.Signer,
    to: string,
    metadata: NFTMetadata
  ): Promise<CrossChainTransferResult> {
    const evmClient = this.evmClients.get(chainId);
    if (!evmClient) {
      throw new Error(`Unsupported EVM chain: ${chainId}`);
    }

    return await evmClient.mintNFT(signer, to, metadata);
  }

  /**
   * Transfer NFT from ZetaChain to Solana
   */
  async transferToSolana(
    signer: ethers.Signer,
    tokenId: string,
    solanaRecipient: string
  ): Promise<CrossChainTransferResult> {
    // Get token metadata from ZetaChain
    const tokenData = await this.zetachainClient.getTokenData(tokenId);

    // Prepare Solana accounts and instruction data
    const accounts = SolanaEncoder.generateMintFromUniversalAccounts(
      this.solanaConfig.programId,
      BigInt(tokenId),
      solanaRecipient,
      this.solanaConfig.gatewayPda
    );

    const mintPayload: MintFromUniversalPayload = {
      universalTokenId: BigInt(tokenId),
      recipient: solanaRecipient,
      uri: tokenData.uri,
      name: tokenData.name || `Universal NFT #${tokenId}`,
      symbol: tokenData.symbol || 'UNFT',
      creator: tokenData.creator,
      royaltyBps: 500 // 5% default royalty
    };

    return await this.zetachainClient.transferToSolana(
      signer,
      tokenId,
      mintPayload,
      accounts,
      this.solanaConfig.programId
    );
  }

  /**
   * Transfer NFT from Solana back to EVM chain
   */
  async transferFromSolana(
    solanaKeypair: Keypair,
    universalTokenId: string,
    destinationChainId: number,
    evmRecipient: string
  ): Promise<CrossChainTransferResult> {
    const destinationConfig = this.evmConfigs.get(destinationChainId);
    if (!destinationConfig) {
      throw new Error(`Unsupported destination chain: ${destinationChainId}`);
    }

    return await this.solanaClient.burnToUniversal(
      solanaKeypair,
      universalTokenId,
      destinationConfig.gatewayAddress,
      evmRecipient
    );
  }

  /**
   * Transfer NFT between EVM chains via ZetaChain
   */
  async transferBetweenEVM(
    sourceChainId: number,
    destinationChainId: number,
    signer: ethers.Signer,
    tokenId: string,
    recipient: string
  ): Promise<CrossChainTransferResult> {
    const sourceClient = this.evmClients.get(sourceChainId);
    const destinationConfig = this.evmConfigs.get(destinationChainId);

    if (!sourceClient || !destinationConfig) {
      throw new Error('Invalid chain configuration');
    }

    return await sourceClient.transferCrossChain(
      signer,
      tokenId,
      recipient,
      destinationConfig.gatewayAddress
    );
  }

  /**
   * Query NFT information across all chains
   */
  async queryNFT(tokenId: string): Promise<NFTQueryResult> {
    const result: NFTQueryResult = {
      evm: new Map()
    };

    try {
      // Check ZetaChain
      try {
        const zetachainData = await this.zetachainClient.getTokenData(tokenId);
        if (zetachainData.exists) {
          result.zetachain = {
            owner: zetachainData.owner,
            uri: zetachainData.uri,
            creator: zetachainData.creator
          };
        }
      } catch (e) {
        // Token not on ZetaChain
      }

      // Check EVM chains
      for (const [chainId, client] of this.evmClients) {
        try {
          const evmData = await client.getTokenData(tokenId);
          if (evmData.exists) {
            result.evm!.set(chainId, {
              owner: evmData.owner,
              uri: evmData.uri,
              creator: evmData.creator
            });
          }
        } catch (e) {
          // Token not on this EVM chain
        }
      }

      // Check Solana
      try {
        const solanaData = await this.solanaClient.getTokenData(tokenId);
        if (solanaData.exists) {
          result.solana = {
            exists: true,
            pda: solanaData.pda,
            owner: solanaData.owner,
            mint: solanaData.mint
          };
        }
      } catch (e) {
        // Token not on Solana
      }

    } catch (error) {
      console.error('Error querying NFT:', error);
    }

    return result;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): {
    zetachain: ChainConfig;
    evm: ChainConfig[];
    solana: SolanaConfig;
  } {
    return {
      zetachain: this.zetachainConfig,
      evm: Array.from(this.evmConfigs.values()),
      solana: this.solanaConfig
    };
  }

  /**
   * Estimate gas for cross-chain transfer
   */
  async estimateTransferGas(
    sourceChainId: number,
    destinationChainId: number,
    tokenId: string
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    totalCost: bigint;
  }> {
    // Implementation would calculate gas costs based on source and destination
    return {
      gasLimit: BigInt(300000),
      gasPrice: BigInt(20000000000), // 20 gwei
      totalCost: BigInt(6000000000000000) // 0.006 ETH
    };
  }

  /**
   * Monitor cross-chain transaction status
   */
  async monitorTransaction(
    txHash: string,
    callback: (status: string, data?: any) => void
  ): Promise<void> {
    // Implementation would monitor transaction across chains
    callback('initiated', { txHash });

    // Simulate monitoring
    setTimeout(() => callback('processing'), 5000);
    setTimeout(() => callback('completed'), 15000);
  }
}