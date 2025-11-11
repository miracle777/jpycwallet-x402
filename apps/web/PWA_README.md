# PWA (Progressive Web App) Setup

このアプリケーションはPWAとして動作し、PC、iOS、Androidデバイスにインストール可能です。

## 機能

- **オフライン対応**: Service Workerによるキャッシュ戦略でオフラインでも一部機能が利用可能
- **インストール可能**: ホーム画面に追加してネイティブアプリのように使用可能
- **レスポンシブ**: デスクトップ、タブレット、スマートフォンに最適化
- **プッシュ通知対応**: (将来的に実装予定)

## セットアップ

### 1. アイコンの生成

PWA用のアイコンを生成する必要があります:

```bash
npm run generate-icons
```

このスクリプトは`public/icons/icon.svg`から各サイズのPNG画像を生成します。

**必要なツール:**
- ImageMagick または Inkscape

**インストール方法:**

Ubuntu/Debian:
```bash
sudo apt-get install imagemagick
# または
sudo apt-get install inkscape
```

macOS:
```bash
brew install imagemagick
# または
brew install inkscape
```

### 2. ビルド

```bash
npm run build
```

ビルドすると以下が自動生成されます:
- Service Worker
- PWA manifest
- 最適化されたアセット

## インストール方法

### デスクトップ (Chrome/Edge)

1. アプリにアクセス
2. アドレスバー右側の「インストール」アイコンをクリック
3. 「インストール」ボタンをクリック

### iOS (Safari)

1. Safariでアプリにアクセス
2. 共有ボタン (□↑) をタップ
3. 「ホーム画面に追加」を選択
4. 「追加」をタップ

### Android (Chrome)

1. Chromeでアプリにアクセス
2. メニューから「ホーム画面に追加」を選択
3. 「追加」をタップ

## 開発

開発モードでもPWA機能をテスト可能:

```bash
npm run dev
```

Service Workerは開発モードでも有効化されています(`devOptions.enabled: true`)。

## ファイル構成

```
public/
├── manifest.json          # PWAマニフェスト (手動)
├── browserconfig.xml      # Windows Tiles設定
├── sw.js                  # Service Worker (手動、フォールバック用)
└── icons/
    ├── icon.svg          # ベースSVGアイコン
    ├── icon-72x72.png    # 生成されるPNGアイコン
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

## 設定

### vite.config.ts

`vite-plugin-pwa`を使用してPWAの設定を管理:

- **registerType**: `autoUpdate` - 新しいバージョンを自動的に適用
- **workbox**: Workboxによるキャッシュ戦略
- **manifest**: マニフェスト設定

### Service Worker

2つのService Workerがあります:

1. **Vite PWA生成**: `vite-plugin-pwa`が自動生成 (推奨)
2. **手動版**: `public/sw.js` (フォールバック)

## トラブルシューティング

### Service Workerが更新されない

1. ブラウザのキャッシュをクリア
2. Service Workerを登録解除:
   - Chrome DevTools → Application → Service Workers → Unregister

### アイコンが表示されない

1. アイコンが正しく生成されているか確認
2. manifest.jsonのパスが正しいか確認
3. ビルド後にdistフォルダにアイコンがコピーされているか確認

### iOSでインストールできない

- Safariでのみホーム画面に追加可能
- プライベートブラウジングモードでは利用不可
- HTTPSが必要（localhostを除く）

## 本番環境

本番環境では必ずHTTPSを使用してください。PWAの多くの機能はHTTPS環境でのみ動作します。

## 参考資料

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
