# Memory Assistant v5

AIチャットWebアプリケーション - インテリジェントメモリ管理システム搭載

## 概要

Memory Assistant v5は、ユーザーとの会話を記憶し、パーソナライズされた応答を提供するAIチャットアプリケーションです。Cloudflare上で動作し、高速かつスケーラブルなアーキテクチャを実現しています。

### 主な特徴

- **インテリジェントメモリ管理**: ユーザーの発言を構造化し、重要な情報を自動的に記憶
- **コンテキスト認識**: 過去の会話内容を考慮した、よりパーソナライズされた応答
- **マルチユーザー対応**: 安全な認証システムによるユーザー管理
- **高速レスポンス**: Cloudflareのエッジネットワークによる低レイテンシ
- **スケーラブル**: Cloudflare Workers + D1による自動スケーリング

## 技術スタック

### フロントエンド
- React 18+ with TypeScript
- Vite
- Tailwind CSS
- Zustand (状態管理)

### バックエンド
- Cloudflare Workers
- Hono (Webフレームワーク)
- Cloudflare D1 (SQLite)
- Cloudflare Workers AI
- Drizzle ORM

## プロジェクト構造

```
memory-assistant-v5/
├── frontend/          # Reactフロントエンド
├── backend/           # Cloudflare Workersバックエンド
├── shared/            # 共有型定義
└── docs/              # ドキュメント
```

## セットアップ

### 前提条件

- Node.js 18+
- npm または yarn
- Cloudflareアカウント
- Wrangler CLI

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd memory-assistant-v5
```

### 2. Cloudflare設定

#### Wranglerのインストール
```bash
npm install -g wrangler
```

#### Cloudflareにログイン
```bash
wrangler login
```

#### D1データベースの作成
```bash
wrangler d1 create memory-assistant-db
```

出力されたdatabase_idを`backend/wrangler.toml`に設定してください。

### 3. バックエンドのセットアップ

```bash
cd backend
npm install

# データベースマイグレーション
wrangler d1 migrations apply memory-assistant-db

# 開発サーバー起動
npm run dev
```

### 4. フロントエンドのセットアップ

```bash
cd frontend
npm install

# 開発サーバー起動
npm run dev
```

## 開発

### ローカル開発

バックエンドとフロントエンドを別々のターミナルで起動します。

```bash
# ターミナル1: バックエンド
cd backend
npm run dev

# ターミナル2: フロントエンド
cd frontend
npm run dev
```

### データベースマイグレーション

新しいマイグレーションを作成:
```bash
cd backend
# マイグレーションファイルを作成
# src/db/migrations/XXX_description.sql
```

マイグレーションを適用:
```bash
# ローカル
wrangler d1 migrations apply memory-assistant-db --local

# 本番
wrangler d1 migrations apply memory-assistant-db
```

## デプロイ

### バックエンドのデプロイ

```bash
cd backend
npm run deploy
```

### フロントエンドのデプロイ

```bash
cd frontend
npm run build
wrangler pages deploy dist
```

## メモリ管理システムの仕組み

Memory Assistant v5の核心機能であるメモリ管理システムは、以下のように動作します：

### 1. 構造化変換
ユーザーの自然な発言を、再利用可能な構造化テキストに変換します。

**例:**
- 入力: "私は東京に住んでいるITエンジニアです"
- 変換:
  - "ユーザーは東京に住んでいる"
  - "ユーザーはITエンジニアである"

### 2. メモリ分類
変換された情報を2つのタイプに分類します。

- **core_context**: 常に会話のコンテキストに含める重要な情報
  - 職業、居住地、趣味、継続的な状況など
- **archive**: 必要時のみ検索する詳細情報
  - 過去の特定のエピソード、一時的な出来事など

### 3. 重複チェック
既存のメモリと比較し、重複を避けます。

### 4. 自動コンテキスト注入
次回の会話では、core_contextの情報が自動的にAIに提供されます。

## API仕様

詳細なAPI仕様は [docs/api.md](docs/api.md) を参照してください。

### 主要エンドポイント

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/conversations` - 会話作成
- `POST /api/conversations/:id/messages` - メッセージ送信
- `GET /api/memories` - メモリ取得
- `POST /api/memories/search` - メモリ検索

## セキュリティ

- パスワードはbcryptでハッシュ化
- JWT認証
- SQLインジェクション対策
- XSS/CSRF対策
- レート制限

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## サポート

問題や質問がある場合は、GitHubのissuesを使用してください。

## ロードマップ

- [x] Phase 1: 基盤構築 ✅
- [x] Phase 2: 認証機能 ✅
- [x] Phase 3: 基本チャット機能 ✅
- [x] Phase 4: メモリ管理システム ✅
- [ ] Phase 5: 検索機能
- [ ] Phase 6: テストとデプロイ

詳細は [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) を参照してください。

## 謝辞

- Cloudflare Workers AI
- Hono Framework
- React Team
