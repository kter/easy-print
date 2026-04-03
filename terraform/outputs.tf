output "frontend_url" {
  value = "https://${var.domain_name}"
}

output "api_url" {
  value = "https://${var.api_domain_name}"
}

output "frontend_bucket_name" {
  value = module.s3.bucket_name
}

output "cloudfront_distribution_id" {
  value = module.cloudfront.distribution_id
}

output "api_gateway_endpoint" {
  value = module.api_gateway.api_endpoint
}
