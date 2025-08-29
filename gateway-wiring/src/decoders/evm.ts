import { ethers } from 'ethers';

export interface DecodedEVMMessage {
  tokenId: bigint;
  receiver: string;
  uri: string;
  creator: string;
  originalOwner: string;
  destination?: string;
}

export interface DecodedRevertMessage {
  tokenId: bigint;
  originalOwner: string;
  uri: string;
  creator: string;
}

export class EVMDecoder {
  /**
   * Decode cross-chain message from Universal contract
   */
  static decodeCrossChainMessage(messageData: string): DecodedEVMMessage {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'bytes', 'string', 'address', 'address'],
      messageData
    );

    return {
      tokenId: decoded[0],
      receiver: ethers.utils.toUtf8String(decoded[1]),
      uri: decoded[2],
      creator: decoded[3],
      originalOwner: decoded[4]
    };
  }

  /**
   * Decode revert message data
   */
  static decodeRevertMessage(revertData: string): DecodedRevertMessage {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['uint256', 'address', 'string', 'address'],
      revertData
    );

    return {
      tokenId: decoded[0],
      originalOwner: decoded[1],
      uri: decoded[2],
      creator: decoded[3]
    };
  }

  /**
   * Decode transfer event data
   */
  static decodeTransferEvent(eventData: string, topics: string[]) {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['address', 'address', 'bytes'],
      eventData
    );

    return {
      tokenId: ethers.BigNumber.from(topics[3]),
      from: decoded[0],
      destination: decoded[1],
      message: decoded[2]
    };
  }

  /**
   * Extract chain ID from ZRC-20 address
   */
  static extractChainId(zrc20Address: string): number {
    // This would contain actual mapping of ZRC-20 addresses to chain IDs
    const addressToChainId: { [key: string]: number } = {
      '0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf': 1, // Ethereum mainnet
      '0x65a45c57636f9BcCeD4fe193A602008578BcA90b': 11155111, // Sepolia
      '0x48f80608B672DC30DC7e3dbBd0343c5F02C738Eb': 84532, // Base Sepolia
      '0x239e96c8f17C85c30100AC26F635Ea15f23E9c67': 137, // Polygon mainnet
    };

    return addressToChainId[zrc20Address] || 0;
  }
}