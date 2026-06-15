# BO-AutoBot Web Site

BO-AutoBotの商品紹介、問い合わせ、購入手続き、決済を提供する静的Webサイトです。

フロントエンドはHTML、CSS、JavaScriptで構成され、問い合わせ・注文管理・メール送信・PayPal連携などのサーバー側処理はGoogle Apps Script（GAS）が担当します。

## 目次

- [システム概要](#システム概要)
- [主な機能](#主な機能)
- [技術構成](#技術構成)
- [システム構成](#システム構成)
- [ディレクトリ構成](#ディレクトリ構成)
- [ページ一覧](#ページ一覧)
- [ローカル開発](#ローカル開発)
- [GAS環境の切り替え](#gas環境の切り替え)
- [フロントエンドの共通処理](#フロントエンドの共通処理)
- [問い合わせフロー](#問い合わせフロー)
- [購入・決済フロー](#購入決済フロー)
- [GASバックエンド](#gasバックエンド)
- [GASスクリプトプロパティ](#gasスクリプトプロパティ)
- [スプレッドシート](#スプレッドシート)
- [外部サービス](#外部サービス)
- [ブランチと環境](#ブランチと環境)
- [変更時の注意事項](#変更時の注意事項)
- [動作確認](#動作確認)
- [デプロイ前チェックリスト](#デプロイ前チェックリスト)
- [セキュリティと運用上の注意](#セキュリティと運用上の注意)
- [既知の制約](#既知の制約)

## システム概要

このリポジトリには、BO-AutoBot公式サイトの画面とGASバックエンドのソースが含まれています。

| 項目 | 内容 |
| --- | --- |
| サイト名 | BO-AutoBot |
| 本番サイトのcanonical URL | `https://bo-autobot.com/` |
| リポジトリ | `kaki2019g/bo-autobot` |
| フロントエンド形式 | ビルド不要の静的サイト |
| バックエンド形式 | GAS Web App |

実際のホスティング先、公開対象ブランチ、独自ドメイン設定はリポジトリ内に定義されていないため、ホスティングサービス側の設定を確認してください。

主な対象領域は次のとおりです。

- BO-AutoBotおよびデモ版の商品紹介
- 購入者情報の入力と注文内容確認
- 銀行振込による注文受付
- PayPalによるカード決済
- クーポンコードの検証と価格計算
- 問い合わせ受付と添付ファイル送信
- 注文、問い合わせ、商品情報のスプレッドシート管理
- 購入者および管理者へのメール通知
- 商品ファイルのダウンロード案内

公開サイトとしてHTMLファイルを直接配信できる構成です。ビルドツールやフロントエンドフレームワークは使用していません。

## 主な機能

### 商品紹介

- BO-AutoBot通常版の商品詳細表示
- BO-AutoBotデモ版の商品詳細表示
- 商品画像のモーダル表示
- URLクエリによる購入商品の切り替え

### 注文

- 購入者の氏名、メールアドレス、備考、クーポンコードの入力
- 通常版とデモ版の商品情報切り替え
- 注文内容の確認
- GASで発行した署名付き注文トークンによる商品・クーポン改ざん対策
- 銀行振込とPayPalの支払い方法選択

### PayPal

- PayPal注文の作成
- PayPal承認画面への遷移
- 承認後のCapture
- キャンセル時の注文ステータス更新
- Webhook署名検証
- 決済完了時の注文ステータス更新と通知

### 問い合わせ

- 入力、確認、完了の3画面構成
- 特定の問い合わせ種別で添付ファイルを受付
- 問い合わせ内容のスプレッドシート保存
- 自動返信メールと管理者通知メール

### 共通

- ヘッダーとフッターの共通化
- GitHub Pagesのサブディレクトリ配信への対応
- GASのテスト環境と本番環境の切り替え
- テスト環境バッジの表示
- Google AnalyticsおよびGoogle Tag Managerの読み込み
- PC、タブレット、スマートフォン向けレスポンシブ表示

## 技術構成

| 区分 | 技術・サービス | 用途 |
| --- | --- | --- |
| マークアップ | HTML5 | 各ページの構造 |
| スタイル | CSS | レイアウト、装飾、レスポンシブ対応 |
| フロントエンド | JavaScript | フォーム、画面遷移、環境切り替え、決済処理 |
| DOM補助 | jQuery 3.6.0 | メニュー、スクロール、共通UI |
| ローカルサーバー | Node.js | 静的ファイルのローカル配信 |
| バックエンド | Google Apps Script | 問い合わせ、注文、決済、メール、商品送付 |
| データ保存 | Google Sheets | 問い合わせ、注文、商品マスター |
| ファイル配布 | Google Drive | 商品ファイルの閲覧権限付与 |
| 決済 | PayPal REST API | 注文作成、Capture、Webhook |
| メール | GmailApp / MailApp | 自動返信、注文案内、管理者通知 |
| アクセス解析 | Google Analytics / Google Tag Manager | 計測タグの読み込み |

## システム構成

```text
利用者のブラウザ
  |
  |-- HTML / CSS / JavaScript
  |     |-- 商品ページ
  |     |-- 問い合わせページ
  |     |-- 購入・確認・完了ページ
  |     `-- assets/config/gas-env.json
  |
  |-- Google Apps Script Web App
  |     |-- 問い合わせ受付
  |     |-- 注文トークン発行・検証
  |     |-- 銀行振込注文受付
  |     |-- PayPal API連携
  |     |-- メール送信
  |     `-- 商品ファイル権限付与
  |
  |-- Google Sheets
  |     |-- inquiries
  |     |-- orders
  |     `-- products
  |
  |-- Google Drive
  |     `-- 商品ファイル
  |
  `-- PayPal
        |-- 注文承認
        |-- Capture
        `-- Webhook
```

フロントエンドはGAS Web AppへCORSリクエストを送り、GASがGoogle Sheets、Google Drive、メール、PayPal APIとの連携を行います。

## ディレクトリ構成

```text
.
├── AGENTS.md
├── README.md
├── index.html
├── header.html
├── footer.html
├── assets/
│   ├── config/
│   │   `-- gas-env.json
│   ├── css/
│   │   `-- style.css
│   ├── img/
│   │   ├── common/
│   │   ├── home/
│   │   `-- item/
│   `-- js/
│       ├── bo-autobot.js
│       ├── checkout.js
│       ├── common.js
│       ├── contact-confirm.js
│       ├── contact.js
│       ├── include.js
│       ├── payment-bank-confirm.js
│       ├── payment-paypal-cancel.js
│       ├── payment-paypal-confirm.js
│       ├── payment-paypal-done.js
│       `-- tracking.js
├── checkout/
│   `-- checkout.html
├── contact/
│   ├── contact.html
│   ├── contact-confirm.html
│   `-- contact-done.html
├── info/
│   ├── news.html
│   ├── privacypolicy.html
│   `-- terms.html
├── payment/
│   ├── bank/
│   │   ├── payment-bank-confirm.html
│   │   `-- payment-bank-done.html
│   `-- paypal/
│       ├── payment-paypal-cancel.html
│       ├── payment-paypal-confirm.html
│       `-- payment-paypal-done.html
├── products/
│   ├── bo-autobot.html
│   `-- bo-autobot-demo.html
`-- scripts/
    ├── app-gas.js
    `-- serve.mjs
```

### 主要ファイル

| ファイル | 役割 |
| --- | --- |
| `index.html` | トップページ |
| `header.html` | 全ページ共通ヘッダー |
| `footer.html` | 全ページ共通フッター |
| `assets/css/style.css` | サイト全体のスタイル |
| `assets/config/gas-env.json` | 使用するGAS環境の選択 |
| `assets/js/include.js` | 共通HTML読込、パス補正、GAS環境適用 |
| `assets/js/common.js` | メニュー、スクロール、アコーディオンなどの共通UI |
| `assets/js/checkout.js` | 商品選択、注文情報保存、注文トークン発行、確認画面遷移 |
| `assets/js/contact.js` | 問い合わせ入力内容と添付ファイルの一時保存 |
| `assets/js/contact-confirm.js` | 問い合わせ確認画面とGAS送信 |
| `assets/js/payment-bank-confirm.js` | 銀行振込注文の確認とGAS送信 |
| `assets/js/payment-paypal-confirm.js` | PayPal注文作成と承認画面への遷移 |
| `assets/js/payment-paypal-done.js` | PayPal承認後のCapture |
| `assets/js/payment-paypal-cancel.js` | PayPalキャンセル時の注文状態更新 |
| `assets/js/tracking.js` | Google AnalyticsとGoogle Tag Managerの読込 |
| `scripts/app-gas.js` | GAS Web App側のバックエンド処理 |
| `scripts/serve.mjs` | ローカル確認用静的HTTPサーバー |

## ページ一覧

| パス | 内容 |
| --- | --- |
| `/index.html` | トップページ |
| `/products/bo-autobot.html` | 通常版の商品詳細 |
| `/products/bo-autobot-demo.html` | デモ版の商品詳細 |
| `/checkout/checkout.html` | 通常版の購入手続き |
| `/checkout/checkout.html?product=demo` | デモ版の購入手続き |
| `/contact/contact.html` | 問い合わせ入力 |
| `/contact/contact-confirm.html` | 問い合わせ内容確認 |
| `/contact/contact-done.html` | 問い合わせ完了 |
| `/payment/bank/payment-bank-confirm.html` | 銀行振込注文の確認 |
| `/payment/bank/payment-bank-done.html` | 銀行振込注文の受付完了 |
| `/payment/paypal/payment-paypal-confirm.html` | PayPal注文内容の確認 |
| `/payment/paypal/payment-paypal-done.html` | PayPal決済の完了とCapture |
| `/payment/paypal/payment-paypal-cancel.html` | PayPal決済のキャンセル |
| `/info/news.html` | お知らせ |
| `/info/privacypolicy.html` | プライバシーポリシー |
| `/info/terms.html` | 利用規約 |

## ローカル開発

### 前提条件

- Node.jsがインストールされていること
- ブラウザでJavaScriptが有効であること
- GAS連携まで確認する場合はインターネット接続があること

このリポジトリには`package.json`がなく、依存パッケージのインストールやビルドは不要です。`scripts/serve.mjs`はNode.jsの標準モジュールのみを使用します。

### 起動

リポジトリのルートで次を実行します。

```bash
node scripts/serve.mjs
```

起動後、次のURLを開きます。

```text
http://127.0.0.1:8080/
```

サーバーは`127.0.0.1:8080`で固定起動します。

### ファイル一覧の確認

簡易サーバーにはルート直下のHTMLファイルとディレクトリを確認するためのエンドポイントがあります。

```text
http://127.0.0.1:8080/__list
```

### ローカルサーバーが必要な理由

共通ヘッダー、フッター、GAS環境設定は`fetch()`で読み込みます。HTMLファイルを`file://`で直接開くと、ブラウザのセキュリティ制約により正しく動作しない場合があります。

必ずHTTPサーバー経由で確認してください。

### サーバーの仕様

- 静的ファイルをリポジトリルートから配信
- ディレクトリ指定時は`index.html`を探索
- 拡張子なしのURLでは同名の`.html`を探索
- パストラバーサルを拒否
- レスポンスキャッシュを無効化
- HTML、CSS、JavaScript、JSON、主要画像・動画形式のMIME Typeに対応

## GAS環境の切り替え

使用するGAS Web Appは`assets/config/gas-env.json`で切り替えます。

```json
{
  "env": "test",
  "gas_endpoints": {
    "test": "https://script.google.com/macros/s/TEST_DEPLOYMENT_ID/exec",
    "prod": "https://script.google.com/macros/s/PROD_DEPLOYMENT_ID/exec"
  },
  "last_commit_at": "2026-02-01T22:42:21+09:00"
}
```

### 設定値

| 値 | 動作 |
| --- | --- |
| `test` | `gas_endpoints.test`を使用 |
| `prod` | `gas_endpoints.prod`を使用 |

`env`、URL、JSONのいずれかが不正、または設定ファイルを取得できない場合は送信処理を停止します。設定エラー時に本番URLへ暗黙にフォールバックしません。

### `last_commit_at`

`last_commit_at`はテスト環境バッジに表示する最終更新日時です。`env`が`test`の場合のみ、全ページの画面下部にテスト環境であることと更新日時が表示されます。

日時はタイムゾーンを含むISO 8601形式で管理します。

```text
YYYY-MM-DDTHH:mm:ss+09:00
```

### エンドポイントの定義場所

テスト用と本番用のGAS Web App URLは、`assets/config/gas-env.json`の`gas_endpoints`へ集約されています。

```json
"gas_endpoints": {
  "test": "https://script.google.com/macros/s/TEST_DEPLOYMENT_ID/exec",
  "prod": "https://script.google.com/macros/s/PROD_DEPLOYMENT_ID/exec"
}
```

`assets/js/include.js`が環境設定を読み込み、選択したURLを`window.getGasEndpoint()`からPromiseとして提供します。問い合わせ、注文、PayPal完了、PayPalキャンセルの各処理は、設定の読み込み完了を待ってからGASへアクセスします。

GAS URLを変更するときは`assets/config/gas-env.json`のみを更新します。HTMLや個別JavaScriptへURLを直接記載しないでください。

```bash
rg -n "script.google.com/macros" .
```

## フロントエンドの共通処理

### 共通ヘッダーとフッター

各ページは次の空要素を持ちます。

```html
<header id="site-header"></header>
<footer id="site-footer"></footer>
```

`assets/js/include.js`が`header.html`と`footer.html`を取得して挿入します。

共通ナビゲーションを変更する場合は、原則として各ページではなく`header.html`または`footer.html`を変更します。

### GitHub Pagesのベースパス

`assets/js/include.js`は、ホスト名が`github.io`で終わる場合にURLの先頭ディレクトリをリポジトリのベースパスとして扱います。

これにより、次のようなルート相対パスをGitHub Pagesのプロジェクトサイトでも使用できます。

```text
/products/bo-autobot.html
/assets/css/style.css
```

`window.withBasePath()`がグローバルに公開され、各決済スクリプトの画面遷移にも利用されます。

### 共通UI

`assets/js/common.js`は主に次のUIを管理します。

- ヘッダー高さに応じたレイアウト調整
- スマートフォン向けナビゲーション
- スクロール連動の表示
- アコーディオン
- フォーム選択項目の表示制御

このファイルは、ヘッダーとフッターの挿入後に`assets/js/include.js`から動的に読み込まれます。

### セッションストレージ

画面間で入力内容を引き継ぐために`sessionStorage`を使用します。

| キー | 用途 |
| --- | --- |
| `contactFormData` | 問い合わせ入力から確認画面への引き継ぎ |
| `bankOrderData` | 購入画面から銀行振込確認画面への引き継ぎ |
| `paypalOrderData` | 購入画面からPayPal確認画面への引き継ぎ |

ブラウザ設定、プライベートモード、容量制限などで`sessionStorage`が使用できない場合、確認画面へ進めないことがあります。

## 問い合わせフロー

```text
contact.html
  |
  | 入力内容と添付ファイルをsessionStorageへ保存
  v
contact-confirm.html
  |
  | GASへPOST
  |-- 入力検証
  |-- 添付ファイル検証
  |-- スプレッドシートへ保存
  |-- 利用者へ自動返信
  `-- 管理者へ通知
  v
contact-done.html
```

### 必須項目

- 氏名
- メールアドレス
- 件名
- 問い合わせ本文

### 添付ファイル

特定の問い合わせ件名を選択した場合に、サインツール関連ファイルの添付欄が表示されます。

フロントエンドでファイルをBase64 Data URLへ変換し、`sessionStorage`を経由してGASへ送信します。

制限は次のとおりです。

- 最大サイズ: 5MB
- 許可拡張子: `.pdf`、`.zip`、`.png`、`.jpg`、`.jpeg`、`.ex4`
- 許可MIME Type:
  - `application/pdf`
  - `application/zip`
  - `image/png`
  - `image/jpeg`
  - `application/octet-stream`

ファイルサイズはBase64変換前後で増加するため、ブラウザの`sessionStorage`容量にも注意が必要です。

## 購入・決済フロー

### 商品選択

`assets/js/checkout.js`内の商品カタログにより、URLクエリから商品を選択します。

| URL | 商品ID | 商品名 |
| --- | --- | --- |
| `/checkout/checkout.html` | `bo-autobot` | BO-AutoBot |
| `/checkout/checkout.html?product=demo` | `bo-autobot-demo` | BO-AutoBot デモ版 |

商品名、商品ID、表示価格は購入画面で切り替わります。ただし、最終的な価格とクーポン適用結果はGASの商品マスターを基準に決定します。

### 注文トークン

購入確認画面へ進む前に、フロントエンドはGASへ`issue_token`を送信します。

GASは次の情報を含む署名付きトークンを返します。

- 商品ID
- クーポンコード
- 発行時刻

トークンはHMAC-SHA256で署名され、有効期限は10分です。注文確定時に商品IDとクーポンコードがトークンの内容と一致することを検証します。

これはクライアント側の商品情報やクーポンコードの改ざんを検出するための仕組みです。

### 銀行振込

```text
checkout.html
  |
  | 注文トークン発行
  | 入力内容をbankOrderDataへ保存
  v
payment-bank-confirm.html
  |
  | GASへ注文をPOST
  |-- 商品・クーポン・トークン検証
  |-- ordersシートへ保存
  |-- 利用者へ振込先案内
  `-- 管理者へ通知
  v
payment-bank-done.html
```

入金確認後の商品送付は、GASの`sendBankTransferDownloadEmail()`を使用します。

この処理は、注文ステータスが`paid`で、まだ商品送付日時が記録されていない注文を対象にします。商品ファイルが設定されている場合はGoogle Driveの閲覧権限を付与してからダウンロード案内メールを送信します。

この関数を自動実行するトリガー設定はリポジトリに含まれていません。GASエディタから手動実行するか、必要に応じて時間主導型トリガーを設定します。

### PayPal

```text
checkout.html
  |
  | 注文トークン発行
  | 入力内容をpaypalOrderDataへ保存
  v
payment-paypal-confirm.html
  |
  | GASでPayPal注文を作成
  | ordersシートへ注文を保存
  v
PayPal承認画面
  |                    |
  | 承認               | キャンセル
  v                    v
payment-paypal-       payment-paypal-
done.html             cancel.html
  |                    |
  | Capture            | cancel状態へ更新
  v                    v
決済完了             購入画面へ戻る
```

#### 注文作成

確認画面からGASへ注文内容を送信すると、GASがPayPal Orders APIで注文を作成し、承認URLを返します。ブラウザはそのURLへ遷移します。

#### Capture

PayPalから完了画面へ戻った後、URLの`token`を使用してGASへ`capture_paypal`を送信します。GASがPayPalへCaptureリクエストを送り、決済結果を注文シートへ反映します。

#### Webhook

GASはPayPal Webhookも受け付けます。Webhook署名をPayPal APIで検証し、決済完了イベントをもとに注文ステータスを更新し、購入者への注文完了案内と管理者通知を行います。

現状のPayPalフローでは、決済完了直後に商品ダウンロードリンクを自動送付せず、確認後に送付する旨を購入者へ案内します。

#### キャンセル

PayPalのキャンセルURLから戻った場合、URLの注文IDを使用してGASへ`cancel_paypal`を送信し、未決済注文を`cancel`へ更新します。

## GASバックエンド

`scripts/app-gas.js`はGASプロジェクトへ配置するバックエンドコードです。

このリポジトリにはGASの自動デプロイ設定や`clasp`設定は含まれていません。GASへの反映方法とWeb Appのデプロイ運用は、対象GASプロジェクトの管理方法に従ってください。

### `doPost`のルーティング

GAS Web AppへのPOSTは`doPost(e)`が受け付け、内容に応じて処理を分岐します。

| 条件 | 処理 |
| --- | --- |
| PayPal Webhook形式 | Webhook署名検証とイベント処理 |
| `source=contact` | 問い合わせ受付 |
| `action=capture_paypal` | PayPal Capture |
| `action=cancel_paypal` | PayPal注文のキャンセル |
| `action=issue_token` | 注文トークン発行 |
| `source=bank_confirm` | 銀行振込注文 |
| `payment_method=bank_transfer` | 銀行振込注文 |
| `payment_method=paypal` | PayPal注文作成 |

### 主な責務

- 問い合わせの入力検証
- 添付ファイルの検証
- 問い合わせ受付番号の発行
- 問い合わせのスプレッドシート保存
- 問い合わせの自動返信と管理者通知
- 商品マスターの参照
- クーポンの検証と値引き
- 注文トークンの発行と検証
- 注文情報のスプレッドシート保存
- 銀行振込案内メール
- PayPalアクセストークン取得
- PayPal注文作成
- PayPal Capture
- PayPal Webhook署名検証
- 注文ステータス更新
- 商品ダウンロード案内
- Google Drive閲覧権限の付与

## GASスクリプトプロパティ

機密情報や環境依存値は、GASのスクリプトプロパティで管理します。値をソースコードやREADMEへ直接記載しないでください。

| プロパティ | 用途 | 既定値 |
| --- | --- | --- |
| `SHEET_ID` | 問い合わせ・注文・商品管理スプレッドシートID | なし |
| `SHEET_NAME` | 注文シート名 | `orders` |
| `BANK_NAME` | 振込先銀行名 | なし |
| `BANK_BRANCH` | 振込先支店名 | なし |
| `BANK_TYPE` | 口座種別 | なし |
| `BANK_NUMBER` | 口座番号 | なし |
| `BANK_HOLDER` | 口座名義 | なし |
| `PAYPAL_CLIENT_ID` | PayPal Client ID | なし |
| `PAYPAL_CLIENT_SECRET` | PayPal Client Secret | なし |
| `PAYPAL_WEBHOOK_ID` | PayPal Webhook ID | なし |
| `PAYPAL_ENV` | PayPal環境 | `sandbox` |
| `PAYPAL_RETURN_URL` | PayPal承認後の戻り先 | なし |
| `PAYPAL_CANCEL_URL` | PayPalキャンセル時の戻り先 | なし |
| `PRODUCT_DOWNLOAD_URL` | 通常版のダウンロードURL | コード内フォールバックあり |
| `PRODUCT_DOWNLOAD_FILE_ID` | 通常版のGoogle DriveファイルID | なし |
| `PRODUCT_DOWNLOAD_URL_DEMO` | デモ版のダウンロードURL | コード内フォールバックあり |
| `PRODUCT_DOWNLOAD_FILE_ID_DEMO` | デモ版のGoogle DriveファイルID | なし |
| `ORDER_TOKEN_SECRET` | 注文トークンのHMAC署名鍵 | なし |

### 必須性の考え方

- 問い合わせ・注文・商品処理には`SHEET_ID`と対象シートが必要です。
- 銀行振込メールには銀行口座情報が必要です。
- PayPal処理にはPayPal関連プロパティと戻り先URLが必要です。
- 注文トークン発行には十分に長いランダムな`ORDER_TOKEN_SECRET`が必要です。
- Google Driveの権限付与を行う場合は対象ファイルIDが必要です。

### コード内の固定設定

一部の設定はスクリプトプロパティではなく、`scripts/app-gas.js`冒頭の定数として管理されています。

| 定数 | 用途 |
| --- | --- |
| `CONTACT_SHEET_NAME` | 問い合わせシート名 |
| `CONTACT_ADMIN_EMAIL` | 問い合わせ・注文の管理者通知先 |
| `PRODUCT_SHEET_NAME` | 商品マスターのシート名 |
| `CONTACT_REPLY_FROM_NAME` | 問い合わせ自動返信の差出人名 |
| `CONTACT_REPLY_SUBJECT` | 問い合わせ自動返信の件名 |
| `CONTACT_TIMEZONE` | 問い合わせ日時のタイムゾーン |
| `LOG_VERBOSE` | GASログの詳細出力フラグ |
| `ORDER_TOKEN_TTL_MS` | 注文トークンの有効期間 |
| `ATTACHMENT_MAX_BYTES` | 問い合わせ添付ファイルの上限 |
| `ATTACHMENT_ALLOWED_MIME` | 許可するMIME Type |
| `ATTACHMENT_ALLOWED_EXT` | 許可する拡張子 |

これらを変更した場合はGASコードを再デプロイする必要があります。環境ごとに値を変える設定や機密性のある値は、スクリプトプロパティへ移すことを検討してください。

### PayPal環境

`PAYPAL_ENV`は次の値を想定しています。

| 値 | API |
| --- | --- |
| `sandbox` | PayPal Sandbox |
| その他 | PayPal Live |

本番デプロイ前に、フロントエンドの`gas-env.json`とGAS側の`PAYPAL_ENV`が意図した組み合わせになっていることを確認してください。

## スプレッドシート

### 問い合わせシート

問い合わせはスクリプトプロパティ`SHEET_ID`で指定されたスプレッドシートの`inquiries`シートへ保存されます。シートが存在しない場合はGASが作成します。

問い合わせ、注文、商品マスターは同じスプレッドシートを使用します。以前の問い合わせ保存先が別スプレッドシートだった場合、既存データは自動移行されません。

主な列は次のとおりです。

- 受付番号
- 受付日時
- 氏名
- メール
- 件名
- 本文
- 状態
- 対応メモ
- 更新日時
- 添付ファイル名

### 注文シート

注文は`SHEET_NAME`で指定したシートへ保存されます。既定名は`orders`です。

主な列は次のとおりです。

- `order_id`
- `paypal_order_id`
- `status`
- `payment_method`
- `product_id`
- `product_name`
- `amount`
- `currency`
- `customer_name`
- `customer_email`
- `notes`
- `created_at`
- `updated_at`
- `download_sent_at`

`download_sent_at`は銀行振込の商品送付処理で必要に応じて追加されます。

### 商品シート

商品情報は`products`シートから取得します。

必要な列は次のとおりです。

- `product_id`
- `product_name`
- `price`
- `currency`
- `active`
- `coupon_code`
- `discount_type`
- `discount_value`
- `valid_from`
- `valid_to`

`active`は`true`、`1`、`yes`、`active`のいずれかとして評価できる値を使用します。

商品価格やクーポンを変更するときは、フロントエンド表示と商品シートの両方を確認してください。注文時の最終価格は商品シートを基準に再計算されます。

## 外部サービス

### jQuery

各HTMLページはCDNからjQuery 3.6.0を読み込みます。ネットワーク接続がない場合、一部の共通UIが動作しません。

### Google Analytics

`assets/js/tracking.js`がGoogle Analyticsの`gtag.js`を動的に読み込みます。

### Google Tag Manager

`assets/js/tracking.js`と各HTMLの`noscript`要素がGoogle Tag Managerを読み込みます。

計測IDを変更するときは、JavaScriptと各HTMLの`noscript`を両方確認してください。

```bash
rg -n "GTM-|G-" .
```

### PayPal

PayPal Client ID、Client Secret、Webhook IDはGASスクリプトプロパティで管理します。

GASには外部APIアクセス、Webhook受信、注文シート更新、メール送信の権限が必要です。

### Google Drive

商品ファイルIDが設定されている場合、GASは購入者のメールアドレスへ閲覧者権限を付与します。GAS実行ユーザーが対象ファイルの共有権限を変更できる必要があります。

## ブランチと環境

現在のリポジトリでは次の状態を確認しています。

| ブランチ | `gas-env.json` | 想定用途 |
| --- | --- | --- |
| `master` | `prod` | 本番向け |
| `develop` | `test` | 開発・テスト向け |

これは現時点のリポジトリ状態に基づく説明です。GitHub Pagesやその他のホスティング環境がどのブランチを公開するかは、リポジトリまたはホスティング側の設定を別途確認してください。

ブランチをマージするときは、環境設定が意図せず上書きされないように`assets/config/gas-env.json`の差分を必ず確認してください。

## 変更時の注意事項

このプロジェクトの作業ルールは`AGENTS.md`を参照してください。

主要な設計方針は次のとおりです。

- HTMLは構造とマークアップを担当
- CSSは見た目、レイアウト、レスポンシブ対応を担当
- JavaScriptは挙動とロジックを担当
- HTML内へ`style`やインラインJavaScriptを追加しない
- CSSとJavaScriptは外部ファイルとして管理
- JavaScriptにはメンテナンス用の処理概要コメントを記載
- 不要な一括整形を行わない
- 既存仕様を変更するときは関連フローをテストする

### ページ追加時

1. HTMLファイルを適切なディレクトリへ追加する
2. `assets/css/style.css`へ必要なスタイルを追加する
3. 挙動が必要な場合は`assets/js/`へ専用ファイルを追加する
4. `site-header`と`site-footer`を配置する
5. `assets/js/include.js`を読み込む
6. ルート相対パスとGitHub Pagesのベースパスを確認する
7. PCとスマートフォンで表示を確認する

### GASエンドポイント変更時

`assets/config/gas-env.json`の対象環境URLを変更します。HTMLや個別JavaScriptへURLを追加しないでください。

```bash
rg -n "script.google.com/macros" .
```

検索結果が`assets/config/gas-env.json`以外に存在しないことを確認します。

### 商品追加・変更時

次の箇所を横断して確認します。

- 商品詳細HTML
- `assets/js/checkout.js`の商品カタログ
- 購入画面の表示
- GASの商品シート
- GASの商品別ダウンロード設定
- PayPalおよび銀行振込のメール内容

### 共通パーツ変更時

`header.html`と`footer.html`は全ページへ動的に挿入されます。変更後はトップページだけでなく、階層の深い決済ページでもリンクと画像パスを確認してください。

## 動作確認

自動テスト、lint、ビルドコマンドは現在のリポジトリに定義されていません。変更内容に応じて静的確認とブラウザでの手動確認を行います。

### 基本コマンド

```bash
# ローカルサーバー起動
node scripts/serve.mjs

# JSON構文と環境値の確認
node -e "const fs=require('fs'); const v=JSON.parse(fs.readFileSync('assets/config/gas-env.json','utf8')); if(!['test','prod'].includes(v.env)) throw new Error('invalid env'); console.log(v)"

# Git差分の空白エラー確認
git diff --check

# 変更内容の確認
git diff
```

### 基本表示

- トップページが表示される
- CSSと画像が読み込まれる
- ヘッダーとフッターが表示される
- ナビゲーションリンクが正しい
- スマートフォンメニューが開閉できる
- アコーディオンが動作する
- 商品画像モーダルが動作する
- コンソールに予期しないエラーがない

### 環境切り替え

- `env=test`でテスト環境バッジが表示される
- `env=test`でテスト用GASへ送信される
- `env=prod`でバッジが表示されない
- `env=prod`で本番用GASへ送信される
- 不正な環境値やURLでは送信を停止する
- PayPal完了・キャンセル処理も選択中の環境URLを使用する

### 問い合わせ

- 必須入力の検証が動作する
- 問い合わせ内容が確認画面へ引き継がれる
- 戻る操作後も入力内容を確認できる
- 対象件名で添付欄が表示される
- 5MB超過ファイルが拒否される
- 許可形式のファイルを送信できる
- GAS送信後に完了画面へ遷移する
- 問い合わせシートへ保存される
- 自動返信と管理者通知が届く

### 購入

- 通常版の商品情報が正しく表示される
- `?product=demo`でデモ版へ切り替わる
- クーポンなしで注文トークンを発行できる
- 有効なクーポンで注文トークンを発行できる
- 無効なクーポンが拒否される
- 銀行振込確認画面へ入力内容が引き継がれる
- PayPal確認画面へ入力内容が引き継がれる
- ブラウザ更新やセッション欠損時に不正な注文を確定できない

### 銀行振込

- 注文が注文シートへ保存される
- 振込先案内メールが届く
- 管理者通知が届く
- 注文ステータス変更後に商品案内を送信できる
- 同じ注文へ商品案内が重複送信されない

### PayPal Sandbox

- 注文作成後にPayPal承認画面へ遷移する
- 承認後に完了画面へ戻る
- Captureが成功する
- 注文シートが`paid`へ更新される
- キャンセル時に`cancel`へ更新される
- Webhook署名検証が成功する
- 管理者通知が届く
- 購入者へ注文完了案内が届く
- 商品リンクの手動送付運用を確認する

### GitHub Pages

- プロジェクトサイトのベースパス配下でCSSと画像が表示される
- 共通ヘッダーとフッターが読み込まれる
- ルート相対リンクがリポジトリ名を含むURLへ補正される
- 購入、確認、完了、キャンセルの画面遷移が正しい

## デプロイ前チェックリスト

- [ ] 対象ブランチが正しい
- [ ] `assets/config/gas-env.json`の`env`が対象環境と一致している
- [ ] `last_commit_at`が必要に応じて更新されている
- [ ] GASのWeb App URLが対象環境と一致している
- [ ] GASスクリプトプロパティが対象環境向けに設定されている
- [ ] `PAYPAL_ENV`がSandboxまたはLiveの意図した値になっている
- [ ] PayPalのReturn URLとCancel URLが公開URLと一致している
- [ ] PayPal Webhook URLとWebhook IDが正しい
- [ ] 商品マスターの価格、通貨、公開状態、クーポンが正しい
- [ ] 銀行口座情報が正しい
- [ ] 商品ダウンロードURLとファイルIDが正しい
- [ ] GAS実行ユーザーがSheets、Drive、Gmailへアクセスできる
- [ ] 銀行振込の商品送付関数を実行する方法またはトリガーが設定されている
- [ ] 問い合わせ、銀行振込、PayPal Sandboxを確認した
- [ ] PCとスマートフォンで主要画面を確認した
- [ ] `git diff --check`が成功する
- [ ] 機密情報がGit差分へ含まれていない

## セキュリティと運用上の注意

### 機密情報

次の情報はGitへコミットしないでください。

- PayPal Client Secret
- 注文トークン署名鍵
- 個人用アクセストークン
- Googleアカウントの認証情報
- 非公開の商品ファイルURL
- その他の秘密鍵やパスワード

GASスクリプトプロパティまたは適切な秘密情報管理機能を使用してください。

### 公開情報

HTML、JavaScript、JSONへ記載した値は、ブラウザから閲覧できます。GAS Web App URL、計測ID、商品IDなどは秘密情報として扱えません。

### 注文価格

ブラウザ上の価格は利用者が変更できます。GASは必ず商品シートから商品と価格を再取得し、注文トークンと合わせて検証する必要があります。

### CORSとGAS Web App

フロントエンドからGASへ直接アクセスするため、GAS Web Appの公開範囲と実行ユーザー設定が正しくなければ送信に失敗します。公開範囲を変更するときは、個人情報と注文情報を扱うことを踏まえて権限を確認してください。

### 個人情報

問い合わせ、購入者氏名、メールアドレス、備考、添付ファイルを扱います。

- スプレッドシートとGASプロジェクトの共有範囲を最小限にする
- ログへ氏名やメールアドレスをそのまま出力しない
- 不要になった個人情報の保管期間を定める
- 添付ファイルの内容を信用しない
- 管理者アカウントで多要素認証を使用する

### ログ

GASはメールアドレスや氏名をマスクしてログへ出力する補助処理を持ちます。新しいログを追加するときも、注文情報や個人情報をそのまま出力しないでください。

## 既知の制約

- フロントエンドの自動テスト、lint、ビルド設定はありません。
- GASの自動デプロイ設定はこのリポジトリに含まれていません。
- GASのインストール型・時間主導型トリガー設定はこのリポジトリに含まれていません。
- GAS環境設定ファイルを取得できない場合、問い合わせ・注文・決済処理は実行できません。
- 商品の表示情報とGASの商品マスターは別管理です。
- 入力内容の画面間引き継ぎは`sessionStorage`に依存します。
- 添付ファイルはBase64化して`sessionStorage`とPOST本文を経由します。
- jQueryと計測タグは外部CDNへの接続に依存します。
- ローカルサーバーのホストとポートは固定です。
- PayPalの実動作確認にはGAS、PayPal Sandbox、Webhookの設定が必要です。
- 公開ブランチやデプロイ方法はホスティング側の設定に依存します。

## 関連ドキュメント

- 作業ルール: `AGENTS.md`
- GASバックエンド: `scripts/app-gas.js`
- GAS環境設定: `assets/config/gas-env.json`
- ローカルサーバー: `scripts/serve.mjs`
