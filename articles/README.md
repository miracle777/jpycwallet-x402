# Zenn Articles

このディレクトリには、Zennに公開する技術記事が格納されています。

## GitHub連携での公開方法

### 1. Zenn側での設定

1. [Zenn](https://zenn.dev/)にログイン
2. 右上のアイコン → **「アカウント設定」**
3. **「GitHubリポジトリ連携」**タブを開く
4. **「リポジトリを連携する」**ボタンをクリック
5. このリポジトリ（`miracle777/jpycwallet-x402`）を選択

### 2. ディレクトリ構造

```
jpycwallet-x402/
├── articles/
│   ├── jpyc-x402-gasless-payment.md  # 記事ファイル
│   └── README.md                      # このファイル
```

### 3. 記事ファイルの命名規則

- ファイル名: `任意のslug.md`（例: `jpyc-x402-gasless-payment.md`）
- このslugがURLになります: `https://zenn.dev/ユーザー名/articles/jpyc-x402-gasless-payment`

### 4. Front Matter（記事冒頭の設定）

各記事の冒頭には以下の形式で設定を記述します：

```markdown
---
title: "記事のタイトル"
emoji: "💳"
type: "tech" # tech: 技術記事 / idea: アイデア記事
topics: ["web3", "blockchain", "ethereum", "jpyc", "react"]
published: false # true: 公開 / false: 下書き
---
```

### 5. 公開フロー

1. **記事を作成・編集**
   ```bash
   # articlesディレクトリに.mdファイルを作成
   vim articles/your-article-slug.md
   ```

2. **下書きとして確認**
   - Front Matterで `published: false` に設定
   - GitHubにpush
   - Zennのダッシュボードで下書きプレビュー確認

3. **公開**
   - Front Matterで `published: true` に変更
   - GitHubにpush
   - 自動的にZennに公開される！

### 6. 記事の更新

記事を編集してGitHubにpushするだけで、自動的にZennにも反映されます。

```bash
git add articles/jpyc-x402-gasless-payment.md
git commit -m "記事を更新"
git push origin main
```

## 現在の記事

### jpyc-x402-gasless-payment.md
**タイトル**: JPYC × Ambire Wallet でガスレス決済＆x402対応決済システムを作った話

**内容**:
- x402プロトコルの実装
- Ambire Walletガスレス決済
- JPYC統合とマルチネットワーク対応
- QRコード決済とサブスクリプション
- PWA対応とUX改善

**ステータス**: 下書き（`published: false`）

公開する場合は、記事内の `published: false` を `published: true` に変更してpushしてください。

## 参考リンク

- [ZennのGitHub連携ガイド](https://zenn.dev/zenn/articles/connect-to-github)
- [Zenn CLIの使い方](https://zenn.dev/zenn/articles/zenn-cli-guide)
- [Markdown記法一覧](https://zenn.dev/zenn/articles/markdown-guide)
