import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import { UniversalNFTSDK, ChainConfig, SolanaConfig, NFTMetadata } from '@universal-nft/sdk';

export const useUniversalNFT = (
  zetachainConfig: ChainConfig,
  evmConfigs: ChainConfig[],
  solanaConfig: SolanaConfig
) => {
  const [sdk, setSdk] = useState<UniversalNFTSDK | null>(null);
  const [evmAccount, setEvmAccount] = useState<string>('');
  const [evmSigner, setEvmSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState(false);
  const [nftData, setNftData] = useState<any>(null);
  const [tokenId, setTokenId] = useState('');

  useEffect(() => {
    const sdkInstance = new UniversalNFTSDK(zetachainConfig, evmConfigs, solanaConfig);
    setSdk(sdkInstance);
  }, [zetachainConfig, evmConfigs, solanaConfig]);

  const connectEVM = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const address = await signer.getAddress();

        setEvmSigner(signer);
        setEvmAccount(address);
      } catch (error) {
        console.error('Failed to connect EVM wallet:', error);
        alert('Failed to connect MetaMask');
      }
    } else {
      alert('Please install MetaMask');
    }
  };

  const mintNFT = async (metadata: {
    name: string;
    description: string;
    image: string;
  }) => {
    if (!sdk || !evmSigner) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const nftMetadata: NFTMetadata = {
        name: metadata.name,
        symbol: 'UNFT',
        description: metadata.description,
        image: metadata.image,
        attributes: [
          { trait_type: 'Type', value: 'Universal' },
          { trait_type: 'Chain', value: 'ZetaChain' },
          { trait_type: 'Timestamp', value: Date.now() }
        ]
      };

      const result = await sdk.mintOnZetaChain(evmSigner, evmAccount, nftMetadata);

      if (result.status === 'success') {
        setTokenId(result.tokenId || '');
        alert(`NFT minted! Token ID: ${result.tokenId}`);
      } else {
        alert('Minting failed');
      }
    } catch (error) {
      console.error('Minting failed:', error);
      alert('Minting failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const transferToSolana = async () => {
    if (!sdk || !evmSigner || !tokenId) {
      alert('Please connect wallet and enter token ID');
      return;
    }

    // For demo, we'll use a mock Solana recipient
    const mockSolanaRecipient = '11111111111111111111111111111112'; // Dummy address

    setLoading(true);
    try {
      const result = await sdk.transferToSolana(
        evmSigner,
        tokenId,
        mockSolanaRecipient
      );

      if (result.status === 'success') {
        alert(`Transfer initiated! TX: ${result.txHash}`);
      } else {
        alert('Transfer failed');
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const transferFromSolana = async () => {
    if (!sdk || !tokenId) {
      alert('Please enter token ID');
      return;
    }

    setLoading(true);
    try {
      // Create a dummy keypair for demo (in real app, use wallet adapter)
      const keypair = Keypair.generate();

      const result = await sdk.transferFromSolana(
        keypair,
        tokenId,
        11155111, // Sepolia
        evmAccount
      );

      if (result.status === 'success') {
        alert(`Return transfer initiated! TX: ${result.txHash}`);
      } else {
        alert('Return transfer failed');
      }
    } catch (error) {
      console.error('Return transfer failed:', error);
      alert('Return transfer failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const queryNFT = async () => {
    if (!sdk || !tokenId) {
      alert('Please enter token ID');
      return;
    }

    setLoading(true);
    try {
      const result = await sdk.queryNFT(tokenId);
      setNftData(result);
    } catch (error) {
      console.error('Query failed:', error);
      alert('Query failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
};