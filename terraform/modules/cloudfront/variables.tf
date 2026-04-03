variable "environment" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "s3_bucket_regional_domain" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}

variable "hosted_zone_domain" {
  type = string
}

variable "ogp_lambda_arn" {
  type    = string
  default = ""
}
