import { jpycAddress, chainId } from './chain';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}

// 各ネットワークのJPYC情報
export const JPYC_TOKENS: Record<number, TokenInfo> = {
  // Polygon Mainnet
  137: {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
  // Polygon Amoy Testnet  
  80002: {
    address: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
  // Ethereum Sepolia Testnet
  11155111: {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
  // Avalanche Fuji Testnet
  43113: {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
};

// 現在のネットワークのJPYCトークン情報を取得
export function getCurrentJPYCToken(): TokenInfo | null {
  return JPYC_TOKENS[chainId] || null;
}

// EIP-747: ウォレットにトークンを追加
export async function addTokenToWallet(provider: any, tokenInfo: TokenInfo): Promise<boolean> {
  try {
    const wasAdded = await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenInfo.address,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          image: tokenInfo.image,
        },
      },
    });
    
    return wasAdded;
  } catch (error) {
    console.error('Failed to add token to wallet:', error);
    return false;
  }
}

// 現在のネットワークのJPYCをウォレットに追加
export async function addJPYCToWallet(provider: any): Promise<boolean> {
  const tokenInfo = getCurrentJPYCToken();
  if (!tokenInfo) {
    console.error('JPYC token info not found for current network');
    return false;
  }
  
  return await addTokenToWallet(provider, tokenInfo);
}

// ネットワーク情報
export const NETWORK_INFO: Record<number, {
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  faucetInfo?: {
    url: string;
    description: string;
    contractAddress: string;
  };
}> = {
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
  },
  80002: {
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    faucetInfo: {
      url: 'https://amoy.polygonscan.com/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract',
      description: 'sendTokenメソッドで最大10^23取得可能（約1万円相当）',
      contractAddress: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b',
    },
  },
  11155111: {
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    blockExplorer: 'https://sepolia.etherscan.io',
    faucetInfo: {
      url: 'https://sepolia.etherscan.io/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract',
      description: 'sendTokenメソッドで最大10^23取得可能（約1万円相当）',
      contractAddress: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b',
    },
  },
  43113: {
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorer: 'https://testnet.snowtrace.io',
    faucetInfo: {
      url: 'https://testnet.snowtrace.io/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract',
      description: 'sendTokenメソッドで最大10^23取得可能（約1万円相当）',
      contractAddress: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b',
    },
  },
};