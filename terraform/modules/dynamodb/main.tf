resource "aws_dynamodb_table" "cache" {
  name         = "easy-print-cache-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "urlHash"

  attribute {
    name = "urlHash"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Environment = var.environment
    Project     = "easy-print"
  }
}
