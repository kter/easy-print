variable "environment" {
  type = string
}

variable "lambda_invoke_arn" {
  type = string
}

variable "api_domain_name" {
  type = string
}

variable "acm_certificate_arn" {
  type = string
}

variable "hosted_zone_domain" {
  type = string
}

variable "allow_origins" {
  type    = list(string)
  default = []
}
