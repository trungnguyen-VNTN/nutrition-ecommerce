output "bucket_name" {
  description = "Images bucket name (IMAGES_BUCKET for the API)."
  value       = aws_s3_bucket.images.bucket
}

output "bucket_arn" {
  description = "Images bucket ARN."
  value       = aws_s3_bucket.images.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name used as CloudFront origin."
  value       = aws_s3_bucket.images.bucket_regional_domain_name
}
