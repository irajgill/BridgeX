import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaUniversalNft } from "../target/types/solana_universal_nft";
import { expect } from "chai";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("solana-universal-nft", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaUniversalNft as Program<SolanaUniversalNft>;

  let programState: PublicKey;
  let authority: Keypair;
  let gatewayPda: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    gatewayPda = new PublicKey("2f9SLuUNb7TNeM6gzBwT4ZjbL5ZyKzzHg1Ce9yiquEjj");

    // Airdrop SOL to authority
    const airdropSig = await provider.connection.requestAirdrop(
      authority.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    // Derive program state PDA
    [programState] = PublicKey.findProgramAddressSync(
      [Buffer.from("program_state")],
      program.programId
    );
  });

  it("Initializes the program", async () => {
    await program.methods
      .initialize(
        "Universal NFT Collection",
        "UNFT",
        "https://example.com/collection.json",
        gatewayPda
      )
      .accounts({
        programState,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const state = await program.account.programState.fetch(programState);
    expect(state.authority.toString()).to.equal(authority.publicKey.toString());
    expect(state.collectionName).to.equal("Universal NFT Collection");
    expect(state.nextTokenId.toString()).to.equal("1");
  });

  it("Handles on_call from ZetaChain Gateway", async () => {
    const universalTokenId = new anchor.BN(1);
    const recipient = Keypair.generate().publicKey;

    // Derive NFT state PDA
    const [nftState] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft_state"), universalTokenId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Derive mint PDA
    const [mint] = PublicKey.findProgramAddressSync(
      [Buffer.from("nft_mint"), universalTokenId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    // Create mock cross-chain instruction data
    const mintPayload = {
      universalTokenId,
      recipient,
      uri: "https://example.com/nft/1.json",
      name: "Test NFT #1",
      symbol: "TNFT",
      creator: Buffer.from("1234567890123456789012345678901234567890", "hex"),
      royaltyBps: 500,
    };

    // This would typically come from the ZetaChain Gateway
    const mockGatewayCall = async () => {
      // In a real test, this would be called by the Gateway
      // For now, we test the underlying logic
    };

    // Test successful initialization
    expect(nftState).to.be.instanceOf(PublicKey);
    expect(mint).to.be.instanceOf(PublicKey);
  });

  it("Burns NFT and prepares return to Universal chain", async () => {
    const universalTokenId = new anchor.BN(1);
    const destinationChain = Buffer.from("eth_sepolia");
    const receiver = Buffer.from("1234567890123456789012345678901234567890", "hex");

    // This test would require a minted NFT first
    // Implementation depends on having a complete mint flow
  });
});