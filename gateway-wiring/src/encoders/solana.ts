import { PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

export interface SolanaAccountMeta {
  publicKey: string;
  isWritable: boolean;
}

export interface CrossChainInstruction {
  instructionType: 'MintFromUniversal' | 'UpdateMetadata';
  payload: Uint8Array;
}

export interface MintFromUniversalPayload {
  universalTokenId: bigint;
  recipient: string; // Solana public key as string
  uri: string;
  name: string;
  symbol: string;
  creator: string; // Original EVM creator address (hex)
  royaltyBps: number;
}

export class SolanaEncoder {
  /**
   * Encode accounts and instruction data for Solana program call via ZetaChain Gateway
   */
  static encodeWithdrawAndCallPayload(
    programId: string,
    instruction: CrossChainInstruction,
    accounts: SolanaAccountMeta[]
  ): string {
    // Encode accounts array
    const accountsData = ethers.utils.defaultAbiCoder.encode(
      ['tuple(bytes32,bool)[]'],
      [accounts.map(acc => [
        ethers.utils.hexZeroPad('0x' + new PublicKey(acc.publicKey).toBytes().reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), ''), 32),
        acc.isWritable
      ])]
    );

    // Encode instruction data
    const instructionData = this.encodeInstruction(instruction);

    // Combine accounts and instruction data as per ZetaChain Solana Gateway spec
    return ethers.utils.defaultAbiCoder.encode(
      ['bytes', 'bytes'],
      [accountsData, instructionData]
    );
  }

  /**
   * Encode cross-chain instruction for Solana program
   */
  static encodeInstruction(instruction: CrossChainInstruction): string {
    const instructionTypeBytes = instruction.instructionType === 'MintFromUniversal' ? 0 : 1;

    return ethers.utils.defaultAbiCoder.encode(
      ['uint8', 'bytes'],
      [instructionTypeBytes, instruction.payload]
    );
  }

  /**
   * Encode MintFromUniversal payload
   */
  static encodeMintFromUniversalPayload(payload: MintFromUniversalPayload): Uint8Array {
    const encoded = ethers.utils.defaultAbiCoder.encode(
      ['uint64', 'bytes32', 'string', 'string', 'string', 'bytes20', 'uint16'],
      [
        payload.universalTokenId,
        ethers.utils.hexZeroPad('0x' + new PublicKey(payload.recipient).toBytes().reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), ''), 32),
        payload.uri,
        payload.name,
        payload.symbol,
        payload.creator,
        payload.royaltyBps
      ]
    );

    return ethers.utils.arrayify(encoded);
  }

  /**
   * Generate required accounts for mint_from_universal instruction
   */
  static generateMintFromUniversalAccounts(
    programId: string,
    universalTokenId: bigint,
    recipient: string,
    gatewayPda: string
  ): SolanaAccountMeta[] {
    const programIdPk = new PublicKey(programId);
    const recipientPk = new PublicKey(recipient);

    // Derive PDAs
    const [programStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('program_state')],
      programIdPk
    );

    const [nftStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('nft_state'), Buffer.from(universalTokenId.toString())],
      programIdPk
    );

    const [mintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('nft_mint'), Buffer.from(universalTokenId.toString())],
      programIdPk
    );

    return [
      { publicKey: programStatePda.toString(), isWritable: true },
      { publicKey: nftStatePda.toString(), isWritable: true },
      { publicKey: mintPda.toString(), isWritable: true },
      { publicKey: recipientPk.toString(), isWritable: false },
      { publicKey: gatewayPda, isWritable: false },
      { publicKey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', isWritable: false }, // Token Program
      { publicKey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', isWritable: false }, // Associated Token Program
      { publicKey: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', isWritable: false }, // Metadata Program
      { publicKey: '11111111111111111111111111111111', isWritable: false }, // System Program
      { publicKey: 'SysvarRent111111111111111111111111111111111', isWritable: false }, // Rent Sysvar
    ];
  }
}