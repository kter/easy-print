# ---- DynamoDB ----
module "dynamodb" {
  source      = "./modules/dynamodb"
  environment = var.environment
}

# ---- ACM (us-east-1) for CloudFront ----
module "acm_cloudfront" {
  source = "./modules/acm"

  environment               = var.environment
  domain_name               = var.domain_name
  subject_alternative_names = []
  hosted_zone_domain        = var.hosted_zone_domain

  providers = {
    aws = aws.us_east_1
  }
}

# ---- ACM (ap-northeast-1) for API Gateway regional ----
module "acm_api" {
  source = "./modules/acm"

  environment               = var.environment
  domain_name               = var.api_domain_name
  subject_alternative_names = []
  hosted_zone_domain        = var.hosted_zone_domain
}

# ---- S3 (frontend) ----
# Created first so CloudFront can reference the bucket domain
module "s3" {
  source      = "./modules/s3"
  environment = var.environment
}

# ---- OGP Lambda@Edge ----
module "ogp_edge" {
  source = "./modules/ogp-edge"

  environment  = var.environment
  api_base_url = "https://${var.api_domain_name}"

  providers = {
    aws.us_east_1 = aws.us_east_1
  }
}

# ---- CloudFront ----
module "cloudfront" {
  source = "./modules/cloudfront"

  environment               = var.environment
  domain_name               = var.domain_name
  s3_bucket_regional_domain = module.s3.bucket_regional_domain_name
  acm_certificate_arn       = module.acm_cloudfront.certificate_arn
  hosted_zone_domain        = var.hosted_zone_domain
  ogp_lambda_arn            = module.ogp_edge.lambda_qualified_arn

  depends_on = [module.acm_cloudfront, module.s3, module.ogp_edge]
}

# ---- S3 bucket policy (references CloudFront ARN) ----
data "aws_iam_policy_document" "s3_frontend_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${module.s3.bucket_arn}/*"]
    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [module.cloudfront.distribution_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = module.s3.bucket_name
  policy = data.aws_iam_policy_document.s3_frontend_policy.json

  depends_on = [module.cloudfront]
}

# ---- Lambda (main API) ----
module "lambda" {
  source = "./modules/lambda"

  environment         = var.environment
  dynamodb_table_arn  = module.dynamodb.table_arn
  dynamodb_table_name = module.dynamodb.table_name
  bedrock_model_id    = var.bedrock_model_id

  depends_on = [module.dynamodb]
}

# ---- API Gateway ----
module "api_gateway" {
  source = "./modules/api-gateway"

  environment         = var.environment
  lambda_invoke_arn   = module.lambda.invoke_arn
  api_domain_name     = var.api_domain_name
  acm_certificate_arn = module.acm_api.certificate_arn
  hosted_zone_domain  = var.hosted_zone_domain

  allow_origins = [
    "https://${var.domain_name}",
    "http://localhost:5173",
    "http://localhost:4173",
  ]

  depends_on = [module.lambda, module.acm_api]
}

# ---- Lambda permission for API Gateway ----
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.api_gateway.execution_arn}/*/*"

  depends_on = [module.api_gateway, module.lambda]
}
