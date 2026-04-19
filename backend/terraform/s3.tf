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

# CloudFront Origin Access Control
resource "aws_cloudfront_origin_access_control" "mst_oac" {
  name                              = "mst-oac"
  description                       = "OAC for gamified-mst-prod"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# S3 bucket policy - only allow CloudFront via OAC
resource "aws_s3_bucket_policy" "gamified_mst_policy" {
  bucket = aws_s3_bucket.gamified_mst.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.gamified_mst.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.mst_distribution.id}"
          }
        }
      }
    ]
  })
}

# CloudFront distribution
resource "aws_cloudfront_distribution" "mst_distribution" {
  origin {
    domain_name              = aws_s3_bucket.gamified_mst.bucket_regional_domain_name
    origin_id                = "s3-gamified-mst"
    origin_access_control_id = aws_cloudfront_origin_access_control.mst_oac.id
  }

  enabled = true
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-gamified-mst"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]
      
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "https-only"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  custom_error_response {
    error_code             = 404
    response_code          = 404
    response_page_path     = "/index.html"
  }
}

# Output CloudFront domain
output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.mst_distribution.domain_name
  description = "CloudFront domain for serving S3 content"
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
