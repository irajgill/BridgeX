import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { SolanaConfig, CrossChainTransferResult } from '../types';

export class SolanaClient {
  private connection: Connection;
  private config: SolanaConfig;

  constructor(config: SolanaConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl);
  }

  /**
   * Burn NFT and prepare return to Universal chain
   */
  async burnToUniversal(
    keypair: Keypair,
    universalTokenId: string,
    destinationChain: string,
    receiver: string
  ): Promise<CrossChainTransferResult> {
    try {
      const program = await this.getSolanaProgram(keypair);

      const [nftStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft_state'), Buffer.from(universalTokenId)],
        new PublicKey(this.config.programId)
      );

      const [mintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('nft_mint'), Buffer.from(universalTokenId)],
        new PublicKey(this.config.programId)
      );

      const tx = await program.methods
        .burnToUniversal(
          universalTokenId,
          Array.from(Buffer.from(destinationChain.slice(2), 'hex')),
          Array.from(Buffer.from(receiver.slice(2), 'hex'))
        )
        .accounts({
          nftState: nftStatePda,
          mint: mintPda,
          authority: keypair.publicKey,
        })
        .signers([keypair])
        .rpc();

      return {
        txHash: tx,
        tokenId: universalTokenId,
        status: 'success'
      };
    } catch (error) {
      console.error('Burn to universal failed:', error);
      return {
        txHash: '',
        status: 'failed'
      };
    }
  }

  /**
   * Get token data from Solana program
   */
  async getTokenData(tokenId: string): Promise<{
    exists: boolean;
    pda: string;
    owner?: string;
    mint?: string;
  }> {
    const [nftStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('nft_state'), Buffer.from(tokenId)],
      new PublicKey(this.config.programId)
    );

    try {
      const nftStateAccount = await this.connection.getAccountInfo(nftStatePda);
      if (nftStateAccount) {
        // In a real implementation, we would decode the account data
        return {
          exists: true,
          pda: nftStatePda.toString()
        };
      }
    } catch (error) {
      // Account doesn't exist or other error
    }

    return {
      exists: false,
      pda: nftStatePda.toString()
    };
  }

  /**
   * Get Solana program instance
   */
  private async getSolanaProgram(keypair: Keypair): Promise<Program> {
    const provider = new AnchorProvider(this.connection, {
      publicKey: keypair.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(keypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        txs.forEach(tx => tx.partialSign(keypair));
        return txs;
      }
    } as any, {});

    // Load the IDL (would be imported from generated files)
    const idl = await Program.fetchIdl(this.config.programId, provider);
    return new Program(idl!, this.config.programId, provider);
  }
}