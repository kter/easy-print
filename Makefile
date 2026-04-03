.DEFAULT_GOAL := help

ENV ?= dev
AWS_PROFILE := $(ENV)
FRONTEND_DIR := frontend
BACKEND_DIR := backend
TERRAFORM_DIR := terraform

# Colors
CYAN := \033[36m
RESET := \033[0m

.PHONY: help
help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "$(CYAN)%-30s$(RESET) %s\n", $$1, $$2}'

# ============================================================
# Install
# ============================================================
.PHONY: install
install: install-frontend install-backend install-hooks ## Install all dependencies

.PHONY: install-frontend
install-frontend: ## Install frontend dependencies
	cd $(FRONTEND_DIR) && npm install

.PHONY: install-backend
install-backend: ## Install backend dependencies
	cd $(BACKEND_DIR) && npm install

.PHONY: install-hooks
install-hooks: ## Install git hooks via lefthook
	@which lefthook >/dev/null 2>&1 || npm install -g lefthook
	lefthook install

# ============================================================
# Development
# ============================================================
.PHONY: dev
dev: dev-frontend ## Start development server

.PHONY: dev-frontend
dev-frontend: ## Start frontend dev server
	cd $(FRONTEND_DIR) && npm run dev

# ============================================================
# Build
# ============================================================
.PHONY: build
build: build-frontend build-backend ## Build all

VITE_MODE_dev := development
VITE_MODE_prd := production

.PHONY: build-frontend
build-frontend: ## Build frontend (ENV=dev uses .env.development, ENV=prd uses .env.production)
	cd $(FRONTEND_DIR) && npm run build -- --mode $(VITE_MODE_$(ENV))

.PHONY: build-backend
build-backend: ## Bundle backend Lambda
	cd $(BACKEND_DIR) && npm run build
	rm -f backend.zip
	cd $(BACKEND_DIR)/dist && zip -r ../../backend.zip .
	@echo "Built backend.zip"

API_BASE_URL_dev := https://api.print.dev.devtools.site
API_BASE_URL_prd := https://api.print.devtools.site

.PHONY: build-ogp-edge
build-ogp-edge: ## Bundle OGP Lambda@Edge (ENV=dev|prd)
	cd $(BACKEND_DIR) && node esbuild.config.mjs --edge --api-base-url=$(API_BASE_URL_$(ENV))
	echo '{"type":"module"}' > $(BACKEND_DIR)/dist-edge/package.json
	rm -f ogp-edge.zip
	cd $(BACKEND_DIR)/dist-edge && zip -r ../../ogp-edge.zip .
	@echo "Built ogp-edge.zip"

# ============================================================
# Test
# ============================================================
.PHONY: test
test: test-unit ## Run all tests

.PHONY: test-unit
test-unit: test-unit-frontend test-unit-backend ## Run all unit tests

.PHONY: test-unit-frontend
test-unit-frontend: ## Frontend unit tests (Vitest)
	cd $(FRONTEND_DIR) && npm run test:unit

.PHONY: test-unit-backend
test-unit-backend: ## Backend unit tests (Vitest)
	cd $(BACKEND_DIR) && npm run test:unit

.PHONY: test-integration
test-integration: ## Run integration tests
	cd $(BACKEND_DIR) && npm run test:integration

# ============================================================
# Lint & Format
# ============================================================
.PHONY: lint
lint: lint-frontend lint-backend lint-terraform ## Lint all

.PHONY: lint-frontend
lint-frontend: ## ESLint frontend
	cd $(FRONTEND_DIR) && npm run lint

.PHONY: lint-backend
lint-backend: ## ESLint backend
	cd $(BACKEND_DIR) && npm run lint

.PHONY: lint-terraform
lint-terraform: ## tflint
	cd $(TERRAFORM_DIR) && tflint --recursive 2>/dev/null || true

.PHONY: format
format: format-frontend format-backend format-terraform ## Format all

.PHONY: format-frontend
format-frontend: ## Prettier frontend
	cd $(FRONTEND_DIR) && npm run format

.PHONY: format-backend
format-backend: ## Prettier backend
	cd $(BACKEND_DIR) && npm run format

.PHONY: format-terraform
format-terraform: ## terraform fmt
	cd $(TERRAFORM_DIR) && terraform fmt -recursive

.PHONY: format-check
format-check: format-check-frontend format-check-backend ## Check formatting (no writes)

.PHONY: format-check-frontend
format-check-frontend: ## Check frontend formatting
	cd $(FRONTEND_DIR) && npm run format:check

.PHONY: format-check-backend
format-check-backend: ## Check backend formatting
	cd $(BACKEND_DIR) && npm run format:check

# ============================================================
# Claude hooks
# ============================================================
.PHONY: claude-pre-tool-use
claude-pre-tool-use: ## Pre-tool-use safety check
	@python3 scripts/claude_pre_tool_use_guard.py "$(CMD)"

.PHONY: claude-post-tool-use
claude-post-tool-use: ## Post-tool-use format and lint
	@if [ -z "$(FILE_PATH)" ]; then exit 0; fi; \
	EXT=$$(echo "$(FILE_PATH)" | sed 's/.*\.//'); \
	case "$$EXT" in \
		ts|tsx) \
			if echo "$(FILE_PATH)" | grep -q "^frontend/"; then \
				cd $(FRONTEND_DIR) && npx prettier --write "$$(echo '$(FILE_PATH)' | sed 's|^frontend/||')" 2>/dev/null || true; \
			elif echo "$(FILE_PATH)" | grep -q "^backend/"; then \
				cd $(BACKEND_DIR) && npx prettier --write "$$(echo '$(FILE_PATH)' | sed 's|^backend/||')" 2>/dev/null || true; \
			fi ;; \
		css|json) \
			if echo "$(FILE_PATH)" | grep -q "^frontend/"; then \
				cd $(FRONTEND_DIR) && npx prettier --write "$$(echo '$(FILE_PATH)' | sed 's|^frontend/||')" 2>/dev/null || true; \
			fi ;; \
		tf) \
			cd $(TERRAFORM_DIR) && terraform fmt "$$(echo '$(FILE_PATH)' | sed 's|^terraform/||')" 2>/dev/null || true ;; \
	esac

# ============================================================
# Terraform
# ============================================================
.PHONY: tf-init
tf-init: ## terraform init (ENV=dev|prd)
	cd $(TERRAFORM_DIR) && \
		terraform init -backend-config=environments/$(ENV)-backend.conf && \
		(terraform workspace select $(ENV) 2>/dev/null || terraform workspace new $(ENV))

.PHONY: tf-init-backend
tf-init-backend: ## Create S3 backend bucket for terraform state
	@./scripts/init-terraform-backend.sh $(ENV)

.PHONY: tf-plan
tf-plan: ## terraform plan (ENV=dev|prd)
	cd $(TERRAFORM_DIR) && \
		terraform workspace select $(ENV) && \
		terraform plan -var-file=environments/$(ENV).tfvars

.PHONY: tf-apply
tf-apply: ## terraform apply (ENV=dev|prd)
	cd $(TERRAFORM_DIR) && \
		terraform workspace select $(ENV) && \
		terraform apply -var-file=environments/$(ENV).tfvars

.PHONY: tf-fmt
tf-fmt: ## terraform fmt
	cd $(TERRAFORM_DIR) && terraform fmt -recursive

.PHONY: tf-output
tf-output: ## Show terraform outputs (ENV=dev|prd)
	cd $(TERRAFORM_DIR) && \
		terraform workspace select $(ENV) && \
		terraform output -json

# ============================================================
# Deploy
# ============================================================
.PHONY: deploy
deploy: deploy-backend deploy-frontend ## Full deploy (ENV=dev|prd)

.PHONY: deploy-frontend
deploy-frontend: build-frontend ## Deploy frontend to S3 + invalidate CloudFront (ENV=dev|prd)
	$(eval BUCKET_NAME := $(shell cd $(TERRAFORM_DIR) && terraform workspace select $(ENV) >/dev/null 2>&1 && terraform output -raw frontend_bucket_name 2>/dev/null))
	$(eval CF_DIST_ID := $(shell cd $(TERRAFORM_DIR) && terraform workspace select $(ENV) >/dev/null 2>&1 && terraform output -raw cloudfront_distribution_id 2>/dev/null))
	aws s3 sync $(FRONTEND_DIR)/dist/ s3://$(BUCKET_NAME) --delete --profile $(AWS_PROFILE)
	aws cloudfront create-invalidation --distribution-id $(CF_DIST_ID) --paths "/*" --profile $(AWS_PROFILE)
	@echo "Frontend deployed to $(ENV)"

.PHONY: deploy-backend
deploy-backend: build-backend ## Deploy backend Lambda (ENV=dev|prd)
	$(eval FUNCTION_NAME := easy-print-$(ENV))
	aws lambda update-function-code \
		--function-name $(FUNCTION_NAME) \
		--zip-file fileb://backend.zip \
		--profile $(AWS_PROFILE)
	@echo "Backend deployed to $(ENV)"

.PHONY: deploy-ogp-edge
deploy-ogp-edge: build-ogp-edge ## Deploy OGP Lambda@Edge (ENV=dev|prd)
	$(eval FUNCTION_NAME := easy-print-ogp-edge-$(ENV))
	aws lambda update-function-code \
		--function-name $(FUNCTION_NAME) \
		--zip-file fileb://ogp-edge.zip \
		--profile $(AWS_PROFILE) \
		--region us-east-1
	@echo "OGP Edge deployed to $(ENV)"

# ============================================================
# Clean
# ============================================================
.PHONY: clean
clean: ## Remove build artifacts
	rm -rf $(FRONTEND_DIR)/dist $(BACKEND_DIR)/dist $(BACKEND_DIR)/dist-edge
	rm -f backend.zip ogp-edge.zip
