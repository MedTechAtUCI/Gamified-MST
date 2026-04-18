resource "aws_s3_bucket" "gamified_mst" {
  bucket = "gamified-mst-prod"
}

# Enable versioning for safety
resource "aws_s3_bucket_versioning" "gamified_mst_versioning" {
  bucket = aws_s3_bucket.gamified_mst.id

  versioning_configuration {
    status = "Enabled"
  }
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "gamified_mst_cors" {
  bucket = aws_s3_bucket.gamified_mst.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["http://localhost:3000", "https://mst.medtech-uci.com/"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

resource "aws_s3_bucket_policy" "gamified_mst_policy" {
  bucket = aws_s3_bucket.gamified_mst.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontRead"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.gamified_mst.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"
          }
        }
      }
    ]
  })
}

# Output bucket details
output "s3_bucket_name" {
  value       = aws_s3_bucket.gamified_mst.id
  description = "Name of the S3 bucket"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.gamified_mst.arn
  description = "ARN of the S3 bucket"
}

output "s3_bucket_region" {
  value       = aws_s3_bucket.gamified_mst.region
  description = "Region of the S3 bucket"
}

# Data source to get AWS account ID
data "aws_caller_identity" "current" {}
