import { FC } from 'react';

interface NFTDisplayProps {
  nftData: any;
}

const NFTDisplay: FC<NFTDisplayProps> = ({ nftData }) => {
  if (!nftData) {
    return null;
  }

  return (
    <div className="mt-8 bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">NFT Status</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ZetaChain */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">ZetaChain</h3>
          {nftData.zetachain ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">Owner:</span>{' '}
                <span className="font-mono text-xs">
                  {nftData.zetachain.owner.slice(0, 6)}...{nftData.zetachain.owner.slice(-4)}
                </span>
              </div>
              <div>
                <span className="font-medium">Creator:</span>{' '}
                <span className="font-mono text-xs">
                  {nftData.zetachain.creator.slice(0, 6)}...{nftData.zetachain.creator.slice(-4)}
                </span>
              </div>
              <div>
                <span className="font-medium">URI:</span>{' '}
                <a 
                  href={nftData.zetachain.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 text-xs break-all"
                >
                  {nftData.zetachain.uri}
                </a>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Not found</div>
          )}
        </div>

        {/* EVM Chains */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">EVM Chains</h3>
          {nftData.evm && nftData.evm.size > 0 ? (
            <div className="space-y-2">
              {Array.from(nftData.evm.entries()).map(([chainId, data]) => (
                <div key={chainId} className="text-sm">
                  <div className="font-medium">Chain {chainId}:</div>
                  <div className="ml-2 space-y-1">
                    <div>
                      <span className="font-medium">Owner:</span>{' '}
                      <span className="font-mono text-xs">
                        {data.owner.slice(0, 6)}...{data.owner.slice(-4)}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Creator:</span>{' '}
                      <span className="font-mono text-xs">
                        {data.creator.slice(0, 6)}...{data.creator.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Not found</div>
          )}
        </div>

        {/* Solana */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900">Solana</h3>
          {nftData.solana && nftData.solana.exists ? (
            <div className="text-sm space-y-1">
              <div>
                <span className="font-medium">PDA:</span>{' '}
                <span className="font-mono text-xs">
                  {nftData.solana.pda.slice(0, 6)}...{nftData.solana.pda.slice(-4)}
                </span>
              </div>
              {nftData.solana.owner && (
                <div>
                  <span className="font-medium">Owner:</span>{' '}
                  <span className="font-mono text-xs">
                    {nftData.solana.owner.slice(0, 6)}...{nftData.solana.owner.slice(-4)}
                  </span>
                </div>
              )}
              {nftData.solana.mint && (
                <div>
                  <span className="font-medium">Mint:</span>{' '}
                  <span className="font-mono text-xs">
                    {nftData.solana.mint.slice(0, 6)}...{nftData.solana.mint.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Not found</div>
          )}
        </div>
      </div>

      {/* Raw Data */}
      <details className="mt-4">
        <summary className="cursor-pointer font-medium text-gray-700">
          View Raw Data
        </summary>
        <pre className="mt-2 bg-gray-100 p-4 rounded text-sm overflow-auto max-h-64">
          {JSON.stringify(nftData, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default NFTDisplay;