import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, PublicKey } from '@solana/web3.js';
import { UniversalNFTSDK, ChainConfig, SolanaConfig, NFTMetadata } from '@universal-nft/sdk';
import WalletConnect from '../components/WalletConnect';
import MintNFT from '../components/MintNFT';
import TransferNFT from '../components/TransferNFT';
import NFTDisplay from '../components/NFTDisplay';
import { useUniversalNFT } from '../hooks/useUniversalNFT';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const ZETACHAIN_CONFIG: ChainConfig = {
  chainId: 7001,
  rpcUrl: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
  gatewayAddress: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
  universalNftAddress: '0x1234567890123456789012345678901234567890', // Deployed address
};

const EVM_CONFIGS: ChainConfig[] = [
  {
    chainId: 11155111,
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    gatewayAddress: '0x0c487a766110c85d301d96e33579c5b317fa4995',
    connectedNftAddress: '0x2234567890123456789012345678901234567890', // Deployed address
  }
];

const SOLANA_CONFIG: SolanaConfig = {
  rpcUrl: 'https://api.devnet.solana.com',
  programId: 'UnivNFTSoL1111111111111111111111111111111111',
  gatewayPda: '2f9SLuUNb7TNeM6gzBwT4ZjbL5ZyKzzHg1Ce9yiquEjj',
};

export default function Home() {
  const {
    sdk,
    evmAccount,
    evmSigner,
    connectEVM,
    loading,
    nftData,
    tokenId,
    setTokenId,
    mintNFT,
    transferToSolana,
    transferFromSolana,
    queryNFT
  } = useUniversalNFT(ZETACHAIN_CONFIG, EVM_CONFIGS, SOLANA_CONFIG);

  const { connection } = useConnection();
  const { publicKey: solanaWallet, signTransaction } = useWallet();

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Universal NFT Demo
          </h1>
          <p className="text-xl text-gray-600">
            Mint and transfer NFTs across ZetaChain, EVM chains, and Solana
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Wallet Connections */}
          <WalletConnect
            evmAccount={evmAccount}
            connectEVM={connectEVM}
            solanaWallet={solanaWallet}
          />

          {/* NFT Operations */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">NFT Operations</h2>

            <MintNFT
              onMint={mintNFT}
              loading={loading}
              disabled={!evmSigner}
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Token ID
              </label>
              <input
                type="text"
                value={tokenId}
                onChange={(e) => setTokenId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="Enter token ID"
              />
            </div>

            <TransferNFT
              onTransferToSolana={transferToSolana}
              onTransferFromSolana={transferFromSolana}
              onQuery={queryNFT}
              loading={loading}
              tokenId={tokenId}
              evmSigner={evmSigner}
              solanaWallet={solanaWallet}
            />
          </div>
        </div>

        {/* NFT Data Display */}
        <NFTDisplay nftData={nftData} />
      </div>
    </div>
  );
}