resource "aws_iam_role" "lambda_exec" {
  name = "mst_lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_permissions" {
  name = "mst_lambda_permissions"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Manage DynamoDB for both tables
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
        # Debug logs
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_group" "mst_developers" {
  name = "MST_Developers"
}

resource "aws_iam_group_membership" "mst_group_members" {
  name  = "mst_group_members"
  users = var.dev_users
  group = aws_iam_group.mst_developers.name
}

resource "aws_iam_policy" "mst_developer_policy" {
  name        = "mst_developer_policy"
  description = "LPP for MST devs"

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Sid    = "LambdaAccess"
        Effect = "Allow",
        Action = [
          "lambda:InvokeFunction",
          "lambda:GetFunction",
          "lambda:UpdateFunctionCode"
        ],
        Resource = "arn:aws:lambda:*:*:function:metrics-*"
      },
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow",
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:Scan",
          "dynamodb:Query"
        ],
        Resource = [
          "arn:aws:dynamodb:*:*:table/metrics-table",
          "arn:aws:dynamodb:*:*:table/user-state-table"
        ]
      },
      {
        Sid    = "S3Access"
        Effect = "Allow",
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ],
        Resource = [
          aws_s3_bucket.gamified_mst.arn,
          "${aws_s3_bucket.gamified_mst.arn}/*"
        ]
      },
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow",
        Action = [
          "logs:DescribeLogGroups",
          "logs:GetLogEvents"
        ],
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "mst_group_policy_attach" {
  group      = aws_iam_group.mst_developers.name
  policy_arn = aws_iam_policy.mst_developer_policy.arn
}

