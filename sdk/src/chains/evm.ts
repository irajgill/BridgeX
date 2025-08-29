import { ethers } from 'ethers';
import { ChainConfig, NFTMetadata, CrossChainTransferResult } from '../types';

export class EVMClient {
  private provider: ethers.providers.JsonRpcProvider;
  private config: ChainConfig;

  constructor(config: ChainConfig) {
    this.config = config;
    this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  }

  /**
   * Mint NFT on EVM Connected contract
   */
  async mintNFT(
    signer: ethers.Signer,
    to: string,
    metadata: NFTMetadata
  ): Promise<CrossChainTransferResult> {
    const signerWithProvider = signer.connect(this.provider);

    // Upload metadata to IPFS (simplified)
    const metadataUri = await this.uploadMetadata(metadata);

    const connectedContract = new ethers.Contract(
      this.config.connectedNftAddress!,
      [
        'function safeMint(address to, string memory uri) returns (uint256)'
      ],
      signerWithProvider
    );

    try {
      const tx = await connectedContract.safeMint(to, metadataUri);
      const receipt = await tx.wait();

      // Get the token ID from events
      const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
      const tokenId = transferEvent?.args?.tokenId?.toString();

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
   * Transfer NFT cross-chain via ZetaChain
   */
  async transferCrossChain(
    signer: ethers.Signer,
    tokenId: string,
    receiver: string,
    destination: string
  ): Promise<CrossChainTransferResult> {
    const signerWithProvider = signer.connect(this.provider);

    const connectedContract = new ethers.Contract(
      this.config.connectedNftAddress!,
      [
        'function transferCrossChain(uint256 tokenId, bytes memory receiver, address destination) payable'
      ],
      signerWithProvider
    );

    try {
      const tx = await connectedContract.transferCrossChain(
        tokenId,
        ethers.utils.toUtf8Bytes(receiver),
        destination,
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
      console.error('Cross-chain transfer failed:', error);
      return {
        txHash: '',
        status: 'failed'
      };
    }
  }

  /**
   * Get token data from Connected contract
   */
  async getTokenData(tokenId: string): Promise<{
    exists: boolean;
    owner: string;
    uri: string;
    creator: string;
  }> {
    const connectedContract = new ethers.Contract(
      this.config.connectedNftAddress!,
      [
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function getCreator(uint256 tokenId) view returns (address)'
      ],
      this.provider
    );

    try {
      const [owner, uri, creator] = await Promise.all([
        connectedContract.ownerOf(tokenId),
        connectedContract.tokenURI(tokenId),
        connectedContract.getCreator(tokenId)
      ]);

      return {
        exists: true,
        owner,
        uri,
        creator
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
    const jsonString = JSON.stringify(metadata);
    const hash = ethers.utils.id(jsonString);
    return `ipfs://Qm${hash.slice(2, 48)}`;
  }
}