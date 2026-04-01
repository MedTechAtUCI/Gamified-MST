
resource "aws_dynamodb_table" "user_state_table" {
  name         = "user-state-table"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"
  range_key = "gameType"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "gameType"
    type = "S"
  }
}



resource "aws_lambda_function" "user_state_handler" {
  function_name = "user-state-handler"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "user_state_handler.lambda_handler"
  runtime       = "python3.13"

  # upload the code manually in AWS Console
  filename = null

  environment {
    variables = {
      USER_STATE_TABLE = aws_dynamodb_table.user_state_table.name
    }
  }

  # Required when no zip file is provided
  source_code_hash = filebase64sha256("${path.module}/empty.zip")
}



resource "aws_iam_role_policy" "lambda_permissions" {
  name = "mst_lambda_permissions"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:UpdateItem"
        ]
        Resource = [
          aws_dynamodb_table.metrics_table.arn,
          aws_dynamodb_table.user_state_table.arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}



output "user_state_table_name" {
  value = aws_dynamodb_table.user_state_table.name
}

output "user_state_lambda_name" {
  value = aws_lambda_function.user_state_handler.function_name
}
