# jpycwallet-x402

Ambire WalletとJPYCを使ったガスレス決済システムの実装プロジェクトです。

## 🚀 実装済み機能

### 1. Ambire Wallet接続とJPYC残高表示
- ✅ Ambire WalletのWalletConnect経由での接続
- ✅ MetaMaskとの併用対応
- ✅ 環境に応じた自動ネットワーク/コントラクト切り替え
- ✅ JPYC残高の自動表示（jpyc.ts の readBalance 関数を使用）

### 2. QRコード決済システム
- ✅ QRコード生成機能（支払いリクエスト）
- ✅ QRコード読み取り機能（カメラスキャン）
- ✅ 支払いデータのエンコード/デコード
- ✅ 期限管理と検証機能

### 3. ショッピングカート
- ✅ 商品カタログ表示
- ✅ カートへの追加・削除・数量調整
- ✅ 合計金額の自動計算
- ✅ JPYC決済の実行

### 4. サブスクリプション機能
- ✅ 複数プラン（ベーシック/プロ/エンタープライズ）
- ✅ 前払い決済システム
- ✅ 有効期限管理
- ✅ サブスクリプション履歴

### 5. ガスレス送付（実験的）
- 🔬 概念実証段階の実装
- 📚 完全実装に必要な要素の解説
- 🛠️ Ambire SDK との統合準備

## 🌐 対応ネットワーク

### 開発環境 (.env.development)
- **ネットワーク**: Polygon Amoy Testnet
- **Chain ID**: 80002
- **JPYC Address**: `0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F`
- **RPC**: `https://rpc-amoy.polygon.technology`

### 本番環境 (.env.production)
- **ネットワーク**: Polygon Mainnet
- **Chain ID**: 137
- **JPYC Address**: `0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB`
- **RPC**: `https://polygon-rpc.com`

## 🛠️ セットアップ

```bash
# 依存関係のインストール
cd apps/web
npm install

# 開発サーバーの起動
npm run dev
```

## 📁 プロジェクト構造

```
apps/web/src/
├── components/           # Reactコンポーネント
│   ├── QRPayment.tsx    # QRコード決済
│   ├── ShoppingCart.tsx # ショッピングカート
│   ├── SubscriptionManager.tsx # サブスクリプション
│   └── GaslessPayment.tsx # ガスレス送付
├── lib/                 # ユーティリティライブラリ
│   ├── chain.ts         # ネットワーク設定
│   ├── jpyc.ts          # JPYC操作
│   ├── onboard.ts       # ウォレット接続
│   ├── types.ts         # 型定義
│   ├── products.ts      # 商品データ
│   ├── subscription.ts  # サブスクリプション管理
│   └── qr-payment.ts    # QR決済ユーティリティ
├── AmbireLogin.tsx      # ウォレット接続UI
└── App.tsx              # メインアプリケーション
```

## 🎯 技術選択・設計の要点

### (A) x402スタイルの「HTTPレベル課金」
- 未決済アクセス→HTTP 402 Payment Required を返す
- レスポンスに「支払い方法／金額／期限」をヘッダ or JSONで提示
- クライアントはAmbireで支払い実施→支払いTx/証跡を次リクエストのヘッダに添付
- Facilitatorが検証→コンテンツ/APIを200で返却
- 従量課金：リソース毎に単価（例：price: 0.1 JPYC）
- タイムパス（サブスク）：「期間中は402を返さず通す」

### (B) サブスクリプション設計（簡潔＆堅牢）
- プラン例：BASIC(¥500/月), PRO(¥2,000/月)
- ユーザーがJPYCで前払い→入金検知でsubscriptions.active_untilを更新
- 決済の自動化は段階導入：最初は「期日近づいたらUI/メールでリマインド」
- サブスク中はHTTP 200で通す、切れたら402で支払い要求
- 将来は自動更新（定期Pull or 事前デポジット）に拡張

### (C) ガスレス送付（Ambire）
- Ambireのアカウント抽象化＋Sponsored Txを利用
- 店舗側の月額スポンサー上限を設定（例：1ユーザー/月 0.1 MATIC上限）
- Facilitator側でガススポンサー条件：
  - 承認済みユーザーのみ
  - JPYCの送付/承認Txのみ対象
  - 1日/1ユーザーの回数・金額上限
  - 悪用対策：Rate limit、KYC/メール認証、デバイス指紋、IP制限

## 📚 参考リンク

- **記事**: [x402でJPYCを使ってみた](https://note.com/hyodio/n/n11a660b6a58d?sub_rt=share_pw)
- **x402**: [github.com/coinbase/x402](https://github.com/coinbase/x402)
- **Ambire SDK**: [docs.ambire.com](https://docs.ambire.com/)
- **JPYC Developer Docs**: [faq.jpyc.co.jp](https://faq.jpyc.co.jp/s/article/developer-documentation)
- **EIP-3009**: [eips.ethereum.org/EIPS/eip-3009](https://eips.ethereum.org/EIPS/eip-3009)

## 🚦 次のステップ

### フェーズ1: Facilitator実装
- [ ] x402風ゲート（HTTP 402 返却機能）
- [ ] 再送リクエストの領収検証
- [ ] 価格テーブル＋最少単位検証
- [ ] Idempotency-Keyで二重決済防止

### フェーズ2: 完全なガスレス送付
- [ ] AmbireのSponsored Tx/Paymaster設定
- [ ] 1日/1ユーザーの回数/額上限・総額上限
- [ ] 検証ログ＆監査パネル（管理画面）

### フェーズ3: 運用・安全
- [ ] 監査ログ（全決済/全アクセス/全スポンサー）
- [ ] 速度計測（p50/p95）・過負荷時の固定価格
- [ ] 法務（資金決済法/暗号資産区分/領収書表記）整備
- [ ] Shopify等外部サイト埋め込み用SDK

## 🔧 環境変数

Vercel デプロイ時は、Project Settings → Environment Variables に以下を設定：

```env
# 開発環境
VITE_RPC_URL=https://rpc-amoy.polygon.technology
VITE_CHAIN_ID=80002
VITE_JPYC_ADDRESS=0xE7C3D8C5E8e84a4fBdE29F8fA9A89AB1b5Dd6b8F
VITE_DEFAULT_CHAIN=polygon-amoy
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_DAPP_URL=http://localhost:5173

# 本番環境
VITE_RPC_URL=https://polygon-rpc.com
VITE_CHAIN_ID=137
VITE_JPYC_ADDRESS=0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB
VITE_DEFAULT_CHAIN=polygon
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
VITE_DAPP_URL=https://your-domain.com
```