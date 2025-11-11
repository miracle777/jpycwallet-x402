# PWA セットアップクイックガイド

## 🚀 すぐに始める

### 1. 開発サーバーを起動

```bash
npm run dev
```

アプリは PWA として動作しますが、アイコンを生成する必要があります。

### 2. アイコンを生成（本番環境用）

#### オプション A: ImageMagick を使用（推奨）

```bash
# ImageMagick をインストール
sudo apt-get install imagemagick  # Ubuntu/Debian
brew install imagemagick           # macOS

# アイコンを生成
npm run generate-icons
```

#### オプション B: オンラインツール

1. [RealFaviconGenerator](https://realfavicongenerator.net/) にアクセス
2. `public/icons/icon.svg` をアップロード
3. 生成されたファイルを `public/icons/` に配置

#### オプション C: 手動作成

以下のサイズの PNG 画像を `public/icons/` に作成:
- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

### 3. ビルド

```bash
npm run build
```

### 4. プレビュー

```bash
npm run preview
```

## 📱 デバイスにインストール

### PC (Chrome/Edge)
1. アドレスバーの「インストール」アイコンをクリック

### iPhone/iPad
1. Safari で開く
2. 共有ボタン → 「ホーム画面に追加」

### Android
1. Chrome で開く
2. メニュー → 「ホーム画面に追加」

## ✅ 確認事項

- [ ] アイコンが生成されている (`public/icons/*.png`)
- [ ] HTTPS で配信している（本番環境）
- [ ] manifest.json が正しく読み込まれている
- [ ] Service Worker が登録されている

DevTools で確認:
- Application → Manifest
- Application → Service Workers

## 🔧 トラブルシューティング

### アイコンが表示されない
→ `npm run generate-icons` を実行してアイコンを生成

### Service Worker が動作しない
→ HTTPS が必要（localhost は除く）

### iOS でインストールできない
→ Safari でのみ可能、プライベートブラウジングは不可

## 📚 詳細ドキュメント

詳細は `PWA_README.md` を参照してください。
