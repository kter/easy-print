variable "environment" {
  description = "Deployment environment (dev or prd)"
  type        = string
  validation {
    condition     = contains(["dev", "prd"], var.environment)
    error_message = "environment must be 'dev' or 'prd'"
  }
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
}

variable "domain_name" {
  description = "Frontend domain name"
  type        = string
}

variable "api_domain_name" {
  description = "API domain name"
  type        = string
}

variable "hosted_zone_domain" {
  description = "Root hosted zone domain (e.g. devtools.site or dev.devtools.site)"
  type        = string
}

variable "bedrock_model_id" {
  description = "Bedrock model ID for content extraction fallback"
  type        = string
  default     = "anthropic.claude-3-haiku-20240307-v1:0"
}

variable "cache_ttl_days" {
  description = "Number of days to cache rendered articles in DynamoDB"
  type        = number
  default     = 30
}
