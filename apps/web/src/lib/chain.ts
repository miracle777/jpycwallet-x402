// ネットワーク設定の型定義
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  jpycAddress: string;
  nativeSymbol: string;
  blockExplorer: string;
  faucetUrl?: string;
}

// 複数ネットワーク対応設定
export const networkConfigs: Record<string, NetworkConfig> = {
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    jpycAddress: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
    nativeSymbol: 'MATIC',
    blockExplorer: 'https://amoy.polygonscan.com',
    faucetUrl: 'https://amoy.polygonscan.com/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract'
  },
  'sepolia': {
    chainId: 11155111,
    name: 'Ethereum Sepolia (Community)',
    rpcUrl: import.meta.env.DEV ? '/rpc/sepolia' : 'https://ethereum-sepolia-rpc.publicnode.com',
    jpycAddress: '0xd3eF95d29A198868241FE374A999fc25F6152253',
    nativeSymbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    faucetUrl: 'https://sepolia.etherscan.io/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract'
  },
  'sepolia-official': {
    chainId: 11155111,
    name: 'Ethereum Sepolia (Official)',
    rpcUrl: import.meta.env.DEV ? '/rpc/sepolia' : 'https://ethereum-sepolia-rpc.publicnode.com',
    jpycAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    nativeSymbol: 'ETH',
    blockExplorer: 'https://sepolia.etherscan.io',
    faucetUrl: 'https://sepolia.etherscan.io/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract'
  },
  'avalanche-fuji': {
    chainId: 43113,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    jpycAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    nativeSymbol: 'AVAX',
    blockExplorer: 'https://testnet.snowtrace.io',
    faucetUrl: 'https://testnet.snowtrace.io/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract'
  },
  'polygon-mainnet': {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    jpycAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    nativeSymbol: 'MATIC',
    blockExplorer: 'https://polygonscan.com'
  }
};

// デフォルトネットワーク
const defaultNetwork = 'sepolia';
export const defaultConfig = networkConfigs[defaultNetwork];

// レガシー互換性のため、従来の変数を保持
export const rpcUrl = import.meta.env.VITE_RPC_URL as string || defaultConfig.rpcUrl;
export const chainId = Number(import.meta.env.VITE_CHAIN_ID) || defaultConfig.chainId;
export const jpycAddress = import.meta.env.VITE_JPYC_ADDRESS as string || defaultConfig.jpycAddress;

// ネットワークIDからコンフィグを取得
export function getNetworkConfig(chainIdOrKey: number | string): NetworkConfig | null {
  if (typeof chainIdOrKey === 'string') {
    return networkConfigs[chainIdOrKey] || null;
  }
  
  // chainIdから対応するネットワークを検索
  const entry = Object.entries(networkConfigs).find(([, config]) => config.chainId === chainIdOrKey);
  return entry ? entry[1] : null;
}

// 最小限のERC-20 ABI
export const erc20Abi = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)"
];
