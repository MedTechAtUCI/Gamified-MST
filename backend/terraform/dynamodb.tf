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

# Lambda reference
output "metrics_table_name" {
  value = aws_dynamodb_table.metrics_table.name
}