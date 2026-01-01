# Memory Assistant v5 デプロイメントガイド

GitHub から Cloudflare へのデプロイ手順を詳しく解説します。

## 目次

1. [前提条件](#前提条件)
2. [Cloudflare アカウントのセットアップ](#cloudflare-アカウントのセットアップ)
3. [Wrangler CLI のインストールとログイン](#wrangler-cli-のインストールとログイン)
4. [D1 データベースのセットアップ](#d1-データベースのセットアップ)
5. [バックエンド（Cloudflare Workers）のデプロイ](#バックエンドcloudflare-workersのデプロイ)
6. [フロントエンド（Cloudflare Pages）のデプロイ](#フロントエンドcloudflare-pagesのデプロイ)
7. [環境変数の設定](#環境変数の設定)
8. [GitHub Actions による自動デプロイ](#github-actions-による自動デプロイ)
9. [デプロイ後の確認](#デプロイ後の確認)
10. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

デプロイを開始する前に、以下が必要です。

### 必須アカウント
- **GitHub アカウント**: プロジェクトのリポジトリ管理用
- **Cloudflare アカウント**: デプロイ先（無料プランで OK）
  - [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### 必須ツール
- **Node.js**: 18.0.0 以上
  ```bash
  node --version  # v18.0.0 以上であることを確認
  ```
- **npm**: 8.0.0 以上
  ```bash
  npm --version
  ```
- **Git**: 最新版
  ```bash
  git --version
  ```

---

## Cloudflare アカウントのセットアップ

### 1. Cloudflare にサインアップ

1. [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) にアクセス
2. メールアドレスとパスワードを入力してアカウントを作成
3. メール認証を完了

### 2. API トークンの取得

#### Workers AI へのアクセスを有効化

1. Cloudflare ダッシュボードにログイン
2. 左メニューから **「Workers & Pages」** を選択
3. **「Overview」** タブで Workers AI が利用可能か確認

#### API トークンの作成（オプション：CI/CD 用）

1. 右上のプロフィールアイコン → **「My Profile」**
2. 左メニューから **「API Tokens」**
3. **「Create Token」** をクリック
4. **「Edit Cloudflare Workers」** テンプレートを使用
5. 以下の権限を設定：
   - Account Resources: `Workers Scripts:Edit`
   - Zone Resources: `All zones`
6. **「Continue to summary」** → **「Create Token」**
7. トークンをコピーして安全な場所に保存（再表示不可）

---

## Wrangler CLI のインストールとログイン

### 1. Wrangler のインストール

グローバルにインストール：
```bash
npm install -g wrangler
```

インストール確認：
```bash
wrangler --version
```

### 2. Cloudflare にログイン

```bash
wrangler login
```

- ブラウザが開くので、Cloudflare にログイン
- **「Allow」** をクリックして認証を完了
- ターミナルに「Successfully logged in」と表示されれば成功

### 3. アカウント情報の確認

```bash
wrangler whoami
```

アカウント ID とメールアドレスが表示されます。

---

## D1 データベースのセットアップ

### 1. D1 データベースの作成

プロジェクトのルートディレクトリで実行：
```bash
wrangler d1 create memory-assistant-db
```

**出力例:**
```
✅ Successfully created DB 'memory-assistant-db'!

[[d1_databases]]
binding = "DB"
database_name = "memory-assistant-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. wrangler.toml の更新

出力された `database_id` を `backend/wrangler.toml` に設定します。

**backend/wrangler.toml:**
```toml
name = "memory-assistant-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# D1 データベース設定
[[d1_databases]]
binding = "DB"
database_name = "memory-assistant-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # ← ここに貼り付け

# Workers AI バインディング
[ai]
binding = "AI"
```

### 3. データベースマイグレーションの実行

#### ローカル環境（開発用）

```bash
cd backend
wrangler d1 migrations apply memory-assistant-db --local
```

#### 本番環境

```bash
cd backend
wrangler d1 migrations apply memory-assistant-db
```

確認プロンプトで `y` を入力してマイグレーションを適用します。

### 4. マイグレーションの確認

```bash
wrangler d1 execute memory-assistant-db --command "SELECT name FROM sqlite_master WHERE type='table';"
```

テーブル一覧が表示されれば成功：
- `users`
- `conversations`
- `messages`
- `memories`
- `memory_embeddings`

---

## バックエンド（Cloudflare Workers）のデプロイ

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

### 2. ローカルでのテスト（オプション）

デプロイ前に動作確認：
```bash
npm run dev
```

- ローカルサーバーが起動: `http://127.0.0.1:8787`
- Ctrl+C で停止

### 3. 本番環境へのデプロイ

```bash
npm run deploy
```

または直接：
```bash
wrangler deploy
```

**デプロイ完了時の出力:**
```
✨ Built successfully!
✨ Uploaded successfully!
🌎  https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev
```

### 4. デプロイの確認

ブラウザまたは curl でヘルスチェック：
```bash
curl https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev/api/health
```

レスポンス例：
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

## フロントエンド（Cloudflare Pages）のデプロイ

Cloudflare Pages には 2 つのデプロイ方法があります。

### 方法 1: GitHub 連携（推奨）

#### 1. GitHub リポジトリにプッシュ

```bash
git add .
git commit -m "[追加] フロントエンド実装"
git push origin main
```

#### 2. Cloudflare Pages プロジェクトの作成

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com) にログイン
2. 左メニューから **「Workers & Pages」** → **「Create application」**
3. **「Pages」** タブを選択 → **「Connect to Git」**
4. **GitHub** を選択して認証
5. リポジトリを選択: `memory-assistant-v5`
6. 以下のビルド設定を入力：

   | 設定項目 | 値 |
   |---------|-----|
   | **Project name** | `memory-assistant-frontend` |
   | **Production branch** | `main` |
   | **Framework preset** | `None`（または `Vite`） |
   | **Build command** | `cd frontend && npm install && npm run build` |
   | **Build output directory** | `frontend/dist` |
   | **Root directory** | `/` |

7. **「Environment variables」** セクションで環境変数を追加：

   | 変数名 | 値 |
   |--------|-----|
   | `VITE_API_URL` | `https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev` |

8. **「Save and Deploy」** をクリック

#### 3. デプロイの完了を待つ

- ビルドログが表示されます
- 完了すると URL が発行されます: `https://memory-assistant-frontend.pages.dev`

### 方法 2: Wrangler CLI 経由（手動デプロイ）

#### 1. フロントエンドをビルド

```bash
cd frontend
npm install
npm run build
```

#### 2. Cloudflare Pages にデプロイ

```bash
wrangler pages deploy dist --project-name=memory-assistant-frontend
```

初回デプロイ時は以下のプロンプトが表示されます：
```
? Create a new project? (Y/n) Y
? Enter the name of your new project: memory-assistant-frontend
```

#### 3. 環境変数の設定

```bash
wrangler pages deployment create memory-assistant-frontend production \
  --env VITE_API_URL=https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev
```

---

## 環境変数の設定

### バックエンド（Workers）の環境変数

`wrangler.toml` に直接記載するか、Cloudflare ダッシュボードから設定します。

#### wrangler.toml に追加

```toml
[vars]
JWT_SECRET = "your-super-secret-jwt-key-change-in-production"
ENVIRONMENT = "production"
```

#### ダッシュボードから設定（機密情報用）

1. Cloudflare ダッシュボード → **「Workers & Pages」**
2. **`memory-assistant-backend`** を選択
3. **「Settings」** タブ → **「Variables」**
4. **「Add variable」** をクリック
5. 以下を設定：
   - **JWT_SECRET**: ランダムな長い文字列
   - **Type**: Secret（暗号化される）

### フロントエンドの環境変数

Cloudflare Pages ダッシュボードから設定：

1. **「Workers & Pages」** → **`memory-assistant-frontend`**
2. **「Settings」** → **「Environment variables」**
3. **Production** タブで以下を追加：

   | 変数名 | 値 |
   |--------|-----|
   | `VITE_API_URL` | バックエンドの URL |

4. **「Save」** をクリック
5. **「Redeploy」** で再デプロイ

---

## GitHub Actions による自動デプロイ

### 1. GitHub Secrets の設定

リポジトリの Settings から Secrets を追加します。

1. GitHub リポジトリページ → **「Settings」**
2. 左メニュー → **「Secrets and variables」** → **「Actions」**
3. **「New repository secret」** をクリック
4. 以下の Secrets を追加：

   | Secret 名 | 値 |
   |-----------|-----|
   | `CLOUDFLARE_API_TOKEN` | API トークン（前述で作成） |
   | `CLOUDFLARE_ACCOUNT_ID` | ダッシュボードから取得 |

#### Account ID の取得方法

```bash
wrangler whoami
```

または Cloudflare ダッシュボード右上のプロフィール → **「Account ID」**

### 2. GitHub Actions ワークフローの作成

`.github/workflows/deploy.yml` を作成：

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy-backend:
    name: Deploy Backend (Workers)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./backend
        run: npm ci

      - name: Deploy to Cloudflare Workers
        working-directory: ./backend
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

  deploy-frontend:
    name: Deploy Frontend (Pages)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build frontend
        working-directory: ./frontend
        run: npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy to Cloudflare Pages
        working-directory: ./frontend
        run: npx wrangler pages deploy dist --project-name=memory-assistant-frontend
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 3. ワークフローのテスト

```bash
git add .github/workflows/deploy.yml
git commit -m "[追加] GitHub Actions デプロイワークフロー"
git push origin main
```

GitHub の **「Actions」** タブでワークフローの実行状況を確認できます。

---

## デプロイ後の確認

### 1. バックエンド API の動作確認

#### ヘルスチェック

```bash
curl https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev/api/health
```

#### ユーザー登録テスト

```bash
curl -X POST https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "display_name": "テストユーザー"
  }'
```

レスポンス例：
```json
{
  "user": {
    "id": 1,
    "email": "test@example.com",
    "display_name": "テストユーザー"
  },
  "token": "eyJhbGc..."
}
```

### 2. フロントエンドの動作確認

ブラウザで以下にアクセス：
```
https://memory-assistant-frontend.pages.dev
```

- ログイン画面が表示されるか
- ユーザー登録が可能か
- チャット機能が動作するか

### 3. データベースの確認

```bash
wrangler d1 execute memory-assistant-db --command "SELECT * FROM users LIMIT 5;"
```

登録したユーザー情報が表示されれば成功。

---

## トラブルシューティング

### 問題 1: `wrangler login` が失敗する

**症状:**
```
Error: Failed to login
```

**解決策:**
1. ブラウザのポップアップブロッカーを無効化
2. 別のブラウザで試す
3. 手動で API トークンを設定：
   ```bash
   export CLOUDFLARE_API_TOKEN=your-api-token
   ```

### 問題 2: D1 マイグレーションが失敗する

**症状:**
```
Error: Migration failed
```

**解決策:**
1. マイグレーションファイルの SQL 構文を確認
2. 既存のマイグレーションを確認：
   ```bash
   wrangler d1 migrations list memory-assistant-db
   ```
3. データベースをリセット（注意: データが削除されます）：
   ```bash
   wrangler d1 delete memory-assistant-db
   wrangler d1 create memory-assistant-db
   ```

### 問題 3: Workers デプロイ時に「Bindings not found」エラー

**症状:**
```
Error: Binding "DB" not found
```

**解決策:**
`wrangler.toml` に D1 バインディングが正しく設定されているか確認：
```toml
[[d1_databases]]
binding = "DB"
database_name = "memory-assistant-db"
database_id = "your-database-id"
```

### 問題 4: CORS エラーが発生する

**症状:**
ブラウザのコンソールに以下が表示：
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**解決策:**
バックエンドの CORS 設定を確認（`backend/src/index.ts`）：
```typescript
app.use('*', cors({
  origin: [
    'https://memory-assistant-frontend.pages.dev',
    'http://localhost:5173'  // 開発環境
  ],
  credentials: true
}))
```

### 問題 5: 環境変数が反映されない

**症状:**
フロントエンドで API URL が undefined

**解決策:**
1. Cloudflare Pages ダッシュボードで環境変数を確認
2. 再デプロイを実行：
   ```bash
   wrangler pages deployment create memory-assistant-frontend production
   ```
3. ビルド時に環境変数がログに表示されているか確認

### 問題 6: GitHub Actions が失敗する

**症状:**
デプロイワークフローが失敗

**解決策:**
1. GitHub Secrets が正しく設定されているか確認
2. Actions のログを詳細に確認
3. ローカルで `wrangler deploy` が成功するか確認
4. API トークンの権限を確認

---

## 本番環境のセキュリティ強化

### 1. JWT Secret の変更

**強力なランダム文字列を生成:**
```bash
openssl rand -base64 32
```

Cloudflare ダッシュボードで Secret として設定。

### 2. レート制限の有効化

Cloudflare ダッシュボード → **「Security」** → **「WAF」** でレート制限を設定。

### 3. カスタムドメインの設定（オプション）

#### Pages のカスタムドメイン

1. Cloudflare Pages プロジェクト → **「Custom domains」**
2. **「Set up a custom domain」** をクリック
3. ドメイン名を入力（例: `app.yourdomain.com`）
4. DNS レコードが自動的に設定されます

#### Workers のカスタムドメイン

`wrangler.toml` に追加：
```toml
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

---

## まとめ

これで GitHub から Cloudflare への完全なデプロイが完了しました！

**デプロイされた URL:**
- フロントエンド: `https://memory-assistant-frontend.pages.dev`
- バックエンド: `https://memory-assistant-backend.YOUR_SUBDOMAIN.workers.dev`

**次のステップ:**
1. カスタムドメインの設定
2. モニタリングとログ分析
3. パフォーマンス最適化
4. セキュリティ監査

問題が発生した場合は、[Cloudflare コミュニティフォーラム](https://community.cloudflare.com/)や GitHub Issues で質問してください。

Happy Deploying! 🚀
