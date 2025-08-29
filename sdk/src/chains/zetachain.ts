import { ethers } from 'ethers';
import { SolanaEncoder, MintFromUniversalPayload, SolanaAccountMeta } from '../gateway-wiring/src/encoders/solana';
import { ChainConfig, NFTMetadata, CrossChainTransferResult } from '../types';

export class ZetaChainClient {
  private provider: ethers.providers.JsonRpcProvider;
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Mint NFT on ZetaChain Universal contract
   */
  async mintNFT(
    signer: ethers.Signer,
    to: string,
    metadata: NFTMetadata
  ): Promise<CrossChainTransferResult> {
    const signerWithProvider = signer.connect(this.provider);

    // Upload metadata to IPFS (simplified)
    const metadataUri = await this.uploadMetadata(metadata);

    const universalContract = new ethers.Contract(
      this.config.universalNftAddress!,
      [
        'function safeMint(address to, string memory uri) returns (uint256)',
        'function getCurrentTokenId() view returns (uint256)'
      ],
      signerWithProvider
    );

    try {
      const tx = await universalContract.safeMint(to, metadataUri);
      const receipt = await tx.wait();

      // Get the token ID from events
      const mintEvent = receipt.events?.find((e: any) => e.event === 'TokenMinted');
      const tokenId = mintEvent?.args?.tokenId?.toString();

      return {
        txHash: receipt.transactionHash,
        tokenId,
        status: 'success'
      };
    } catch (error) {
      console.error('Minting failed:', error);
      return {
        txHash: '',
        status: 'failed'
      };
    }
  }

  /**
   * Transfer NFT to Solana via withdrawAndCall
   */
  async transferToSolana(
    signer: ethers.Signer,
    tokenId: string,
    mintPayload: MintFromUniversalPayload,
    accounts: SolanaAccountMeta[],
    programId: string
  ): Promise<CrossChainTransferResult> {
    const signerWithProvider = signer.connect(this.provider);

    const universalContract = new ethers.Contract(
      this.config.universalNftAddress!,
      [
        'function transferCrossChain(uint256 tokenId, bytes memory receiver, address destination) payable'
      ],
      signerWithProvider
    );

    // Encode the instruction for Solana program
    const payloadBytes = SolanaEncoder.encodeMintFromUniversalPayload(mintPayload);
    const instruction = {
      instructionType: 'MintFromUniversal' as const,
      payload: payloadBytes
    };

    const solanaCallData = SolanaEncoder.encodeWithdrawAndCallPayload(
      programId,
      instruction,
      accounts
    );

    // Use Solana ZRC-20 address as destination
    const solanaZrc20 = '0x1234567890123456789012345678901234567890'; // Placeholder

    try {
      const tx = await universalContract.transferCrossChain(
        tokenId,
        ethers.utils.toUtf8Bytes(programId),
        solanaZrc20,
        {
          value: ethers.utils.parseEther('0.01') // Gas for cross-chain transfer
        }
      );

      const receipt = await tx.wait();

      return {
        txHash: receipt.transactionHash,
        tokenId,
        status: 'success'
      };
    } catch (error) {
      console.error('Transfer to Solana failed:', error);
      return {
        txHash: '',
        status: 'failed'
      };
    }
  }

  /**
   * Get token data from Universal contract
   */
  async getTokenData(tokenId: string): Promise<{
    exists: boolean;
    owner: string;
    uri: string;
    creator: string;
    name?: string;
    symbol?: string;
  }> {
    const universalContract = new ethers.Contract(
      this.config.universalNftAddress!,
      [
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function getCreator(uint256 tokenId) view returns (address)',
        'function name() view returns (string)',
        'function symbol() view returns (string)'
      ],
      this.provider
    );

    try {
      const [owner, uri, creator, name, symbol] = await Promise.all([
        universalContract.ownerOf(tokenId),
        universalContract.tokenURI(tokenId),
        universalContract.getCreator(tokenId),
        universalContract.name(),
        universalContract.symbol()
      ]);

      return {
        exists: true,
        owner,
        uri,
        creator,
        name,
        symbol
      };
    } catch (error) {
      return {
        exists: false,
        owner: '',
        uri: '',
        creator: ''
      };
    }
  }

  /**
   * Upload metadata to IPFS (simplified implementation)
   */
  private async uploadMetadata(metadata: NFTMetadata): Promise<string> {
    // In a real implementation, this would upload to IPFS
    // For demo purposes, return a placeholder URI
    const jsonString = JSON.stringify(metadata);
    const hash = ethers.utils.id(jsonString);
    return `ipfs://Qm${hash.slice(2, 48)}`;
  }
}