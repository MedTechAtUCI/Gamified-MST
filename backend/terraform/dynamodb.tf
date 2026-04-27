resource "aws_dynamodb_table" "metrics_table" {
  name         = "metrics-table"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"        # partition key
  range_key = "session_trial" # sort key (session_id#trial_id)

  # Attribute definitions
  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "session_trial"
    type = "S"
  }
}

resource "aws_dynamodb_table" "user_state_table" {
  name         = "user-state-table"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "userId"
  range_key = "sessionId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sessionId"
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