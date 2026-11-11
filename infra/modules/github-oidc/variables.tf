variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "github_repository" {
  description = "owner/name of the GitHub repository allowed to deploy."
  type        = string
}

variable "deploy_branch" {
  description = "Only workflows running on this branch can assume the role."
  type        = string
  default     = "master"
}

variable "permissions_boundary_name" {
  description = "Name of the IAM permissions boundary (D16)."
  type        = string
  default     = "nutrition-boundary"
}

variable "ecr_repository_arn" {
  description = "Backend ECR repository ARN."
  type        = string
}

variable "ecs_service_arn" {
  description = "ECS service the workflow may restart with a new deployment."
  type        = string
}

variable "frontend_bucket_arn" {
  description = "Frontend bucket ARN."
  type        = string
}

variable "distribution_arn" {
  description = "CloudFront distribution ARN."
  type        = string
}
