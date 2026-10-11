# SHU AUTOMATION 公式サイト

SHU AUTOMATIONのサービス、公開可能な実績、無料診断、相談窓口をまとめた公式サイトです。

## 技術構成

- HTML / CSS / JavaScript
- 外部ライブラリ・ビルド工程なし
- GitHub Pages向けの相対パス構成

## ローカル起動

プロジェクト直下で静的サーバーを起動します。

```powershell
python -m http.server 8000
```

ブラウザで `http://localhost:8000/` を開きます。`file://` で直接開くより、静的サーバーでの確認を推奨します。

## ビルド

ビルドは不要です。リポジトリ直下のファイルがそのまま公開物です。

## 公開方法

1. GitHubリポジトリの **Settings → Pages** を開く
2. **Deploy from a branch** を選択
3. Branchを `main`、フォルダーを `/(root)` に設定
4. 保存し、公開URLを確認

公開URL：`https://shuhei5296.github.io/shu-automation-official/`

## 更新方法

- 本文・構成：`index.html`
- デザイン：`styles/styles.css`
- 外部リンク：`scripts/config.js`
- GA4測定ID：`scripts/config.js` の `analytics.measurementId`
- GA4読み込み：`scripts/analytics.js`
- 外部リンク計測：`scripts/main.js`（`youtube_click`、`coconala_click`、`diagnosis_click` など）
- メニュー動作：`scripts/main.js`
- 実績画像：`images/works/`
- OGP画像：`images/og-image.png`
- プライバシーポリシー：`privacy.html`

外部リンクは `scripts/config.js` の1か所で管理します。未確定URLは空文字のままにし、確認後に設定してください。

## 公開前確認

- PC・スマホ表示
- ナビゲーションとハンバーガーメニュー
- CTAと外部リンク
- 横スクロール、文字切れ、画像崩れ
- favicon、OGP、title、description
- `404.html` と `privacy.html`
- APIキー、トークン、個人情報、顧客情報が含まれていないこと
