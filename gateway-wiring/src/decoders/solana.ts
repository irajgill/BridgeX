import { PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

export interface DecodedSolanaAccounts {
  programState: string;
  nftState: string;
  mint: string;
  tokenAccount: string;
  recipient: string;
  gatewayPda: string;
  tokenProgram: string;
  associatedTokenProgram: string;
  metadataProgram: string;
  systemProgram: string;
  rentSysvar: string;
}

export interface DecodedCrossChainInstruction {
  instructionType: 'MintFromUniversal' | 'UpdateMetadata';
  payload: any;
}

export class SolanaDecoder {
  /**
   * Decode Solana accounts from ABI-encoded data
   */
  static decodeAccounts(accountsData: string): DecodedSolanaAccounts {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['tuple(bytes32,bool)[]'],
      accountsData
    );

    const accounts = decoded[0];

    return {
      programState: new PublicKey(accounts[0][0]).toString(),
      nftState: new PublicKey(accounts[1][0]).toString(),
      mint: new PublicKey(accounts[2][0]).toString(),
      tokenAccount: accounts[3] ? new PublicKey(accounts[3][0]).toString() : '',
      recipient: new PublicKey(accounts[4][0]).toString(),
      gatewayPda: new PublicKey(accounts[5][0]).toString(),
      tokenProgram: new PublicKey(accounts[6][0]).toString(),
      associatedTokenProgram: new PublicKey(accounts[7][0]).toString(),
      metadataProgram: new PublicKey(accounts[8][0]).toString(),
      systemProgram: new PublicKey(accounts[9][0]).toString(),
      rentSysvar: new PublicKey(accounts[10][0]).toString(),
    };
  }

  /**
   * Decode cross-chain instruction data
   */
  static decodeInstruction(instructionData: string): DecodedCrossChainInstruction {
    const decoded = ethers.utils.defaultAbiCoder.decode(
      ['uint8', 'bytes'],
      instructionData
    );

    const instructionType = decoded[0] === 0 ? 'MintFromUniversal' : 'UpdateMetadata';
    const payload = this.decodePayload(instructionType, decoded[1]);

    return {
      instructionType,
      payload
    };
  }

  /**
   * Decode payload based on instruction type
   */
  private static decodePayload(instructionType: string, payloadData: string): any {
    if (instructionType === 'MintFromUniversal') {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ['uint64', 'bytes32', 'string', 'string', 'string', 'bytes20', 'uint16'],
        payloadData
      );

      return {
        universalTokenId: decoded[0],
        recipient: new PublicKey(decoded[1]).toString(),
        uri: decoded[2],
        name: decoded[3],
        symbol: decoded[4],
        creator: decoded[5],
        royaltyBps: decoded[6]
      };
    } else if (instructionType === 'UpdateMetadata') {
      const decoded = ethers.utils.defaultAbiCoder.decode(
        ['uint64', 'string', 'string'],
        payloadData
      );

      return {
        universalTokenId: decoded[0],
        newUri: decoded[1],
        newName: decoded[2]
      };
    }

    throw new Error(`Unknown instruction type: ${instructionType}`);
  }
}