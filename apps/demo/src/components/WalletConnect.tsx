import { FC } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface WalletConnectProps {
  evmAccount: string;
  connectEVM: () => void;
  solanaWallet: PublicKey | null;
}

const WalletConnect: FC<WalletConnectProps> = ({
  evmAccount,
  connectEVM,
  solanaWallet
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Wallet Connections</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            EVM Wallet (MetaMask)
          </label>
          {evmAccount ? (
            <div className="text-sm text-green-600">
              Connected: {evmAccount.slice(0, 6)}...{evmAccount.slice(-4)}
            </div>
          ) : (
            <button
              onClick={connectEVM}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Connect MetaMask
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Solana Wallet (Phantom)
          </label>
          <div className="flex items-center">
            <WalletMultiButton />
            {solanaWallet && (
              <div className="ml-2 text-sm text-green-600">
                {solanaWallet.toString().slice(0, 6)}...{solanaWallet.toString().slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;