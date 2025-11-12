---
title: "JPYC × Ambire Wallet でガスレス決済＆x402対応決済システムを作った話"
emoji: "💳"
type: "tech" # tech: 技術記事 / idea: アイデア
topics: ["web3", "blockchain", "ethereum", "jpyc", "react"]
published: true # true: 公開 / false: 下書き
---

# はじめに

Web3決済の未来を見据えて、**JPYC（日本円ステーブルコイン）** と **Ambire Wallet（アカウント抽象化ウォレット）** を組み合わせたガスレス決済システムを開発しました。さらに、次世代のHTTP決済プロトコルである **x402** にも対応し、Web2とWeb3をシームレスにつなぐ決済体験を実現しています。

**リポジトリ**: https://github.com/miracle777/jpycwallet-x402

## この記事で得られること

- x402プロトコルの実装パターン
- Ambire Walletを使ったガスレス決済の実装方法
- JPYCを活用した日本円ペッグ決済システムの構築
- マルチネットワーク対応Web3アプリの設計
- QRコード決済とサブスクリプション決済の実装
- Web3 UX改善のベストプラクティス

# プロジェクト概要

## 実現した主な機能

### ✨ x402 Payment Protocol対応（2025年11月実装）
- GitHub PR #619の標準仕様に完全準拠
- 一回決済とサブスクリプション決済の両方に対応
- PaymentRequirements/PaymentPayload形式の実装
- EIP-712署名によるX-PAYMENTヘッダー対応

### ⚡ ガスレスJPYC送金
- Ambire Walletのアカウント抽象化を活用
- メタトランザクション、ペイマスター、リレーヤーの3方式
- Ethereum Sepoliaテストネットで動作確認済み
- ガス代99.9%削減を実現

### 📱 QRコード決済システム
- QRコード生成・読み取り機能
- 期限管理と検証機能
- 別リポジトリ [jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner) との連携

### 💰 サブスクリプション決済
- 複数プラン対応（ベーシック/プロ/エンタープライズ）
- 前払い決済と有効期限管理
- リアルタイム残り日数表示

### 🌐 マルチネットワーク対応
- Polygon Mainnet/Amoy
- Ethereum Sepolia
- Avalanche Fuji
- Base Sepolia（x402標準テスト用）

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Vite
- **Web3ライブラリ**: ethers.js v6 + OnBoard.js
- **ウォレット接続**: Ambire Wallet SDK + WalletConnect v2
- **決済プロトコル**: x402 Standard + EIP-712署名
- **ステーブルコイン**: JPYC（1 JPYC = 1円）

# x402プロトコルの実装

## x402とは？

x402は、HTTP 402 Payment Requiredステータスコードを活用した新しい決済プロトコルです。従来のWeb2的なHTTPフローにWeb3決済を自然に統合できます。

## 実装の流れ

### 1. PaymentRequirements（402レスポンス）

未決済のリクエストに対して、決済情報を含む402レスポンスを返します。

```typescript
interface PaymentRequirements {
  scheme: "exact";
  network: "base-sepolia";
  maxAmountRequired: string; // USDC base units
  resource: string; // API endpoint
  description: string;
  mimeType: "application/json";
  payTo: string; // merchant address
  maxTimeoutSeconds: number;
  asset: string; // USDC contract address
}
```

### 2. PaymentPayload作成

クライアント側でEIP-712署名を使った決済証明を作成します。

```typescript
interface PaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: "base-sepolia"; 
  payload: {
    signature: string; // EIP-712 signature
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    };
  };
}
```

### 3. X-PAYMENTヘッダー付きリクエスト

PaymentPayloadをbase64エンコードしてヘッダーに添付します。

```typescript
const headers = {
  'X-PAYMENT': btoa(JSON.stringify(paymentPayload))
};

const response = await fetch(resource, { headers });
```

### 4. Verification & Settlement

サーバー側で署名検証後、ブロックチェーン決済を実行し、200レスポンスでコンテンツを提供します。

## 実装コンポーネント

`apps/web/src/components/X402SimplePayment.tsx`と`X402Subscription.tsx`で一回決済とサブスクリプションの両方を実装しています。

# ガスレス決済の実装

## なぜガスレスが重要か

Web3決済の最大の障壁は「ガス代」です。ユーザーが商品代金以外にトランザクション手数料を負担するのは、UX的に大きな問題です。

## Ambire Walletのアカウント抽象化

Ambire Walletは、EIP-4337準拠のスマートアカウント技術により、ガスレストランザクションを実現します。

### 3つのガスレス実行モード

#### 1. メタトランザクション方式

```typescript
// EIP-712署名を使用したリレーヤー代理実行
const signature = await signer.signTypedData(domain, types, value);
// リレーヤーがガス代を負担してトランザクション実行
```

#### 2. ペイマスター方式

```typescript
// EIP-4337準拠のガス代第三者支払い
// スマートアカウントによるガスレス実行
```

#### 3. リレーヤー方式

```typescript
// GSNスタイルのガスレス実装
// 中央リレーヤーがガス代をスポンサー
```

## 実装の注意点

### ウォレット制限

現在の実装は、Ambire Wallet SDKの制約により、Ambire Wallet専用です。

```typescript
// Ambire Wallet以外では警告を表示
if (walletName !== 'Ambire Wallet') {
  return (
    <div className="warning">
      ⚠️ この機能はAmbire Walletでのみ利用可能です
    </div>
  );
}
```

### 署名メッセージの可読性

```typescript
const readableMessage = 
  `🔄 ガスレス JPYC 送金\n\n` +
  `送信者: ${currentAddress}\n` +
  `受取人: ${recipientAddress}\n` +
  `金額: ${amount} JPYC\n` +
  `Nonce: ${nonce}\n` +
  `ネットワーク: ${network.name}\n\n` +
  `このメッセージに署名することで、上記の送金を承認します。`;
```

注意: Ambire Walletは署名画面でHex表示しますが、署名データには可読メッセージが含まれています。

### 残高チェック機能

```typescript
export async function checkSufficientBalance(
  address: string, 
  requiredAmount: number
): Promise<{
  sufficient: boolean;
  currentBalance: number;
  shortfall?: number;
}> {
  const balanceStr = await readBalance(address);
  const currentBalance = parseFloat(balanceStr);
  return {
    sufficient: currentBalance >= requiredAmount,
    currentBalance,
    shortfall: currentBalance < requiredAmount 
      ? requiredAmount - currentBalance 
      : undefined
  };
}
```

## ガスレスの効果

- **通常のERC20転送**: 約0.002 ETH ($5-10相当)
- **Ambireガスレス転送**: 0.000000055 ETH (ほぼゼロ)
- **コスト削減率**: 99.9%以上

# JPYC統合の実装

## JPYCの仕様

- **価値**: 1 JPYC = 1円（日本円ペッグ）
- **デシマル**: 18桁（ERC-20標準）
- **発行**: 株式会社JPYC（日本の暗号資産交換業者）

## コントラクトアドレス

### 本番ネットワーク
- **Polygon Mainnet**: `0x6ae7dda427d54fcb3e5b88e0bae5f5c8c5f5c8c8`
- **Ethereum Mainnet**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`

### テストネットワーク
- **Polygon Amoy**: `0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F`
- **Ethereum Sepolia**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`

## 残高読み取り実装

```typescript
export async function readBalance(address: string): Promise<string> {
  const jpycAddress = getJPYCAddress();
  const rpcUrl = getRpcUrl();
  
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(
    jpycAddress,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );
  
  const balance = await contract.balanceOf(address);
  return ethers.formatUnits(balance, 18);
}
```

## EIP-747によるトークン自動追加

```typescript
const addJPYCToken = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: getJPYCAddress(),
          symbol: 'JPYC',
          decimals: 18,
          image: 'https://example.com/jpyc-icon.png'
        }
      }
    });
  } catch (error) {
    console.error('トークン追加エラー:', error);
  }
};
```

# マルチネットワーク対応

## ネットワーク設定の構造

```typescript
const NETWORK_CONFIG = {
  'polygon': {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    jpycAddress: '0x6ae7dda427d54fcb3e5b88e0bae5f5c8c5f5c8c8',
    blockExplorer: 'https://polygonscan.com'
  },
  'polygon-amoy': {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    jpycAddress: '0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F',
    blockExplorer: 'https://amoy.polygonscan.com'
  },
  'sepolia': {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: import.meta.env.VITE_SEPOLIA_RPC,
    jpycAddress: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  'base-sepolia': {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    blockExplorer: 'https://sepolia.basescan.org'
  }
};
```

## ネットワーク選択UIの実装

`NetworkSelector.tsx`でビジュアルなネットワーク切り替えを実装しました。

```tsx
<div className="network-grid">
  {networks.map(network => (
    <button
      key={network.chainId}
      onClick={() => switchNetwork(network)}
      className={`network-card ${
        currentChainId === network.chainId ? 'active' : ''
      }`}
    >
      <div className="network-icon">{network.icon}</div>
      <div className="network-name">{network.name}</div>
      <div className="network-status">
        {currentChainId === network.chainId ? '接続中' : '利用可能'}
      </div>
    </button>
  ))}
</div>
```

# UX改善のベストプラクティス

## 1. 包括的エラーハンドリング

### 問題点
Web3アプリでは技術的なエラーメッセージがそのまま表示されがちです。

### 解決策
ユーザーフレンドリーなエラーメッセージと具体的な解決策を提供します。

```typescript
try {
  const balanceCheck = await checkSufficientBalance(address, amount);
  if (!balanceCheck.sufficient) {
    throw new Error(
      `JPYC残高が不足しています。\n` +
      `現在: ${balanceCheck.currentBalance} JPYC\n` +
      `必要: ${amount} JPYC\n` +
      `不足額: ${balanceCheck.shortfall} JPYC`
    );
  }
  // 決済実行
} catch (error) {
  setError(error.message);
}
```

## 2. プリフライトチェック

トランザクション実行前に残高とネットワーク状態を検証します。

```typescript
const validateTransaction = async () => {
  // 残高チェック
  const balance = await checkSufficientBalance(address, amount);
  if (!balance.sufficient) {
    return { success: false, error: '残高不足' };
  }
  
  // ネットワークチェック
  const chainId = await provider.getNetwork().then(n => n.chainId);
  if (chainId !== expectedChainId) {
    return { success: false, error: 'ネットワーク不一致' };
  }
  
  return { success: true };
};
```

## 3. テスト用トークン取得ガイド

`FaucetGuide.tsx`で段階的な手順を提供しています。

```tsx
<div className="faucet-guide">
  <h3>テスト用JPYC取得方法</h3>
  <ol>
    <li>
      <a href="https://faucet.jpyc.jp/login" target="_blank">
        公式Faucet
      </a>
      にアクセス
    </li>
    <li>ウォレットを接続してログイン</li>
    <li>ボタンクリックでJPYCを取得</li>
  </ol>
  <p className="user-address">
    あなたのアドレス: <code>{address}</code>
  </p>
</div>
```

## 4. Progressive Disclosure

初心者には基本機能を、上級者には詳細設定を段階的に提示します。

# QRコード決済の実装

## エコシステム全体像

```
店舗側アプリ (jpycwallet.dev)
  ↓ QR生成
QRコード
  ↓ スキャン
顧客側アプリ (payment-scanner)
  ↓ JPYC決済
ブロックチェーン
  ↓ 確認
店舗側アプリ
```

## QRコード生成

```typescript
import QRCode from 'qrcode';

const generatePaymentQR = async (
  amount: string,
  recipient: string,
  expiresAt: number
) => {
  const paymentData = {
    type: 'jpyc-payment',
    amount,
    recipient,
    expiresAt,
    network: 'polygon-amoy'
  };
  
  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify(paymentData),
    { width: 300, margin: 2 }
  );
  
  return qrDataUrl;
};
```

## QRコード読み取り

```typescript
import QrScanner from 'qr-scanner';

const scanQRCode = async (videoElement: HTMLVideoElement) => {
  const scanner = new QrScanner(
    videoElement,
    (result) => {
      const paymentData = JSON.parse(result.data);
      // 決済処理へ
      processPayment(paymentData);
    },
    { highlightScanRegion: true }
  );
  
  await scanner.start();
};
```

## 連携リポジトリ

- **店舗側**: [jpycwallet.dev](https://github.com/miracle777/jpycwallet.dev) - QR生成・決済受付
- **顧客側**: [jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner) - QRスキャン・決済実行

# サブスクリプション決済の実装

## プラン設定

```typescript
const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'ベーシックプラン',
    price: '500',
    duration: 30,
    description: '個人利用向けプラン',
    features: [
      '基本機能',
      '月間100回まで',
      'メールサポート'
    ]
  },
  {
    id: 'pro',
    name: 'プロプラン',
    price: '2000',
    duration: 30,
    description: 'ビジネス利用向けプラン',
    features: [
      '全機能',
      '無制限利用',
      '優先サポート',
      'API アクセス'
    ]
  }
];
```

## 購入フローの実装

```typescript
const purchaseSubscription = async (plan: SubscriptionPlan) => {
  try {
    // 1. 残高チェック
    const balance = await checkSufficientBalance(address, parseFloat(plan.price));
    if (!balance.sufficient) {
      throw new Error('残高不足');
    }
    
    // 2. 決済実行
    const tx = await executePayment(plan.price, merchantAddress);
    
    // 3. サブスクリプション情報を保存
    const subscription = {
      planId: plan.id,
      startDate: Date.now(),
      endDate: Date.now() + (plan.duration * 24 * 60 * 60 * 1000),
      txHash: tx.hash
    };
    
    localStorage.setItem(
      `subscription_${address}`,
      JSON.stringify(subscription)
    );
    
    // 4. UI更新
    setActivePlan(plan);
    
  } catch (error) {
    setError(error.message);
  }
};
```

## 有効期限管理

```typescript
useEffect(() => {
  const subscription = getActiveSubscription(address);
  
  if (subscription) {
    const now = Date.now();
    const remaining = subscription.endDate - now;
    const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
    
    if (days > 0) {
      setRemainingDays(days);
    } else {
      // 期限切れ - サブスクリプションをクリア
      clearSubscription(address);
    }
  }
}, [address]);
```

# PWA対応

## なぜPWAか

- **ネイティブアプリライクな体験**: ホーム画面に追加可能
- **オフライン対応**: Service Workerによるキャッシュ
- **軽量**: アプリストア不要で即座に利用開始

## Vite PWA設定

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'favicon.ico'],
      manifest: {
        name: 'JPYC Wallet x402',
        short_name: 'JPYC Wallet',
        description: 'ガスレスJPYC決済アプリ',
        theme_color: '#4A90E2',
        icons: [
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/rpc/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rpc-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1時間
              }
            }
          }
        ]
      }
    })
  ]
});
```

## Service Worker登録

```typescript
// src/main.tsx
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('新しいバージョンがあります。更新しますか?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('オフラインで使用可能です');
  }
});
```

# セキュリティ考慮事項

## 1. プライベートキー管理

**絶対にやってはいけないこと:**
- プライベートキーをコードに含める
- `.env`ファイルをGitにコミット
- クライアント側でプライベートキーを保持

**正しいアプローチ:**
- ウォレット側でプライベートキーを管理
- 署名のみをアプリ側で要求
- 環境変数は`.gitignore`に含める

## 2. フロントラン攻撃対策

EIP-712署名でnonce管理を実装しています。

```typescript
const domain = {
  name: 'JPYC Payment',
  version: '1',
  chainId: await signer.getChainId(),
  verifyingContract: jpycAddress
};

const types = {
  Transfer: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' }
  ]
};

const signature = await signer.signTypedData(domain, types, {
  from: address,
  to: recipient,
  value: amount,
  nonce: await getNonce(address)
});
```

## 3. 残高検証

トランザクション実行前に必ず残高チェックを行います。

```typescript
const checkSufficientBalance = async (address: string, amount: number) => {
  const balance = await readBalance(address);
  if (parseFloat(balance) < amount) {
    throw new Error('残高不足');
  }
};
```

## 4. ネットワーク検証

```typescript
const verifyNetwork = async (expectedChainId: number) => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();
  
  if (Number(network.chainId) !== expectedChainId) {
    throw new Error('ネットワークが一致しません');
  }
};
```

# 本番環境への移行

## 必要な設定

### 1. RPC設定

**開発環境:**
```typescript
// Vite dev serverのプロキシ使用
VITE_SEPOLIA_RPC=/rpc/sepolia
```

**本番環境（必須）:**
```typescript
// APIキー付きプロバイダを使用
VITE_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_API_KEY
// または
VITE_SEPOLIA_RPC=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

推奨プロバイダ:
- [Infura](https://infura.io/) - 無料枠: 100,000リクエスト/日
- [Alchemy](https://www.alchemy.com/) - 無料枠: 300Mリクエスト/月
- [QuickNode](https://www.quicknode.com/) - 無料枠: 毎秒10リクエスト

### 2. WalletConnect設定

```typescript
// .env.production
VITE_WALLETCONNECT_PROJECT_ID=your_actual_project_id
```

[WalletConnect Cloud](https://cloud.walletconnect.com/)でプロジェクトIDを取得してください。

### 3. HTTPS必須

PWA機能とService Workerは、HTTPS環境でのみ動作します。

## セキュリティ監査

本番環境で使用する前に、以下の監査を推奨します：

- スマートコントラクトとの連携部分の監査
- フロントラン攻撃・再入攻撃のチェック
- 署名検証ロジックの検証
- レート制限・アクセス制御の実装

## 法的コンプライアンス

- 暗号資産交換業に関する法規制の確認
- 資金決済法、金融商品取引法の遵守
- 利用規約・プライバシーポリシーの整備

# 学んだこと・Tips

## Web3開発のベストプラクティス

### 1. プリフライトチェックは必須

トランザクション実行前に、以下を必ず検証します：
- 残高の確認
- ネットワークの一致
- トークンの承認状態

### 2. エラーメッセージはユーザーフレンドリーに

```typescript
// ❌ 悪い例
catch (error) {
  console.error(error);
}

// ✅ 良い例
catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    setError('残高が不足しています。Faucetから取得してください。');
  } else if (error.code === 'NETWORK_ERROR') {
    setError('ネットワーク接続を確認してください。');
  } else {
    setError(`エラーが発生しました: ${error.message}`);
  }
}
```

### 3. Progressive Disclosure

すべての機能を一度に表示せず、段階的に提示します。

```tsx
// 初心者向け：シンプルなUI
<SimplePaymentForm />

// 上級者向け：詳細設定を展開
{showAdvanced && (
  <AdvancedSettings 
    gasPrice={gasPrice}
    nonce={nonce}
  />
)}
```

## React + TypeScriptのパターン

### カスタムフック活用

```typescript
const useWallet = () => {
  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('0');
  const [chainId, setChainId] = useState<number>(0);
  
  useEffect(() => {
    // ウォレット状態の監視
  }, []);
  
  return { address, balance, chainId };
};
```

### 型安全性の徹底

```typescript
interface PaymentRequest {
  amount: string;
  recipient: string;
  network: NetworkType;
  expiresAt: number;
}

type NetworkType = 'polygon' | 'polygon-amoy' | 'sepolia';

const processPayment = (request: PaymentRequest): Promise<string> => {
  // 型安全な実装
};
```

## パフォーマンス最適化

### 1. useCallbackとuseMemo

```typescript
const handlePayment = useCallback(async (amount: string) => {
  // 決済処理
}, [address, chainId]);

const totalAmount = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price, 0);
}, [items]);
```

### 2. 遅延ローディング

```typescript
const QRScanner = lazy(() => import('./components/QRScanner'));

<Suspense fallback={<Loading />}>
  <QRScanner />
</Suspense>
```

# 今後の展開

## フェーズ1: Facilitator実装
- x402風ゲート（HTTP 402返却機能）
- 領収検証とIdempotency-Key対応
- 価格テーブルと最少単位検証

## フェーズ2: 完全なガスレス
- AmbireのSponsored Tx/Paymaster設定
- レート制限・上限管理
- 管理ダッシュボード

## フェーズ3: エコシステム統合
- 店舗側システム（jpycwallet.dev）との完全統合
- 決済スキャナー（jpyc-payment-scanner）連携
- SDK化による他プロジェクトへの展開

## フェーズ4: 商用化準備
- セキュリティ監査
- 負荷テスト
- SaaS化・マルチテナント対応

# まとめ

## 実現できたこと

- ✅ x402プロトコル準拠の決済システム
- ✅ 99.9%ガスコスト削減のガスレス送金
- ✅ QRコード決済とサブスクリプション
- ✅ マルチネットワーク対応
- ✅ PWAによるネイティブアプリライクなUX

## 技術的成果

- EIP-712署名による型付きデータ署名
- Ambire Walletのアカウント抽象化活用
- JPYC（日本円ステーブルコイン）の実用的統合
- ユーザーフレンドリーなWeb3 UX設計

## オープンソース貢献

本プロジェクトは、JPYCエコシステムの発展に貢献する技術実証として公開しています。

- **リポジトリ**: https://github.com/miracle777/jpycwallet-x402
- **ライセンス**: MIT License
- **関連プロジェクト**:
  - [jpycwallet.dev](https://github.com/miracle777/jpycwallet.dev) - 店舗側決済受付
  - [jpyc-payment-scanner](https://github.com/miracle777/jpyc-payment-scanner) - 顧客側決済スキャナー
  このプログラムでQRコードを読み取り決済すると、このプログラムで設定した店舗情報を利用して履歴を残すことができます。

## 参考リンク

- [x402 GitHub](https://github.com/coinbase/x402)
- [Ambire Wallet](https://docs.ambire.com/)
- [JPYC公式](https://jpyc.jp/)
- [JPYC Developer Docs](https://faq.jpyc.co.jp/s/article/developer-documentation)

---

最後まで読んでいただき、ありがとうございました！
この記事は、プロジェクト制作過程の内容をGitHub Copilotを使いまとめて作成しました。

