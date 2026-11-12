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

output "app_url" {
  description = "Public URL of the app."
  value       = "https://${module.frontend.domain_name}"
}

output "app_running" {
  description = "Whether the API and database are on (D20)."
  value       = var.app_running
}

output "frontend_bucket" {
  description = "Upload the React build here."
  value       = module.frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "Distribution to invalidate after a frontend deploy."
  value       = module.frontend.distribution_id
}

output "ecs_cluster" {
  description = "ECS cluster name."
  value       = module.service.cluster_name
}

output "ecs_service" {
  description = "ECS service name."
  value       = module.service.service_name
}

output "ecs_task_family" {
  description = "Task definition family used by the deploy workflow."
  value       = module.service.task_family
}

output "github_deploy_role_arn" {
  description = "GitHub repository variable AWS_DEPLOY_ROLE_ARN."
  value       = module.github_oidc.deploy_role_arn
}

output "images_bucket" {
  description = "Product images bucket (D21)."
  value       = module.images.bucket_name
}

output "bedrock_guardrail_id" {
  description = "Chat guardrail ID (phase 6)."
  value       = module.guardrail.guardrail_id
}
