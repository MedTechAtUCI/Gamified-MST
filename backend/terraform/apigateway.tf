resource "aws_apigatewayv2_api" "metrics_api" {
  name          = "metrics-api"
  protocol_type = "HTTP"

  body = templatefile("${path.module}/openapi.yaml", {
    lambda_arn              = aws_lambda_function.metrics_writer.invoke_arn
    user_state_lambda_arn   = aws_lambda_function.user_state_handler.invoke_arn
  })
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.metrics_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.metrics_writer.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.metrics_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_user_state_lambda" {
  statement_id  = "AllowExecutionFromAPIGatewayUserState"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_state_handler.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.metrics_api.execution_arn}/*/*"
}

output "api_base_url" {
  value = aws_apigatewayv2_api.metrics_api.api_endpoint
}