# 過去問アーカイブ - Cloudflare Pages版

このフォルダをそのままCloudflare Pagesにデプロイすると、後輩たちが使える過去問検索サイトが公開されます。
データ（登録済みの過去問一覧）はCloudflare Workers KVというストレージに保存され、全員が同じデータを見られます。
管理者パスワードはCloudflareの環境変数としてサーバー側にのみ保存され、コードやブラウザには一切含まれません。

## フォルダ構成

```
kakomon-cf-pages/
├── public/
│   └── index.html          ← サイト本体（検索画面・管理者画面）
├── functions/
│   └── api/
│       ├── entries.js      ← 一覧取得(GET) / 新規登録(POST)
│       ├── entries/
│       │   └── [id].js     ← 更新(PUT) / 削除(DELETE)
│       └── verify.js       ← 管理者パスワードの照合のみ
├── wrangler.toml            ← CLIでデプロイする場合の設定
└── README.md                 ← このファイル
```

## デプロイ手順（Cloudflareダッシュボードを使う場合・おすすめ）

### 1. KV（データの保存場所）を作る
1. https://dash.cloudflare.com にログイン
2. 左メニュー「Workers & Pages」→「KV」→「Create a namespace」
3. 名前は何でもOK（例: `kakomon-kv`）→ 作成

### 2. コードをGitHub等に置く
Cloudflare Pagesは基本的にGitリポジトリと連携してデプロイします。
1. このフォルダの中身をGitHub（プライベートリポジトリでOK）にpush
   ※ 「GitHubは使いたくない」とのことでしたが、これはPDFを置く場所ではなく、
     サイトのプログラム自体を保管する場所です。中身にPDFは一切含まれません。
     どうしても避けたい場合は、下の「CLIでデプロイする場合」を使ってください。

### 3. Cloudflare Pagesプロジェクトを作成
1. 「Workers & Pages」→「Create application」→「Pages」→「Connect to Git」
2. 手順2のリポジトリを選択
3. ビルド設定:
   - Build command: 空欄のまま（ビルド不要な静的サイトです）
   - Build output directory: `public`
4. 「Save and Deploy」

### 4. KVをこのサイトに紐づける
1. 作成したPagesプロジェクトの「Settings」→「Functions」→「KV namespace bindings」
2. 「Add binding」
   - Variable name: `KAKOMON_KV`（この名前は必ず一致させてください）
   - KV namespace: 手順1で作ったものを選択

### 5. 管理者パスワードを設定する
1. 同じ「Settings」内の「Environment variables」
2. 「Add variable」
   - Variable name: `ADMIN_PASSWORD_HASH`
   - Value: 好きなパスワードのSHA-256ハッシュ値（下記の方法で作れます）
   - **必ず「Encrypt」（Secretにする）を選択してください**

**パスワードのハッシュ値の作り方**（好きな方でOK）:
- ブラウザのアドレスバー横の「開発者ツール」→「Console」で以下を実行:
  ```js
  crypto.subtle.digest('SHA-256', new TextEncoder().encode('好きなパスワード'))
    .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('')))
  ```
- または、Mac/Linuxのターミナルで:
  ```
  echo -n "好きなパスワード" | shasum -a 256
  ```
表示された64文字の英数字をそのまま `ADMIN_PASSWORD_HASH` の値として貼り付けてください。

### 6. 再デプロイ
環境変数とKV bindingは、設定後に「Deployments」タブから最新デプロイを「Retry deployment」すると反映されます。

### 7. 完成
発行されたURL（例: `https://kakomon-archive.pages.dev`）を後輩たちに共有すれば完了です。

---

## デプロイ手順（GitHubを使わずCLIだけでやりたい場合）

Node.jsがインストールされたPCで:

```bash
npm install -g wrangler
wrangler login

# KV Namespaceを作成（表示されたidをwrangler.tomlに貼り付け）
wrangler kv namespace create KAKOMON_KV

# 管理者パスワードのハッシュを環境変数として登録
wrangler pages secret put ADMIN_PASSWORD_HASH --project-name kakomon-archive
# → プロンプトが出たら、SHA-256ハッシュ値(64文字)を貼り付けて Enter

# デプロイ
wrangler pages deploy public --project-name kakomon-archive
```

この方法ならGitHubは一切使わず、自分のPCから直接Cloudflareへアップロードできます。

---

## 動作の仕組み（参考）

- **検索・閲覧**: 誰でも `GET /api/entries` でKVに保存された一覧を取得できます（ログイン不要）
- **登録・編集・削除**: `/api/entries`（POST）、`/api/entries/:id`（PUT/DELETE）を叩く際にパスワードを一緒に送り、
  Cloudflare Functionsがサーバー側で `ADMIN_PASSWORD_HASH` と照合します。一致しなければ401エラーになります。
- パスワードの平文・ハッシュ値はどちらもブラウザ側のコードには含まれないため、
  ソースコードを見られても管理者パスワードは分かりません。

## 注意点

- PDF本体はこの仕組みには保存されません。今までどおりSharePoint等にアップロードし、そのリンクを登録してください。
- KVは「最終的に反映される」タイプのストレージなので、ごく稀に更新直後の一覧取得で反映が1〜2秒遅れることがあります（45人規模の使い方であれば実用上ほぼ気になりません）。
- 管理者パスワードを変更したくなったら、手順5と同じ場所で`ADMIN_PASSWORD_HASH`の値を更新するだけでOKです。
