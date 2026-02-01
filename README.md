# questionnaire
アンケートサイト（フロントは Vite、バックエンドは Cloudflare Workers）

## 概要
- フロント: Vite で `index.html` を入口にアンケートフォームを提供
- バックエンド: Cloudflare Workers が `/api/submit` を受けて Brevo でメール送信
- 開発時は Vite のプロキシで `/api` を Worker に転送

## 主要構成
- フロント: `index.html`, `src/`
- Worker: `worker/src/worker.ts`, `worker/wrangler.jsonc`
- 開発用スクリプト: `scripts/dev.sh`

## プライバシーポリシー
静的配信の確実性を優先し、`public/privacy/index.html` を採用しています。  
アクセスURL: `/privacy/`

## 環境変数（Worker）
ローカル開発時は `worker/.dev.vars` に設定します（例は `worker/.dev.vars.example`）。

必須:
- `BREVO_API_KEY`
- `BREVO_SENDER_EMAIL`
- `BREVO_TO_EMAIL`

任意:
- `BREVO_SENDER_NAME`
- `BREVO_TO_NAME`
- `DUMMY_SEND`（`true` の場合、実送信せずダミーレスポンス）

※ `worker/.dev.vars` は Git にコミットしないでください。

## 起動方法（ローカル）
### まとめて起動
別ターミナル不要で Worker と Vite を同時に起動します。

```bash
npm run dev:all
```

### 個別に起動
Worker:
```bash
cd worker
npm run dev
```

フロント:
```bash
cd ..
npm run dev
```

### アクセス先
- フロント: `http://localhost:8787`
- Worker: `http://127.0.0.1:8788`

## 停止方法
### まとめて停止
```bash
npm run dev:stop
```

### 起動中ターミナルから停止
`dev:all` 実行中のターミナルで `Ctrl + C`。

## 補足
- `vite.config.js` で `/api` を `http://127.0.0.1:8788` にプロキシしています。
