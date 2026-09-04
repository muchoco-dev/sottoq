# SottoQ（そっとキュー）

シャイなコミュニティメンバー同士でも気軽に質問・回答できる Slack アプリです。

- 質問者は常に匿名です。質問者の Slack User ID は保存しません
- 回答者は匿名か記名かを自分で選べます
- 管理者が質問・回答を承認してから配信・公開します（管理画面はこのリポジトリにはありません。Admin API を用意しています）
- ソースは公開し、匿名性の仕組みを誰でも確認できます

## できること

1. `/ask` で質問を投稿する（承認待ち）
2. 管理者が質問を承認する（Admin API または DB）
3. 毎日 9:00 と 20:00（Asia/Tokyo）に、募集中の質問を掲載先チャンネルのメンバーからランダム 5 人へ DM する
4. 受信者は「回答する」から匿名または記名で回答する（承認待ち）
5. 管理者が回答を承認する（Admin API または DB）
6. 毎日 12:00 と 20:30 に、未投稿の承認済み回答を最大 3 件、10 分間隔で公開チャンネルへ投稿する
7. 作成から 1 週間経過、または却下以外の回答が 5 件集まった時点で募集を終了し、送信先ハッシュを削除する

## 必要要件

- Node.js 20 以上
- Docker（MariaDB 用）
- Slack ワークスペースのアプリ作成権限

## セットアップ

### 1. リポジトリ

```bash
git clone https://github.com/muchoco-dev/sottoq.git
cd sottoq
cp .env.example .env
```

`HMAC_SECRET` は次のように生成します。

```bash
openssl rand -hex 32
```

### 2. Slack App

1. [api.slack.com/apps](https://api.slack.com/apps) でアプリを作成する
2. `slack-manifest.yaml` をインポートするか、同等の設定を手で入れる
3. Bot Token Scopes: `commands`, `chat:write`, `chat:write.public`, `im:write`, `users:read`, `channels:read`, `groups:read`
4. スラッシュコマンド `/ask`（説明: 匿名で質問する）
5. Interactivity を有効にする
6. ローカルは Socket Mode を推奨（App-Level Token に `connections:write`）
7. 本番は Request URL を `https://<your-domain>/slack/events` にする
8. ワークスペースへインストールし、掲載先チャンネルにボットを招待する
9. `.env` に `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_APP_TOKEN`（Socket Mode 時）, `SLACK_CHANNEL_ID` を入れる

### 3. データベースとアプリ

```bash
docker compose up -d db
npm install
npx prisma generate
npx prisma migrate deploy
npm test
npm run dev
```

アプリと DB をまとめて起動する場合:

```bash
docker compose --profile full up --build
```

# 管理画面向け Admin API（このリポジトリに管理 UI はありません）

`ADMIN_API_TOKEN` を設定すると、同じポートで `/admin/*` が有効になります。未設定なら `/admin` は 404 です。認証は `Authorization: Bearer <ADMIN_API_TOKEN>`。

| メソッド | パス | 役割 |
| --- | --- | --- |
| GET | `/admin/questions` | 一覧。`status` クエリで pending / approved / rejected |
| POST | `/admin/questions/:id/approve` | `pending` → `approved` |
| POST | `/admin/questions/:id/reject` | `pending` → `rejected` |
| POST | `/admin/questions/:id/send` | 募集中の質問を今すぐ最大 5 人へ DM |
| GET | `/admin/answers` | 一覧。`?status=` 可 |
| POST | `/admin/answers/:id/approve` | `pending` → `approved` |
| POST | `/admin/answers/:id/reject` | `pending` → `rejected` |
| POST | `/admin/answers/:id/post` | 承認済み・未投稿の回答をチャンネルへ即時投稿 |

pending 以外への承認・却下、募集中でない質問への `send`、未承認または投稿済み回答への `post` は 409 です。トークン不一致は 401 です。

即時 DM は次の 9:00 / 20:00 の定期配信を止めません。成功後に定期ジョブが走ると別の 5 人へ追加されます。

## 管理者操作（DB 直接）

Admin API を使わず、MariaDB を直接更新しても同じ承認・却下ができます。

```sql
-- 未処理の質問
SELECT id, body, status, created_at FROM questions WHERE status = 'pending';

-- 質問を承認
UPDATE questions
SET status = 'approved', moderated_at = NOW()
WHERE id = ? AND status = 'pending';

-- 質問を却下
UPDATE questions
SET status = 'rejected', moderated_at = NOW()
WHERE id = ? AND status = 'pending';

-- 未処理の回答
SELECT a.id, a.question_id, a.body, a.is_anonymous, a.answerer_slack_user_id, a.status
FROM answers a
WHERE a.status = 'pending';

-- 回答を承認
UPDATE answers
SET status = 'approved'
WHERE id = ? AND status = 'pending';

-- 回答を却下
UPDATE answers
SET status = 'rejected'
WHERE id = ? AND status = 'pending';
```

承認後、定期ジョブ（または手動実行）が DM 送信・チャンネル投稿を行います。

```bash
npm run job:send   # 募集中の質問を 5 人へ DM
npm run job:post   # 未投稿の承認済み回答を最大 3 件投稿
npm run job:close  # 募集終了と送信先ハッシュ削除
```

## スケジュール（Asia/Tokyo）

| 処理 | 時刻 |
| --- | --- |
| 回答募集 DM | 9:00 と 20:00 |
| チャンネル投稿 | 12:00 と 20:30（最大 3 件、10 分間隔） |
| 募集終了チェック | 毎時 0 分（送信ジョブの直前にも実行） |

募集中の条件（すべて満たすこと）:

- 質問が `approved`
- `closed_at` が空
- **作成日時**から 7 日以内（承認が遅いと募集期間が短くなります）
- 却下以外の回答（`pending` + `approved`）が 5 件未満

## チャンネル投稿の形式

スレッドにはしません。1 投稿 = 1 質問 + 1 回答です。同じ質問に複数の回答がある場合、質問文が繰り返し出ます。

匿名:

```
そっと届いた質問に、誰かが答えてくれました 🙌

> {質問本文}

**回答**

> {回答本文}
```

記名:

```
そっと届いた質問に、<@U123>さんが答えてくれました 🙌

> {質問本文}

**回答**

> {回答本文}
```

## 匿名性

- 質問レコードに質問者の Slack User ID を置きません。管理者も質問者を特定できません
- そのため再送時に質問者を除外できず、質問者自身に質問が届くことがあります（仕様上のトレードオフ）
- 送信先は `HMAC-SHA256(HMAC_SECRET, Slack User ID)` のみを保存します。ハッシュから User ID は復元できません
- 回答行と送信先行は結びません
- 匿名回答では `answerer_slack_user_id` を `NULL` にします。記名を選んだときだけ User ID を保存します
- 募集終了時に送信先ハッシュを削除し、送信件数・回答件数の集計だけ残します
- アプリログに Slack User ID やリクエスト全体は出しません

保存カラムの一覧は `prisma/schema.prisma` で確認できます。

## 開発

```bash
npm test          # Slack / Prisma を Mock したテスト
npm run test:watch
npm run build
```

テストは実 Slack・実 MariaDB を使いません。

## ライセンス

[GNU GPL v3](LICENSE)
