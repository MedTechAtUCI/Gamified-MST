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
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "metrics-reader"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "metrics_reader.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      DYNAMO_TABLE = aws_dynamodb_table.metrics_table.name
    }
  }
}