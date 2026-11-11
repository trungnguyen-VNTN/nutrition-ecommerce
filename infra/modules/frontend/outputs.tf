output "bucket_name" {
  description = "Bucket for the React build."
  value       = aws_s3_bucket.frontend.bucket
}

output "bucket_arn" {
  description = "Frontend bucket ARN."
  value       = aws_s3_bucket.frontend.arn
}

output "distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)."
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "CloudFront distribution ARN."
  value       = aws_cloudfront_distribution.main.arn
}

output "domain_name" {
  description = "Public *.cloudfront.net host name of the app."
  value       = aws_cloudfront_distribution.main.domain_name
}
