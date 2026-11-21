output "logs_bucket_name" {
  description = "Bucket for CloudTrail and ALB access logs. Exposed after its policy exists, so the ALB can validate it."
  value       = aws_s3_bucket.logs.id
  depends_on  = [aws_s3_bucket_policy.logs]
}

output "trail_name" {
  description = "CloudTrail trail name."
  value       = aws_cloudtrail.main.name
}
