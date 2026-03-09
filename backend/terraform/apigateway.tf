resource "aws_apigatewayv2_api" "metrics_api" {
  name          = "metrics-api"
  protocol_type = "HTTP"

  body = templatefile("${path.module}/openapi.yaml", {
    lambda_arn = aws_lambda_function.metrics_writer.invoke_arn
  })
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics_writer.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.metrics_api.execution_arn}/*/*"
}