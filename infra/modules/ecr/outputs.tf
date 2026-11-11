output "repository_url" {
  description = "ECR repository URL for the backend image."
  value       = aws_ecr_repository.backend.repository_url
}

output "repository_arn" {
  description = "ECR repository ARN."
  value       = aws_ecr_repository.backend.arn
}
