output "api_endpoint" {
  value = aws_apigatewayv2_api.api.api_endpoint
}

output "custom_domain_url" {
  value = "https://${var.api_domain_name}"
}

output "execution_arn" {
  value = aws_apigatewayv2_api.api.execution_arn
}
