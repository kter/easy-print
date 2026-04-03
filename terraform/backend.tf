terraform {
  backend "s3" {
    # bucket and key are set via -backend-config or init
    # Use: terraform init -backend-config=environments/<env>-backend.conf
    region = "ap-northeast-1"
    key    = "easy-print/terraform.tfstate"
  }
}
