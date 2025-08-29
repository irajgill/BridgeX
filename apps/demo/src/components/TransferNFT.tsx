import { FC } from 'react';
import { ethers } from 'ethers';
import { PublicKey } from '@solana/web3.js';

interface TransferNFTProps {
  onTransferToSolana: () => void;
  onTransferFromSolana: () => void;
  onQuery: () => void;
  loading: boolean;
  tokenId: string;
  evmSigner: ethers.Signer | null;
  solanaWallet: PublicKey | null;
}

const TransferNFT: FC<TransferNFTProps> = ({
  onTransferToSolana,
  onTransferFromSolana,
  onQuery,
  loading,
  tokenId,
  evmSigner,
  solanaWallet
}) => {
  return (
    <div className="space-y-3">
      <button
        onClick={onTransferToSolana}
        disabled={loading || !evmSigner || !solanaWallet || !tokenId}
        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors text-sm"
      >
        {loading ? 'Processing...' : 'Transfer to Solana'}
      </button>

      <button
        onClick={onTransferFromSolana}
        disabled={loading || !solanaWallet || !tokenId}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors text-sm"
      >
        {loading ? 'Processing...' : 'Transfer from Solana'}
      </button>

      <button
        onClick={onQuery}
        disabled={loading || !tokenId}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors text-sm"
      >
        {loading ? 'Processing...' : 'Query NFT Status'}
      </button>
    </div>
  );
};

export default TransferNFT;