export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  gatewayAddress: string;
  universalNftAddress?: string;
  connectedNftAddress?: string;
}

export interface SolanaConfig {
  rpcUrl: string;
  programId: string;
  gatewayPda: string;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

export interface CrossChainTransferResult {
  txHash: string;
  tokenId?: string;
  status: 'pending' | 'success' | 'failed';
}

export interface NFTQueryResult {
  zetachain?: {
    owner: string;
    uri: string;
    creator: string;
  };
  evm?: Map<number, {
    owner: string;
    uri: string;
    creator: string;
  }>;
  solana?: {
    exists: boolean;
    pda: string;
    owner?: string;
    mint?: string;
  };
}

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  totalCost: bigint;
}

export interface TransferOptions {
  gasLimit?: number;
  gasPrice?: bigint;
  value?: bigint;
}

export interface MonitorCallback {
  (status: 'initiated' | 'processing' | 'completed' | 'failed', data?: any): void;
}