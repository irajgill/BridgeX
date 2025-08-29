import { FC, useState } from 'react';

interface MintNFTProps {
  onMint: (metadata: {
    name: string;
    description: string;
    image: string;
  }) => void;
  loading: boolean;
  disabled: boolean;
}

const MintNFT: FC<MintNFTProps> = ({ onMint, loading, disabled }) => {
  const [nftName, setNftName] = useState('');
  const [nftDescription, setNftDescription] = useState('');
  const [nftImage, setNftImage] = useState('');

  const handleMint = () => {
    if (!nftName || !nftDescription || !nftImage) {
      alert('Please fill in all fields');
      return;
    }

    onMint({
      name: nftName,
      description: nftDescription,
      image: nftImage
    });

    // Clear form
    setNftName('');
    setNftDescription('');
    setNftImage('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          NFT Name
        </label>
        <input
          type="text"
          value={nftName}
          onChange={(e) => setNftName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          placeholder="My Universal NFT"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={nftDescription}
          onChange={(e) => setNftDescription(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          rows={3}
          placeholder="A cross-chain Universal NFT"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Image URL
        </label>
        <input
          type="url"
          value={nftImage}
          onChange={(e) => setNftImage(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
          placeholder="https://example.com/image.png"
          disabled={loading}
        />
      </div>

      <button
        onClick={handleMint}
        disabled={loading || disabled}
        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
      >
        {loading ? 'Minting...' : 'Mint NFT on ZetaChain'}
      </button>
    </div>
  );
};

export default MintNFT;