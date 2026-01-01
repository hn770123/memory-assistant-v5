# AI チャット Web アプリケーション実装計画

## 1. プロジェクト概要

### 1.1 目的
- マルチユーザー対応のAIチャットWebアプリケーション
- Cloudflare上で動作
- ユーザーの会話履歴とコンテキストを記憶し、パーソナライズされた応答を提供

### 1.2 主要機能
1. ユーザー認証・ログイン機能
2. AIチャット機能（Cloudflare AI使用）
3. インテリジェントメモリ管理システム
   - ユーザー入力の構造化変換
   - コンテキスト情報の分類（常時利用 vs 記録のみ）
   - 重複チェック機能
   - 自動コンテキスト注入
4. メモリ検索機能

## 2. 技術スタック

### 2.1 フロントエンド
- **フレームワーク**: React + TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **状態管理**: React Context API / Zustand
- **UIライブラリ**: Headless UI / Radix UI

### 2.2 バックエンド
- **プラットフォーム**: Cloudflare Workers
- **フレームワーク**: Hono（軽量Webフレームワーク）
- **言語**: TypeScript
- **AIサービス**: Cloudflare Workers AI (@cf/meta/llama-3-8b-instruct または @cf/mistral/mistral-7b-instruct-v0.1)

### 2.3 データベース
- **DB**: Cloudflare D1（SQLite）
- **ORM**: Drizzle ORM

### 2.4 認証
- **方式**: JWT（JSON Web Token）
- **セッション管理**: Cloudflare KV（オプション）

### 2.5 デプロイ
- **ホスティング**: Cloudflare Pages（フロントエンド） + Cloudflare Workers（バックエンド）
- **CI/CD**: GitHub Actions

## 3. データベーススキーマ

### 3.1 users テーブル
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### 3.2 conversations テーブル
```sql
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
```

### 3.3 messages テーブル
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### 3.4 memories テーブル（メモリ管理の中核）
```sql
CREATE TABLE memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  conversation_id INTEGER,
  original_text TEXT NOT NULL,
  structured_text TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK(memory_type IN ('core_context', 'archive')),
  category TEXT,
  importance_score REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  last_accessed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(memory_type);
CREATE INDEX idx_memories_user_type ON memories(user_id, memory_type);
CREATE INDEX idx_memories_importance ON memories(importance_score DESC);
```

### 3.5 memory_embeddings テーブル（オプション：セマンティック検索用）
```sql
CREATE TABLE memory_embeddings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  memory_id INTEGER NOT NULL,
  embedding_text TEXT NOT NULL,
  -- Note: Cloudflare D1はベクトル型をサポートしていないため、
  -- 埋め込みベクトルは別の方法で保存するか、Cloudflare Vectorizeを使用
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

CREATE INDEX idx_memory_embeddings_memory_id ON memory_embeddings(memory_id);
```

## 4. アーキテクチャ設計

### 4.1 システムアーキテクチャ
```
┌─────────────────┐
│   ユーザー      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     Cloudflare Pages (フロントエンド)    │
│         React + TypeScript               │
└────────┬────────────────────────────────┘
         │ HTTPS/REST API
         ▼
┌─────────────────────────────────────────┐
│   Cloudflare Workers (バックエンド)     │
│           Hono Framework                 │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────────┐ │
│  │   認証      │  │  メモリ管理      │ │
│  │  サービス   │  │  サービス        │ │
│  └─────────────┘  └──────────────────┘ │
│  ┌─────────────┐  ┌──────────────────┐ │
│  │  チャット   │  │  AI統合          │ │
│  │  サービス   │  │  サービス        │ │
│  └─────────────┘  └──────────────────┘ │
└────────┬────────────────┬───────────────┘
         │                │
         ▼                ▼
┌─────────────────┐  ┌──────────────────┐
│ Cloudflare D1   │  │ Cloudflare       │
│   (SQLite)      │  │ Workers AI       │
└─────────────────┘  └──────────────────┘
```

### 4.2 メモリ管理システムのフロー

```
ユーザー入力
    │
    ▼
┌─────────────────────────────────┐
│ 1. AI応答生成                    │
│   - Cloudflare AI使用            │
│   - 既存のcore_contextを注入     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. 入力の構造化変換              │
│   - AIで自然言語→構造化テキスト │
│   - 例: "私はエンジニアです"    │
│     → "ユーザーは〜である"      │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. メモリタイプの分類            │
│   - core_context: 常に使用      │
│   - archive: 検索時のみ使用     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 4. 重複チェック                  │
│   - 既存メモリと類似度計算      │
│   - 重複なら保存スキップ        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 5. メモリ保存                    │
│   - memoriesテーブルに挿入      │
└─────────────────────────────────┘
```

## 5. API設計

### 5.1 認証API

#### POST /api/auth/register
ユーザー登録
```json
Request:
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "山田太郎"
}

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "display_name": "山田太郎"
  },
  "token": "eyJhbGc..."
}
```

#### POST /api/auth/login
ログイン
```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "display_name": "山田太郎"
  },
  "token": "eyJhbGc..."
}
```

### 5.2 チャットAPI

#### POST /api/conversations
新しい会話を作成
```json
Request:
{
  "title": "新しい会話"
}

Response:
{
  "conversation": {
    "id": 1,
    "user_id": 1,
    "title": "新しい会話",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

#### GET /api/conversations
ユーザーの会話一覧を取得
```json
Response:
{
  "conversations": [
    {
      "id": 1,
      "title": "新しい会話",
      "created_at": "2026-01-01T00:00:00Z",
      "message_count": 10
    }
  ]
}
```

#### POST /api/conversations/:id/messages
メッセージを送信してAI応答を取得
```json
Request:
{
  "content": "私はITエンジニアですが、最近仕事で悩んでいます"
}

Response:
{
  "message": {
    "id": 1,
    "role": "user",
    "content": "私はITエンジニアですが...",
    "created_at": "2026-01-01T00:00:00Z"
  },
  "ai_response": {
    "id": 2,
    "role": "assistant",
    "content": "お仕事での悩み、お話しいただけますか？...",
    "created_at": "2026-01-01T00:00:00Z"
  },
  "memories_created": [
    {
      "id": 1,
      "structured_text": "ユーザーはITエンジニアである",
      "memory_type": "core_context"
    },
    {
      "id": 2,
      "structured_text": "ユーザーは仕事で悩みを抱えている",
      "memory_type": "core_context"
    }
  ]
}
```

#### GET /api/conversations/:id/messages
会話のメッセージ履歴を取得
```json
Response:
{
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "...",
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

### 5.3 メモリAPI

#### GET /api/memories
ユーザーのメモリを取得
```json
Query Parameters:
- type: "core_context" | "archive" | "all" (default: "all")
- limit: number (default: 50)
- offset: number (default: 0)

Response:
{
  "memories": [
    {
      "id": 1,
      "structured_text": "ユーザーはITエンジニアである",
      "memory_type": "core_context",
      "importance_score": 0.9,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ],
  "total": 100
}
```

#### POST /api/memories/search
メモリを検索（ユーザーが明示的に依頼した場合のみ）
```json
Request:
{
  "query": "私の職業は何？",
  "limit": 10
}

Response:
{
  "results": [
    {
      "id": 1,
      "structured_text": "ユーザーはITエンジニアである",
      "original_text": "私はITエンジニアです",
      "relevance_score": 0.95,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### DELETE /api/memories/:id
メモリを削除
```json
Response:
{
  "success": true
}
```

## 6. メモリ管理システムの詳細設計

### 6.1 構造化変換プロンプト
```
ユーザーの発言を、第三者視点の客観的な事実文に変換してください。

入力例: "私は東京に住んでいるITエンジニアです"
出力例:
- ユーザーは東京に住んでいる
- ユーザーはITエンジニアである

入力例: "最近、プロジェクトマネージャーになりました"
出力例:
- ユーザーは最近プロジェクトマネージャーになった

ルール:
1. 一文ごとに独立した事実として分割
2. 「私は」→「ユーザーは」に変換
3. 時制を維持
4. 感情や意見も事実として記録
5. JSON配列で返す

入力: {user_input}
```

### 6.2 メモリ分類プロンプト
```
以下の情報を分類してください。

core_context（常にコンテキストに含める）:
- ユーザーの基本属性（職業、居住地、趣味など）
- 重要な個人情報
- 継続的な状況（現在進行中のプロジェクト、悩みなど）

archive（記録のみ）:
- 一時的な出来事
- 過去の特定のエピソード
- 検索時に必要な詳細情報

入力: {structured_text}

JSON形式で返してください:
{
  "type": "core_context" | "archive",
  "category": "職業" | "居住地" | "趣味" | "悩み" | "その他",
  "importance_score": 0.0-1.0
}
```

### 6.3 重複チェックアルゴリズム

1. **完全一致チェック**
   - structured_textの完全一致を確認
   - 一致すれば保存をスキップ

2. **類似度チェック（シンプル版）**
   - Levenshtein距離を使用
   - 類似度 > 0.9 なら重複と判定
   - または、重要な単語の重複率をチェック

3. **セマンティック類似度チェック（高度版・オプション）**
   - Cloudflare Vectorizeまたは外部サービスを使用
   - 埋め込みベクトルの コサイン類似度を計算
   - 類似度 > 0.85 なら重複と判定

### 6.4 コンテキスト注入戦略

AIへのプロンプト構築時:
```
System: あなたは親切なAIアシスタントです。

## ユーザーについて知っていること（core_context）
{core_context_memories}

User: {user_input}
```

例:
```
System: あなたは親切なAIアシスタントです。

## ユーザーについて知っていること
- ユーザーはITエンジニアである
- ユーザーは東京に住んでいる
- ユーザーは最近プロジェクトマネージャーになった
- ユーザーは仕事で悩みを抱えている

User: 今日はどんな一日でしたか？
```

## 7. 実装フェーズ

### Phase 1: 基盤構築（1-2週間） ✅ 完了
- [x] プロジェクト初期化（Cloudflare Workers + Pages）
- [x] データベーススキーマ作成（Cloudflare D1）
- [x] 基本的なプロジェクト構造の構築
- [x] TypeScript設定、ESLint、Prettier設定

### Phase 2: 認証機能（1週間） ✅ 完了
- [x] ユーザー登録API実装
- [x] ログインAPI実装
- [x] JWT認証ミドルウェア実装
- [x] パスワードハッシュ化（bcrypt）
- [x] フロントエンド：ログイン・登録画面

### Phase 3: 基本チャット機能（1-2週間） ✅ 完了
- [x] 会話作成・取得API実装
- [x] メッセージ送信API実装
- [x] Cloudflare AI統合
- [x] フロントエンド：チャットUI実装
- [x] リアルタイム応答表示（ストリーミング）

### Phase 4: メモリ管理システム（2-3週間） ✅ 完了
- [x] 構造化変換ロジック実装
- [x] メモリ分類ロジック実装
- [x] 重複チェックロジック実装
- [x] メモリ保存・取得API実装
- [x] コンテキスト注入システム実装
- [x] フロントエンド：メモリ表示UI

### Phase 5: 検索機能（1週間）
- [ ] メモリ検索API実装
- [ ] フルテキスト検索実装
- [ ] フロントエンド：検索UI

### Phase 6: テストとデプロイ（1週間）
- [ ] ユニットテスト作成
- [ ] E2Eテスト作成
- [ ] パフォーマンステスト
- [ ] セキュリティレビュー
- [ ] 本番デプロイ

## 8. ディレクトリ構造

```
memory-assistant-v5/
├── frontend/                    # フロントエンド（React + Vite）
│   ├── src/
│   │   ├── components/          # UIコンポーネント
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageList.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   └── ConversationList.tsx
│   │   │   ├── memory/
│   │   │   │   ├── MemoryList.tsx
│   │   │   │   ├── MemorySearch.tsx
│   │   │   │   └── MemoryCard.tsx
│   │   │   └── common/
│   │   │       ├── Header.tsx
│   │   │       ├── Sidebar.tsx
│   │   │       └── Loading.tsx
│   │   ├── contexts/            # React Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── ChatContext.tsx
│   │   ├── hooks/               # カスタムフック
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   └── useMemory.ts
│   │   ├── services/            # APIクライアント
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   └── memory.ts
│   │   ├── types/               # 型定義
│   │   │   └── index.ts
│   │   ├── utils/               # ユーティリティ
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                     # バックエンド（Cloudflare Workers）
│   ├── src/
│   │   ├── index.ts             # エントリーポイント
│   │   ├── routes/              # APIルート
│   │   │   ├── auth.ts
│   │   │   ├── conversations.ts
│   │   │   └── memories.ts
│   │   ├── services/            # ビジネスロジック
│   │   │   ├── auth.service.ts
│   │   │   ├── chat.service.ts
│   │   │   ├── memory.service.ts
│   │   │   └── ai.service.ts
│   │   ├── middleware/          # ミドルウェア
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── db/                  # データベース
│   │   │   ├── schema.ts
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial.sql
│   │   │   └── client.ts
│   │   ├── utils/               # ユーティリティ
│   │   │   ├── jwt.ts
│   │   │   ├── password.ts
│   │   │   └── similarity.ts
│   │   └── types/               # 型定義
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml            # Cloudflare設定
│
├── shared/                      # 共有型定義
│   └── types.ts
│
├── docs/                        # ドキュメント
│   ├── api.md
│   └── architecture.md
│
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── IMPLEMENTATION_PLAN.md       # このファイル
├── CLAUDE.md
└── README.md
```

## 9. セキュリティ考慮事項

### 9.1 認証・認可
- [ ] パスワードは bcrypt でハッシュ化（コスト係数: 10以上）
- [ ] JWTトークンに有効期限を設定（例: 24時間）
- [ ] リフレッシュトークンの実装（オプション）
- [ ] レート制限の実装（Cloudflare Workers Rate Limiting）

### 9.2 データ保護
- [ ] SQL インジェクション対策（プリペアドステートメント使用）
- [ ] XSS対策（入力のサニタイゼーション）
- [ ] CSRF対策（トークン検証）
- [ ] HTTPS強制

### 9.3 プライバシー
- [ ] ユーザーデータの暗号化（保存時）
- [ ] ユーザーによるデータ削除機能
- [ ] プライバシーポリシーの作成

## 10. パフォーマンス最適化

### 10.1 データベース
- [ ] 適切なインデックス作成
- [ ] クエリの最適化
- [ ] N+1問題の回避

### 10.2 AI応答
- [ ] レスポンスのストリーミング実装
- [ ] コンテキストサイズの制限（トークン数管理）
- [ ] キャッシュ戦略（Cloudflare Cache API）

### 10.3 フロントエンド
- [ ] コード分割（React lazy loading）
- [ ] 画像最適化
- [ ] CDN活用（Cloudflare自動）

## 11. モニタリングとログ

- [ ] エラーログ収集（Cloudflare Workers Analytics）
- [ ] パフォーマンスモニタリング
- [ ] ユーザー行動分析（オプション）

## 12. 今後の拡張可能性

### 12.1 高度な機能
- [ ] ベクトル検索（Cloudflare Vectorize統合）
- [ ] 会話の要約機能
- [ ] マルチモーダル対応（画像、音声）
- [ ] プラグインシステム

### 12.2 スケーラビリティ
- [ ] 複数のAIモデル切り替え
- [ ] メモリの自動重要度調整
- [ ] 古いメモリの自動アーカイブ

## 13. 開発開始手順

1. Cloudflareアカウント作成・設定
2. Wranglerのインストール: `npm install -g wrangler`
3. D1データベース作成: `wrangler d1 create memory-assistant-db`
4. プロジェクト初期化
5. 依存関係インストール
6. 開発サーバー起動

## 14. 参考リソース

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Hono Framework](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
