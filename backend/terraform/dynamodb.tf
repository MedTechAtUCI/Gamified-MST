resource "aws_dynamodb_table" "metrics_table" {
  name         = "metrics-table"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"       # partition key
  range_key = "sessionTrial" # sort key

  # Attribute definitions
  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sessionTrial"
    type = "S"
  }
}

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

# Lambda references
output "metrics_table_name" {
  value = aws_dynamodb_table.metrics_table.name
}

output "user_state_table_name" {
  value = aws_dynamodb_table.user_state_table.name
}