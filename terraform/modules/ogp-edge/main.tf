data "aws_iam_policy_document" "edge_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com",
      ]
    }
  }
}

resource "aws_iam_role" "edge" {
  provider           = aws.us_east_1
  name               = "easy-print-ogp-edge-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.edge_assume_role.json

  tags = {
    Environment = var.environment
    Project     = "easy-print"
  }
}

resource "aws_iam_role_policy_attachment" "edge_basic" {
  provider   = aws.us_east_1
  role       = aws_iam_role.edge.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "ogp_edge" {
  provider      = aws.us_east_1
  function_name = "easy-print-ogp-edge-${var.environment}"
  role          = aws_iam_role.edge.arn
  handler       = "ogp-edge.handler"
  runtime       = "nodejs22.x"
  filename      = var.ogp_edge_zip_path
  publish       = true
  timeout       = 5
  memory_size   = 128

  depends_on = [aws_iam_role_policy_attachment.edge_basic]

  tags = {
    Environment = var.environment
    Project     = "easy-print"
  }
}
