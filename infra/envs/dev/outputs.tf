output "vpc_id" {
  description = "VPC ID."
  value       = module.network.vpc_id
}

output "ecr_repository_url" {
  description = "Push the backend image here."
  value       = module.ecr.repository_url
}

output "db_endpoint" {
  description = "PostgreSQL host (private)."
  value       = module.rds.endpoint
}

output "db_master_secret_arn" {
  description = "Secrets Manager ARN of the RDS-managed master password."
  value       = module.rds.master_user_secret_arn
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID (public config for the frontend)."
  value       = module.cognito.user_pool_id
}

output "cognito_app_client_id" {
  description = "Cognito SPA client ID (public config for the frontend)."
  value       = module.cognito.app_client_id
}

output "cognito_issuer_uri" {
  description = "JWT issuer for the backend."
  value       = module.cognito.issuer_uri
}
