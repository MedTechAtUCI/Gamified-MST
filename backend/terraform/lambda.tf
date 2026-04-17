data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/functions/metrics_writer.py"
  output_path = "${path.module}/functions/metrics_writer.zip"
}

resource "aws_lambda_function" "metrics_writer" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "metrics-writer"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "metrics_writer.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      DYNAMO_TABLE = aws_dynamodb_table.metrics_table.name
    }
  }
}

data "archive_file" "metrics_reader_zip" {
  type        = "zip"
  source_file = "${path.module}/functions/metrics_reader.py"
  output_path = "${path.module}/functions/metrics_reader.zip"
}

resource "aws_lambda_function" "metrics_reader" {
  filename         = data.archive_file.metrics_reader_zip.output_path
  function_name    = "metrics-reader"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "metrics_reader.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = data.archive_file.metrics_reader_zip.output_base64sha256

  environment {
    variables = {
      DYNAMO_TABLE = aws_dynamodb_table.metrics_table.name
    }
  }
}

data "archive_file" "user_state_zip" {
  type        = "zip"
  source_file = "${path.module}/functions/user_state_handler.py"
  output_path = "${path.module}/functions/user_state_handler.zip"
}

resource "aws_lambda_function" "user_state_handler" {
  filename         = data.archive_file.user_state_zip.output_path
  function_name    = "user-state-handler"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "user_state_handler.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = data.archive_file.user_state_zip.output_base64sha256

  environment {
    variables = {
      USER_STATE_TABLE = aws_dynamodb_table.user_state_table.name
    }
  }
}

output "user_state_lambda_name" {
  value = aws_lambda_function.user_state_handler.function_name
}