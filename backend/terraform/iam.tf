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
        Effect = "Allow",
        Action = [
          "lambda:InvokeFunction",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "s3:GetObject",
          "s3:PutObject",
          "logs:PutLogEvents"
        ],
        # Change for least privilege ARNs
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "mst_group_policy_attach" {
  group      = aws_iam_group.mst_developers.name
  policy_arn = aws_iam_policy.mst_developer_policy.arn
}

