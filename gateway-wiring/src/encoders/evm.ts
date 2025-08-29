import { ethers } from 'ethers';

export interface EVMCrossChainMessage {
  tokenId: bigint;
  receiver: string;
  uri: string;
  creator: string;
  originalOwner: string;
  destination?: string;
}

export class EVMEncoder {
  /**
   * Encode cross-chain message for EVM chains
   */
  static encodeCrossChainMessage(message: EVMCrossChainMessage): string {
    return ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'string', 'address', 'address', 'address'],
      [
        message.tokenId,
        message.receiver,
        message.uri,
        message.creator,
        message.originalOwner,
        message.destination || ethers.constants.AddressZero
      ]
    );
  }

  /**
   * Decode cross-chain message from EVM chains
   */
  static decodeCrossChainMessage(data: string): EVMCrossChainMessage {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'address', 'string', 'address', 'address', 'address'],
      data
    );

    return {
      tokenId: decoded[0],
      receiver: decoded[1],
      uri: decoded[2],
      creator: decoded[3],
      originalOwner: decoded[4],
      destination: decoded[5] !== ethers.constants.AddressZero ? decoded[5] : undefined
    };
  }

  /**
   * Encode receiver address for cross-chain transfer
   */
  static encodeReceiver(receiver: string): string {
    // For EVM chains, receiver is already in correct format
    return receiver;
  }

  /**
   * Encode destination chain identifier
   */
  static encodeDestination(chainId: number): string {
    // This would map to ZRC-20 addresses for different chains
    const chainMapping: { [key: number]: string } = {
      1: '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf', // Ethereum mainnet ZRC-20
      11155111: '0x65a45c57636f9BcCeD4fe193A602008578BcA90b', // Sepolia ZRC-20
      84532: '0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb', // Base Sepolia ZRC-20
      137: '0x239e96c8f17C85c30100AC26F635Ea15f23E9c67', // Polygon mainnet ZRC-20
    };

    return chainMapping[chainId] || ethers.constants.AddressZero;
  }
}