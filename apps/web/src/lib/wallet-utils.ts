import { jpycAddress, chainId } from './chain';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
  image?: string;
}

// 各ネットワークのJPYC情報（公式コントラクトアドレス）
export const JPYC_TOKENS: Record<number, TokenInfo> = {
  // Polygon Mainnet - 公式JPYC
  137: {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', // 正式な本番JPYCアドレス
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
  // Polygon Amoy Testnet - テスト用JPYC  
  80002: {
    address: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b', // テスト用JPYCアドレス
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
  // Ethereum Sepolia Testnet - テスト用JPYC
  11155111: {
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', // Sepoliaテスト用
    symbol: 'JPYC',
    decimals: 18,
    image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
  },
};

// Sepoliaのコミュニティ版JPYC（代替オプション）
export const SEPOLIA_COMMUNITY_JPYC: TokenInfo = {
  address: '0xd3eF95d29A198868241FE374A999fc25F6152253',
  symbol: 'JPYC',
  decimals: 18,
  image: 'https://storage.googleapis.com/jpyc-assets/jpyc-icon.png',
};

// Sepolia上の全JPYC（公式とコミュニティ）
export const SEPOLIA_JPYC_TOKENS = [
  {
    name: 'JPYC (Official)',
    address: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    symbol: 'JPYC',
    decimals: 18,
    faucetUrl: 'https://faucet.jpyc.jp/login',
    description: '公式JPYCトークン - 公式サイトのFaucetを使用（推奨）',
  },
  {
    name: 'JPYC (Community)',
    address: '0xd3eF95d29A198868241FE374A999fc25F6152253',
    symbol: 'JPYC',
    decimals: 18,
    faucetUrl: 'https://www.jpyc.cool/',
    description: 'コミュニティJPYCトークン - コミュニティのFaucetを使用',
  },
];

// 現在のネットワークのJPYCトークン情報を取得
export function getCurrentJPYCToken(): TokenInfo | null {
  return JPYC_TOKENS[chainId] || null;
}

// EIP-747: ウォレットにトークンを追加（Ambire Wallet最適化）
export async function addTokenToWallet(provider: any, tokenInfo: TokenInfo): Promise<boolean> {
  try {
    // ネットワーク確認
    let chainId;
    try {
      chainId = await provider.request({ method: 'eth_chainId' });
      chainId = parseInt(chainId, 16);
    } catch (networkError) {
      console.error('Failed to get network:', networkError);
      throw new Error('ネットワークの取得に失敗しました。ウォレットの接続を確認してください。');
    }

    // 対応ネットワークの確認
    if (!JPYC_TOKENS[chainId] && chainId !== 11155111) {
      throw new Error(`このネットワーク（Chain ID: ${chainId}）ではJPYCは利用できません。Polygon AmoyまたはEthereum Sepoliaに切り替えてください。`);
    }

    // Ambire Walletでのトークン追加
    const wasAdded = await provider.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenInfo.address,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          image: tokenInfo.image || undefined, // 画像がない場合はundefinedに
        },
      },
    });
    
    return wasAdded;
  } catch (error: any) {
    console.error('Failed to add token to wallet:', error);
    
    // エラーコード別の処理
    if (error.code === 4001) {
      throw new Error('トークン追加がユーザーによってキャンセルされました。');
    } else if (error.code === -32602) {
      throw new Error('無効なパラメータです。ネットワークの確認をしてください。');
    } else if (error.message?.includes('not supported')) {
      // Ambire Walletでサポートされていない場合の処理
      console.log('Wallet does not support EIP-747, trying alternative approach...');
      
      // 代替手段：手動でのトークン情報表示
      throw new Error(`このウォレットではトークンの自動追加がサポートされていません。\n\n手動でトークンを追加してください：\n\nアドレス: ${tokenInfo.address}\nシンボル: ${tokenInfo.symbol}\nデシマル: ${tokenInfo.decimals}`);
    }
    
    // Sepoliaで失敗した場合はコミュニティ版を試す
    if (tokenInfo.address === '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB') {
      console.log('Trying community Sepolia JPYC as fallback...');
      try {
        const wasAdded = await provider.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: SEPOLIA_COMMUNITY_JPYC.address,
              symbol: SEPOLIA_COMMUNITY_JPYC.symbol,
              decimals: SEPOLIA_COMMUNITY_JPYC.decimals,
              image: SEPOLIA_COMMUNITY_JPYC.image || undefined,
            },
          },
        });
        
        if (wasAdded) {
          console.log('Successfully added community Sepolia JPYC');
          return true;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    throw error;
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
  jpycToken?: TokenInfo;
  faucetInfo?: {
    url: string;
    description: string;
    contractAddress?: string;
    alternatives?: Array<{
      name: string;
      url: string;
      description: string;
      type: 'standard' | 'mining';
    }>;
  };
}> = {
  137: {
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorer: 'https://polygonscan.com',
    jpycToken: JPYC_TOKENS[137],
  },
  80002: {
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    jpycToken: JPYC_TOKENS[80002],
    faucetInfo: {
      url: 'https://amoy.polygonscan.com/address/0x8ca1d8dabaa60231af875599558beb0a5aedd52b#writeContract',
      description: 'sendTokenメソッドで最大10^23取得可能（約1万円相当）',
      contractAddress: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b',
    },
  },
  11155111: {
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    blockExplorer: 'https://sepolia.etherscan.io',
    jpycToken: JPYC_TOKENS[11155111],
    faucetInfo: {
      url: 'https://faucet.jpyc.jp/login',
      description: 'JPYC公式Faucet - ウォレット接続して取得（推奨）',
      alternatives: [
        {
          name: 'Chainlink Faucet',
          url: 'https://faucets.chain.link/sepolia',
          description: 'Sepolia ETH（ガス代）- 制限あり・簡単',
          type: 'standard',
        },
        {
          name: 'Alchemy Faucet',
          url: 'https://sepoliafaucet.com/',
          description: 'Sepolia ETH（ガス代）- 制限あり・簡単',
          type: 'standard',
        },
        {
          name: 'QuickNode Faucet',
          url: 'https://faucet.quicknode.com/ethereum/sepolia',
          description: 'Sepolia ETH（ガス代）- 制限あり・簡単',
          type: 'standard',
        },
        {
          name: 'Paradigm Faucet',
          url: 'https://faucet.paradigm.xyz/',
          description: 'Sepolia ETH（ガス代）- 制限あり・簡単',
          type: 'standard',
        },
        {
          name: 'pk910.de PoW Faucet',
          url: 'https://sepolia-faucet.pk910.de/',
          description: 'Sepolia ETH（ガス代）- マイニング型・制限なし（推奨）',
          type: 'mining',
        },
      ],
    },
  },
};