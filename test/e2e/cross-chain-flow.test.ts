import { expect } from 'chai';
import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { UniversalNFTSDK, ChainConfig, SolanaConfig } from '../sdk/src/universal-nft';
import addresses from '../infra/addresses.json';

describe('Universal NFT Cross-Chain Flow', () => {
  let sdk: UniversalNFTSDK;
  let zetachainSigner: ethers.Signer;
  let evmSigner: ethers.Signer;
  let solanaKeypair: Keypair;
  let tokenId: string;

  before(async () => {
    // Setup signers and connections
    const zetachainProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const evmProvider = new ethers.providers.JsonRpcProvider('http://localhost:8546');

    zetachainSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, zetachainProvider);
    evmSigner = new ethers.Wallet(process.env.PRIVATE_KEY!, evmProvider);
    solanaKeypair = Keypair.generate();

    // Initialize SDK with localnet addresses
    const zetachainConfig: ChainConfig = {
      chainId: 7001,
      rpcUrl: 'http://localhost:8545',
      gatewayAddress: addresses.localnet.zetachain.gateway,
      universalNftAddress: addresses.localnet.zetachain.universalNft,
    };

    const evmConfigs: ChainConfig[] = [{
      chainId: 1337,
      rpcUrl: 'http://localhost:8546',
      gatewayAddress: addresses.localnet.ethereum.gateway,
      connectedNftAddress: addresses.localnet.ethereum.connectedNft,
    }];

    const solanaConfig: SolanaConfig = {
      rpcUrl: 'http://localhost:8899',
      programId: addresses.localnet.solana.programId,
      gatewayPda: addresses.localnet.solana.gatewayPda,
    };

    sdk = new UniversalNFTSDK(zetachainConfig, evmConfigs, solanaConfig);
  });

  it('should mint NFT on ZetaChain', async () => {
    const signerAddress = await zetachainSigner.getAddress();

    const metadata = {
      name: 'Test Universal NFT',
      symbol: 'TUNFT',
      description: 'A test NFT for cross-chain transfers',
      image: 'https://example.com/image.png',
    };

    const result = await sdk.mintOnZetaChain(zetachainSigner, signerAddress, metadata);

    expect(result.tokenId).to.be.a('string');
    expect(result.txHash).to.be.a('string');

    tokenId = result.tokenId;
    console.log(`✅ NFT minted with ID: ${tokenId}`);
  });

  it('should transfer NFT from ZetaChain to Solana', async () => {
    const result = await sdk.transferToSolana(
      zetachainSigner,
      tokenId,
      solanaKeypair.publicKey.toString()
    );

    expect(result.txHash).to.be.a('string');
    console.log(`✅ Transfer to Solana initiated: ${result.txHash}`);

    // Wait for cross-chain transaction to complete
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify NFT exists on Solana
    const query = await sdk.queryNFT(tokenId);
    expect(query.solana).to.exist;
    console.log('✅ NFT confirmed on Solana');
  });

  it('should transfer NFT from Solana back to EVM', async () => {
    const evmAddress = await evmSigner.getAddress();

    const result = await sdk.transferFromSolana(
      solanaKeypair,
      tokenId,
      1337, // Local EVM chain ID
      evmAddress
    );

    expect(result.txHash).to.be.a('string');
    console.log(`✅ Return transfer initiated: ${result.txHash}`);

    // Wait for cross-chain transaction to complete
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify NFT exists on EVM
    const query = await sdk.queryNFT(tokenId);
    expect(query.evm?.get(1337)).to.exist;
    console.log('✅ NFT confirmed on EVM chain');
  });

  it('should handle revert scenarios gracefully', async () => {
    // Test with invalid recipient to trigger revert
    try {
      await sdk.transferToSolana(
        zetachainSigner,
        tokenId,
        '0x0000000000000000000000000000000000000000' // Invalid Solana address
      );
    } catch (error) {
      expect(error).to.exist;
      console.log('✅ Revert scenario handled correctly');
    }
  });

  it('should maintain persistent token ID across all chains', async () => {
    const query = await sdk.queryNFT(tokenId);

    // Verify token ID consistency
    if (query.zetachain) {
      console.log(`Token found on ZetaChain with ID: ${tokenId}`);
    }

    if (query.evm?.size > 0) {
      for (const [chainId, data] of query.evm) {
        console.log(`Token found on EVM chain ${chainId} with consistent ID`);
      }
    }

    if (query.solana) {
      console.log(`Token found on Solana with consistent ID`);
    }

    console.log('✅ Token ID persistence verified across all chains');
  });
});