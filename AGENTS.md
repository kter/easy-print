# AGENTS.md

## Project Overview

Easy Print は URL を入力すると印刷に適したフォーマットでページを表示する Web サービスです。
サイドバーや広告などを除去し、記事本文を用紙全幅で印刷できるよう整形します。

### スタック

- **Frontend**: React + TypeScript + Vite (SPA, S3+CloudFront配信)
- **Backend**: Node.js + TypeScript (Lambda + API Gateway)
- **Cache**: DynamoDB (TTL付き)
- **Content Extraction**: Readability.js + JSDOM, Bedrock (fallback)
- **IaC**: Terraform (workspace: dev/prd)

### ディレクトリ構成

```
easy-print/
├── frontend/       # React SPA
├── backend/        # Lambda関数
├── terraform/      # インフラ定義
├── scripts/        # ユーティリティスクリプト
└── Makefile        # 全コマンドのエントリーポイント
```

## 共通ルール

1. **Makefileが唯一のエントリーポイント** — AWS CLI, Terraform, npm を直接実行せず、必ず `make <target>` を使用すること
2. **ツールバージョンは mise.toml で管理** — `mise install` で揃える
3. **テストは必須** — 新機能・バグ修正には必ずテストを追加すること
4. **環境は ENV 変数で切替** — `make <target> ENV=dev` または `make <target> ENV=prd`
5. **AWSアカウントは環境ごとに分離** — dev プロファイル → dev アカウント、prd プロファイル → prd アカウント

## よく使うコマンド

```bash
make install            # 全依存インストール
make dev                # フロントエンド開発サーバ起動
make test-unit          # ユニットテスト実行
make test-integration   # インテグレーションテスト実行
make lint               # Lint実行
make format             # フォーマット実行
make build              # 全ビルド

# 環境指定デプロイ (ENV=dev or prd)
make tf-plan ENV=dev    # Terraformプラン確認
make tf-apply ENV=dev   # Terraformデプロイ
make deploy ENV=dev     # フロント+バックエンドデプロイ
make deploy-frontend ENV=dev
make deploy-backend ENV=dev
```

## ドメイン

| 環境 | Frontend | API |
|------|----------|-----|
| dev  | print.dev.devtools.site | api.print.dev.devtools.site |
| prd  | print.devtools.site | api.print.devtools.site |

## 注意事項

- Terraform の直接実行は禁止。必ず `make tf-*` ターゲット経由で実行すること
- AWS CLI の直接実行は禁止。必ず `make deploy-*` ターゲット経由で実行すること
- `terraform destroy` は絶対に実行しないこと
- 本番環境 (prd) への変更は必ず dev で検証してから行うこと
- サブディレクトリに詳細な AGENTS.md がある場合、近い方が優先される

## 関連ドキュメント

- 各ディレクトリの AGENTS.md に詳細な指示があります
