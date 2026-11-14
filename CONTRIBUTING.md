# コントリビューションガイド

このリポジトリは個人プロジェクトです。

- **機能要望**: Issue で受け付けています。
- **Pull Request**: セキュリティ上の理由から受け付けていません。

## 開発環境

- Node.js: 20 以上
- pnpm: 9 以上

## セットアップ

```bash
pnpm install
pnpm dev
```

ブラウザで表示されたローカル URL を開くと、アプリを確認できます。

## 開発コマンド

```bash
# Lint
pnpm lint

# 型チェック
pnpm typecheck

# テスト
pnpm test

# テスト（ウォッチ）
pnpm test:watch

# カバレッジ
pnpm test:coverage

# 本番ビルド
pnpm build
```

## プロジェクト構成

- `src/app/` — アプリのルートコンポーネント
- `src/components/` — ヘッダーなど共通コンポーネント
- `src/features/combo/` — コンボデータの型・スキーマ・検証
- `src/features/deck/` — デッキ・カード一覧関連
- `src/features/editor/` — キャンバス、ノード、ストア
- `src/features/neuron/` — 遊戯王NEURONからのインポート機能
- `src/shared/` — 共通ユーティリティ、IndexedDB アクセス

## コードスタイル

- `oxlint` で定義されたルールに従ってください。
- `font-size` は `rem` を使用してください。
- 画像 URL は `http://` または `https://` のみ許可し、`innerHTML` や `eval` は使用しないでください。

## コミット・ブランチ

- ブランチ名は `feature/xxx`、`fix/xxx`、`refactor/xxx` などのプレフィックスを使用してください。
- コミットメッセージは変更内容が分かる簡潔な日本語または英語で記述してください。

## テスト

- 新機能・バグ修正を行った場合は、対応するテストを追加または更新してください。
- PR を出す前に `pnpm lint`、`pnpm test`、`pnpm build` がすべて成功することを確認してください。

## 遊戯王ニューロンからのインポート（開発時の確認用）

1. 遊戯王NEURONのデッキ詳細ページをブラウザで「名前を付けてページを保存」します。
2. 画面上部のデッキ名をクリックし、「デッキを追加」から保存したHTMLファイルと「〜_files」フォルダが入った**親フォルダ**を選択します。
3. カード画像はブラウザ内の IndexedDB に保存されます。
   - リポジトリには一切含まれません。
   - 画像ファイルが見つからないカードは種別アイコンのみ表示されます。

## セキュリティ

- 外部画像は `http://` または `https://` の URL のみ許可しています。
- コンボデータとカード情報は `IndexedDB` に保存します。同一オリジン上では他のページから読まれるリスクがあるため、センシティブな情報は保存しないでください。
- ニューロンHTMLからインポートしたカード画像は `IndexedDB` に保存されます。リポジトリやエクスポートJSONには含まれません。
- CSP（Content Security Policy）を `index.html` に設定しています。
- `pnpm audit` で既知の脆弱性が検出された場合は、優先して対応してください。
- `sampledata/` 等、著作権物を含むファイルは `.gitignore` で管理対象外にしています。
